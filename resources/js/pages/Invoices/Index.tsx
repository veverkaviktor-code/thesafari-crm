import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Download, MailCheck, Pencil, Plus, RefreshCw, RotateCcw, Trash2 } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import GlassModal from '@/components/ui/GlassModal';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import InvoiceStatusBadge, {
    type InvoiceStatus,
} from '@/components/invoices/InvoiceStatusBadge';

interface Invoice {
    id: number;
    invoice_number: string;
    customer: { id: number; name: string };
    issue_date: string;
    due_date: string;
    sent_at: string | null;
    paid_at: string | null;
    total: number;
    status: InvoiceStatus;
    payment_method: string;
    deleted_at?: string | null;
}

interface PaginatedInvoices {
    data: Invoice[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Props {
    invoices: PaginatedInvoices;
    filters: {
        search?: string;
        status?: string;
        sort?: string;
        direction?: 'asc' | 'desc';
        trashed?: string;
    };
    trashedCount: number;
    paidCount: number;
    lastBankSync: string | null;
}

function dueDateClass(dueDate: string, status: string): string {
    if (status === 'zaplacena') return 'text-muted-foreground';
    const diff = new Date(dueDate).getTime() - Date.now();
    if (diff < 0) return 'text-red-400';
    if (diff < 7 * 24 * 60 * 60 * 1000) return 'text-amber-400';
    return 'text-muted-foreground';
}

export default function Index({ invoices, filters, trashedCount, paidCount, lastBankSync }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [restoring, setRestoring] = useState<number | null>(null);
    const [syncing, setSyncing] = useState(false);

    const isTrashed = filters.trashed === '1';
    const isPaid = filters.status === 'zaplacena' && !isTrashed;
    const isActive = !isTrashed && !isPaid;

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        if (isTrashed) {
            router.delete(`/faktury/${deleteTarget.id}/force-delete`, {
                onSuccess: () => { setDeleteTarget(null); setDeleting(false); },
                onError: () => setDeleting(false),
            });
        } else {
            router.delete(`/faktury/${deleteTarget.id}`, {
                onSuccess: () => { setDeleteTarget(null); setDeleting(false); },
                onError: () => setDeleting(false),
            });
        }
    };

    const handleRestore = (id: number) => {
        setRestoring(id);
        router.post(`/faktury/${id}/restore`, {}, {
            onSuccess: () => setRestoring(null),
            onError: () => setRestoring(null),
        });
    };

    const handleSyncBank = () => {
        setSyncing(true);
        router.post(
            '/faktury/sync-bank',
            {},
            {
                onSuccess: () => setSyncing(false),
                onError: () => setSyncing(false),
            },
        );
    };

    const activeColumns = useMemo<Column<Invoice>[]>(() => [
        {
            key: 'invoice_number',
            label: 'Číslo',
            sortable: true,
            render: (i) => (
                <span className="font-medium text-foreground flex items-center gap-1.5">
                    {i.invoice_number}
                    {i.sent_at && (
                        <MailCheck className="h-3 w-3 text-emerald-400" title="Odesláno e-mailem" />
                    )}
                </span>
            ),
        },
        {
            key: 'customer',
            label: 'Zákazník',
            render: (i) => (
                <span className="text-muted-foreground">{i.customer.name}</span>
            ),
        },
        {
            key: 'issue_date',
            label: 'Vystaveno',
            sortable: true,
            render: (i) => (
                <span className="text-muted-foreground">{formatDate(i.issue_date)}</span>
            ),
        },
        {
            key: 'due_date',
            label: 'Splatnost',
            sortable: true,
            render: (i) => (
                <span className={dueDateClass(i.due_date, i.status)}>
                    {formatDate(i.due_date)}
                </span>
            ),
        },
        {
            key: 'total',
            label: 'Částka',
            sortable: true,
            render: (i) => (
                <span className="font-medium text-foreground">
                    {formatCurrency(i.total)}
                </span>
            ),
        },
        {
            key: 'status',
            label: 'Stav',
            render: (i) => <InvoiceStatusBadge status={i.status} />,
        },
        {
            key: 'payment_method',
            label: 'Platba',
            render: (i) => (
                <span className="text-muted-foreground">
                    {i.payment_method === 'banka' ? 'Převodem' : 'Hotově'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: '',
            className: 'w-[100px] text-right',
            render: (row) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => router.visit(`/faktury/${row.id}/upravit`)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Upravit"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(row)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Smazat"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ], []);

    const trashedColumns = useMemo<Column<Invoice>[]>(() => [
        {
            key: 'invoice_number',
            label: 'Číslo',
            render: (i) => (
                <span className="font-medium text-muted-foreground">{i.invoice_number}</span>
            ),
        },
        {
            key: 'customer',
            label: 'Zákazník',
            render: (i) => (
                <span className="text-muted-foreground">{i.customer.name}</span>
            ),
        },
        {
            key: 'total',
            label: 'Částka',
            render: (i) => (
                <span className="text-muted-foreground">{formatCurrency(i.total)}</span>
            ),
        },
        {
            key: 'status',
            label: 'Stav',
            render: (i) => <InvoiceStatusBadge status={i.status} />,
        },
        {
            key: 'deleted_at',
            label: 'Smazáno',
            render: (i) => (
                <span className="text-muted-foreground">
                    {i.deleted_at ? formatDate(i.deleted_at) : ''}
                </span>
            ),
        },
        {
            key: 'actions',
            label: '',
            className: 'w-[120px] text-right',
            render: (row) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => handleRestore(row.id)}
                        disabled={restoring === row.id}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-500"
                        title="Obnovit"
                    >
                        <RotateCcw className={`h-3.5 w-3.5 ${restoring === row.id ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(row)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Trvale smazat"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ], [restoring]);

    const paidColumns = useMemo<Column<Invoice>[]>(() => [
        {
            key: 'invoice_number',
            label: 'Číslo',
            sortable: true,
            render: (i) => (
                <span className="font-medium text-foreground flex items-center gap-1.5">
                    {i.invoice_number}
                    {i.sent_at && (
                        <MailCheck className="h-3 w-3 text-emerald-400" title="Odesláno e-mailem" />
                    )}
                </span>
            ),
        },
        {
            key: 'customer',
            label: 'Zákazník',
            render: (i) => (
                <span className="text-muted-foreground">{i.customer.name}</span>
            ),
        },
        {
            key: 'total',
            label: 'Částka',
            sortable: true,
            render: (i) => (
                <span className="font-medium text-foreground">
                    {formatCurrency(i.total)}
                </span>
            ),
        },
        {
            key: 'paid_at',
            label: 'Zaplaceno dne',
            sortable: true,
            render: (i) => (
                <span className="text-emerald-400">
                    {i.paid_at ? formatDate(i.paid_at) : '—'}
                </span>
            ),
        },
        {
            key: 'payment_method',
            label: 'Platba',
            render: (i) => (
                <span className="text-muted-foreground">
                    {i.payment_method === 'banka' ? 'Převodem' : 'Hotově'}
                </span>
            ),
        },
        {
            key: 'actions',
            label: '',
            className: 'w-[100px] text-right',
            render: (row) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => router.visit(`/faktury/${row.id}/upravit`)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Upravit"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(row)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Smazat"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ], []);

    const applyFilters = useCallback(
        (params: Record<string, string | number | undefined>) => {
            router.get(
                '/faktury',
                { ...filters, ...params, page: params.page ?? 1 },
                { preserveState: true, replace: true },
            );
        },
        [filters],
    );

    const handleSearch = useCallback(
        (value: string) => {
            setSearch(value);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = setTimeout(
                () => applyFilters({ search: value || undefined }),
                300,
            );
        },
        [applyFilters],
    );

    return (
        <AuthenticatedLayout
            title="Faktury"
            breadcrumbs={[{ label: 'Faktury' }]}
        >
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-foreground">
                        Faktury
                    </h1>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSyncBank}
                            disabled={syncing}
                            className="border-border text-muted-foreground hover:text-foreground"
                        >
                            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Synchronizuji...' : 'Sync z banky'}
                        </Button>
                        <Button
                            asChild
                            variant="outline"
                            className="border-border text-muted-foreground hover:text-foreground"
                        >
                            <a href="/faktury/export" download>
                                <Download className="h-4 w-4" />
                                Export odeslaných
                            </a>
                        </Button>
                        <Button
                            asChild
                            className="bg-primary text-white hover:bg-primary/80"
                        >
                            <Link href="/faktury/create">
                                <Plus className="h-4 w-4" />
                                Nová faktura
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Bank sync status + Tabs */}
                <div className="flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-1">
                    <button
                        onClick={() => applyFilters({ trashed: undefined, status: undefined, search: undefined })}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                            isActive
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Aktivní
                    </button>
                    <button
                        onClick={() => applyFilters({ trashed: undefined, status: 'zaplacena', search: undefined })}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                            isPaid
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Uhrazené
                        {paidCount > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500/10 px-1.5 text-xs font-medium text-emerald-400">
                                {paidCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => applyFilters({ trashed: '1', status: undefined, search: undefined })}
                        className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                            isTrashed
                                ? 'border-primary text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        Smazané
                        {trashedCount > 0 && (
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/10 px-1.5 text-xs font-medium text-red-400">
                                {trashedCount}
                            </span>
                        )}
                    </button>
                    </div>
                    {lastBankSync && (
                        <span className="text-xs text-muted-foreground pb-2">
                            Poslední sync: {new Date(lastBankSync).toLocaleString('cs-CZ', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>

                <DataTable<Invoice>
                    columns={isTrashed ? trashedColumns : isPaid ? paidColumns : activeColumns}
                    data={invoices.data}
                    pagination={{
                        current_page: invoices.current_page,
                        last_page: invoices.last_page,
                        per_page: invoices.per_page,
                        total: invoices.total,
                        from: invoices.from,
                        to: invoices.to,
                    }}
                    searchValue={search}
                    onSearchChange={handleSearch}
                    searchPlaceholder="Hledat faktury..."
                    sortField={filters.sort}
                    sortDirection={filters.direction}
                    onSort={(field) => {
                        const direction =
                            filters.sort === field &&
                            filters.direction === 'asc'
                                ? 'desc'
                                : 'asc';
                        applyFilters({ sort: field, direction });
                    }}
                    onPageChange={(page) => applyFilters({ page })}
                    onRowClick={isTrashed ? undefined : (i) => router.visit(`/faktury/${i.id}`)}
                    toolbar={
                        isActive ? (
                            <Select
                                value={filters.status ?? 'all'}
                                onValueChange={(v) =>
                                    applyFilters({
                                        status: v === 'all' ? undefined : v,
                                    })
                                }
                            >
                                <SelectTrigger className="w-[140px] border-border bg-muted">
                                    <SelectValue placeholder="Stav" />
                                </SelectTrigger>
                                <SelectContent className="border-border bg-card">
                                    <SelectItem value="all" className="focus:bg-muted">
                                        Všechny stavy
                                    </SelectItem>
                                    <SelectItem value="vystavena" className="focus:bg-muted">
                                        Vystavena
                                    </SelectItem>
                                    <SelectItem value="odeslana" className="focus:bg-muted">
                                        Odeslaná
                                    </SelectItem>
                                    <SelectItem value="zaplacena" className="focus:bg-muted">
                                        Zaplacena
                                    </SelectItem>
                                    <SelectItem value="po_splatnosti" className="focus:bg-muted">
                                        Po splatnosti
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        ) : undefined
                    }
                    emptyMessage={isTrashed ? 'Žádné smazané faktury' : isPaid ? 'Žádné uhrazené faktury' : 'Žádné faktury'}
                />
            </div>

            {/* Delete confirmation modal */}
            <GlassModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title={isTrashed ? 'Trvale smazat fakturu' : 'Smazat fakturu'}
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        {isTrashed ? (
                            <>
                                Opravdu chcete <span className="font-semibold text-red-400">trvale smazat</span> fakturu{' '}
                                <span className="font-semibold text-foreground">{deleteTarget?.invoice_number}</span>?
                                Tuto akci nelze vrátit.
                            </>
                        ) : (
                            <>
                                Opravdu chcete smazat fakturu{' '}
                                <span className="font-semibold text-foreground">{deleteTarget?.invoice_number}</span>?
                                Fakturu bude možné obnovit z koše.
                            </>
                        )}
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setDeleteTarget(null)}
                        >
                            Zrušit
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={deleting}
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <Trash2 className="h-4 w-4" />
                            {deleting ? 'Mažu...' : isTrashed ? 'Trvale smazat' : 'Smazat'}
                        </Button>
                    </div>
                </div>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
