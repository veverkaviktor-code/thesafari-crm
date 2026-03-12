import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { formatDate } from '@/lib/utils';
import { MessageSquare, RotateCcw, Trash2 } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import DataTable, { type Column } from '@/components/ui/DataTable';
import PriorityBadge from '@/components/tickets/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import GlassModal from '@/components/ui/GlassModal';

interface Ticket {
    id: number;
    subject: string;
    customer: { id: number; name: string; company: string | null } | null;
    status: string;
    priority: string;
    source_email: string;
    source: string | null;
    created_at: string;
    resolved_at: string | null;
    messages_count?: number;
    deleted_at?: string | null;
}

interface Props {
    tickets: {
        data: Ticket[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search?: string;
        status?: string;
        priority?: string;
        source?: string;
        sort_by?: string;
        sort_dir?: string;
        trashed?: string;
    };
    trashedCount: number;
}

const statusMap: Record<string, { label: string; variant: string }> = {
    novy: { label: 'Nový', variant: 'pending' },
    v_reseni: { label: 'V řešení', variant: 'active' },
    ceka_na_zakaznika: { label: 'Čeká na zákazníka', variant: 'inactive' },
    vyreseno: { label: 'Vyřešeno', variant: 'completed' },
};

export default function TicketsIndex({ tickets, filters, trashedCount }: Props) {
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [priorityFilter, setPriorityFilter] = useState(filters.priority || 'all');
    const [sourceFilter, setSourceFilter] = useState(filters.source || 'all');
    const [deleteTarget, setDeleteTarget] = useState<Ticket | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [restoring, setRestoring] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [showEmptyTrash, setShowEmptyTrash] = useState(false);
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isTrashed = filters.trashed === '1';

    // Reset selection on tab change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [isTrashed]);

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        if (isTrashed) {
            router.delete(`/zpravy/${deleteTarget.id}/force-delete`, {
                onSuccess: () => { setDeleteTarget(null); setDeleting(false); },
                onError: () => setDeleting(false),
            });
        } else {
            router.delete(`/zpravy/${deleteTarget.id}`, {
                onSuccess: () => { setDeleteTarget(null); setDeleting(false); },
                onError: () => setDeleting(false),
            });
        }
    };

    const handleRestore = (id: number) => {
        setRestoring(id);
        router.post(`/zpravy/${id}/restore`, {}, {
            onSuccess: () => setRestoring(null),
            onError: () => setRestoring(null),
        });
    };

    function applyFilters(overrides: Record<string, string | undefined>) {
        const params: Record<string, string> = {
            ...(filters.search ? { search: filters.search } : {}),
            ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
            ...(priorityFilter !== 'all' ? { priority: priorityFilter } : {}),
            ...(sourceFilter !== 'all' ? { source: sourceFilter } : {}),
            ...overrides,
        };
        Object.keys(params).forEach((k) => {
            if (params[k] === 'all' || params[k] === '' || params[k] === undefined) delete params[k];
        });
        router.get('/zpravy', params, { preserveState: true });
    }

    const handleSearch = useCallback(
        (value: string) => {
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = setTimeout(
                () => applyFilters({ search: value || undefined }),
                300,
            );
        },
        [filters, statusFilter, priorityFilter, sourceFilter],
    );

    const handleBulkDelete = () => {
        setBulkProcessing(true);
        router.post('/zpravy/bulk-delete', { ids: Array.from(selectedIds) }, {
            onSuccess: () => { setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    const handleBulkRestore = () => {
        setBulkProcessing(true);
        router.post('/zpravy/bulk-restore', { ids: Array.from(selectedIds) }, {
            onSuccess: () => { setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    const handleBulkForceDelete = () => {
        setBulkProcessing(true);
        router.delete('/zpravy/bulk-force-delete', { data: { ids: Array.from(selectedIds) } }, {
            onSuccess: () => { setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    const handleEmptyTrash = () => {
        setBulkProcessing(true);
        router.delete('/zpravy/empty-trash', {}, {
            onSuccess: () => { setShowEmptyTrash(false); setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    const activeColumns = useMemo<Column<Ticket>[]>(() => [
        {
            key: 'subject',
            label: 'Předmět',
            sortable: true,
            render: (ticket) => (
                <div>
                    <p className="font-medium text-foreground">{ticket.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ticket.source_email}</p>
                </div>
            ),
        },
        {
            key: 'customer',
            label: 'Zákazník',
            render: (ticket) => (
                <span className="text-foreground/80">
                    {ticket.customer ? (ticket.customer.company || ticket.customer.name) : '—'}
                </span>
            ),
        },
        {
            key: 'source',
            label: 'Zdroj',
            render: (ticket) => {
                const sourceLabels: Record<string, { label: string; className: string }> = {
                    podpora: { label: 'Podpora', className: 'bg-blue-500/15 text-blue-500 border-blue-500/25' },
                    'neniweb.cz': { label: 'neniweb.cz', className: 'bg-violet-500/15 text-violet-500 border-violet-500/25' },
                    email: { label: 'E-mail', className: 'bg-amber-500/15 text-amber-500 border-amber-500/25' },
                };
                const cfg = ticket.source ? sourceLabels[ticket.source] : null;
                if (!cfg) return <span className="text-muted-foreground/50">—</span>;
                return (
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.className}`}>
                        {cfg.label}
                    </span>
                );
            },
        },
        {
            key: 'priority',
            label: 'Priorita',
            sortable: true,
            render: (ticket) => <PriorityBadge priority={ticket.priority} />,
        },
        {
            key: 'status',
            label: 'Stav',
            sortable: true,
            render: (ticket) => {
                const s = statusMap[ticket.status];
                return s ? <StatusBadge status={s.variant}>{s.label}</StatusBadge> : <span>{ticket.status}</span>;
            },
        },
        {
            key: 'messages_count',
            label: 'Zprávy',
            render: (ticket) => (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span className="text-sm">{ticket.messages_count ?? 0}</span>
                </div>
            ),
        },
        {
            key: 'created_at',
            label: 'Vytvořeno',
            sortable: true,
            render: (ticket) => (
                <span className="text-sm text-muted-foreground">
                    {formatDate(ticket.created_at)}
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

    const trashedColumns = useMemo<Column<Ticket>[]>(() => [
        {
            key: 'subject',
            label: 'Předmět',
            render: (ticket) => (
                <span className="font-medium text-muted-foreground">{ticket.subject}</span>
            ),
        },
        {
            key: 'customer',
            label: 'Zákazník',
            render: (ticket) => (
                <span className="text-muted-foreground">
                    {ticket.customer ? (ticket.customer.company || ticket.customer.name) : '—'}
                </span>
            ),
        },
        {
            key: 'deleted_at',
            label: 'Smazáno',
            render: (ticket) => (
                <span className="text-muted-foreground">
                    {ticket.deleted_at ? formatDate(ticket.deleted_at) : ''}
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

    return (
        <AuthenticatedLayout
            title="Zprávy"
            breadcrumbs={[{ label: 'Zprávy' }]}
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-foreground">
                        Zprávy
                    </h1>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => applyFilters({ trashed: undefined })}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                !isTrashed
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Všechny
                        </button>
                        <button
                            onClick={() => applyFilters({ trashed: '1', status: undefined, priority: undefined, source: undefined })}
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
                    {isTrashed && trashedCount > 0 && (
                        <div className="pb-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowEmptyTrash(true)}
                                className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Vysypat koš
                            </Button>
                        </div>
                    )}
                </div>

                {/* Bulk action bar */}
                {selectedIds.size > 0 && (
                    <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-2">
                        <span className="text-sm text-muted-foreground">
                            Vybráno: <span className="font-medium text-foreground">{selectedIds.size}</span>
                        </span>
                        <div className="flex items-center gap-2">
                            {isTrashed ? (
                                <>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBulkRestore}
                                        disabled={bulkProcessing}
                                        className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Obnovit vybrané
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBulkForceDelete}
                                        disabled={bulkProcessing}
                                        className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Smazat trvale
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleBulkDelete}
                                    disabled={bulkProcessing}
                                    className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Smazat vybrané
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                <DataTable<Ticket>
                    data={tickets.data}
                    columns={isTrashed ? trashedColumns : activeColumns}
                    pagination={{
                        current_page: tickets.current_page,
                        last_page: tickets.last_page,
                        per_page: tickets.per_page,
                        total: tickets.total,
                        from: null,
                        to: null,
                    }}
                    searchValue={filters.search}
                    onSearchChange={handleSearch}
                    sortField={filters.sort_by}
                    sortDirection={filters.sort_dir as 'asc' | 'desc'}
                    onSort={(field) => {
                        const newDir = filters.sort_by === field && filters.sort_dir === 'asc' ? 'desc' : 'asc';
                        applyFilters({ sort_by: field, sort_dir: newDir });
                    }}
                    onPageChange={(page) => applyFilters({ page: String(page) })}
                    onRowClick={isTrashed ? undefined : (ticket) => router.visit(`/zpravy/${ticket.id}`)}
                    selectable={true}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    getItemId={(item) => item.id}
                    toolbar={
                        !isTrashed ? (
                            <div className="flex items-center gap-3">
                                <Select
                                    value={statusFilter}
                                    onValueChange={(v) => { setStatusFilter(v); applyFilters({ status: v }); }}
                                >
                                    <SelectTrigger className="w-[160px] bg-muted border-border text-foreground/80">
                                        <SelectValue placeholder="Stav" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="all">Všechny stavy</SelectItem>
                                        <SelectItem value="novy">Nový</SelectItem>
                                        <SelectItem value="v_reseni">V řešení</SelectItem>
                                        <SelectItem value="ceka_na_zakaznika">Čeká na zákazníka</SelectItem>
                                        <SelectItem value="vyreseno">Vyřešeno</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={priorityFilter}
                                    onValueChange={(v) => { setPriorityFilter(v); applyFilters({ priority: v }); }}
                                >
                                    <SelectTrigger className="w-[140px] bg-muted border-border text-foreground/80">
                                        <SelectValue placeholder="Priorita" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="all">Všechny</SelectItem>
                                        <SelectItem value="low">Nízká</SelectItem>
                                        <SelectItem value="medium">Střední</SelectItem>
                                        <SelectItem value="high">Vysoká</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={sourceFilter}
                                    onValueChange={(v) => { setSourceFilter(v); applyFilters({ source: v }); }}
                                >
                                    <SelectTrigger className="w-[150px] bg-muted border-border text-foreground/80">
                                        <SelectValue placeholder="Zdroj" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="all">Všechny zdroje</SelectItem>
                                        <SelectItem value="podpora">Podpora</SelectItem>
                                        <SelectItem value="neniweb.cz">neniweb.cz</SelectItem>
                                        <SelectItem value="email">E-mail</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : undefined
                    }
                    emptyMessage={isTrashed ? 'Žádné smazané zprávy' : 'Žádné zprávy'}
                />
            </div>

            {/* Delete confirmation modal */}
            <GlassModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title={isTrashed ? 'Trvale smazat zprávu' : 'Smazat zprávu'}
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        {isTrashed ? (
                            <>
                                Opravdu chcete <span className="font-semibold text-red-400">trvale smazat</span> zprávu{' '}
                                <span className="font-semibold text-foreground">{deleteTarget?.subject}</span>?
                                Tuto akci nelze vrátit.
                            </>
                        ) : (
                            <>
                                Opravdu chcete smazat zprávu{' '}
                                <span className="font-semibold text-foreground">{deleteTarget?.subject}</span>?
                                Zprávu bude možné obnovit z koše.
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
                            {deleting ? 'Mažu...' : isTrashed ? 'Trvale smazat' : 'Do koše'}
                        </Button>
                    </div>
                </div>
            </GlassModal>

            {/* Empty trash confirmation modal */}
            <GlassModal
                open={showEmptyTrash}
                onClose={() => setShowEmptyTrash(false)}
                title="Vysypat koš"
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Opravdu chcete <span className="font-semibold text-red-400">trvale smazat všech {trashedCount} položek</span> v koši?
                        Tuto akci nelze vrátit.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setShowEmptyTrash(false)}>Zrušit</Button>
                        <Button
                            variant="destructive"
                            disabled={bulkProcessing}
                            onClick={handleEmptyTrash}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <Trash2 className="h-4 w-4" />
                            {bulkProcessing ? 'Mažu...' : 'Vysypat koš'}
                        </Button>
                    </div>
                </div>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
