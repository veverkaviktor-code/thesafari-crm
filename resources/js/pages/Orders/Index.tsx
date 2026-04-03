import { type FormEvent, useCallback, useMemo, useRef, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { Check, ChevronsUpDown, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import OrderStatusBadge, {
    type OrderStatus,
} from '@/components/orders/OrderStatusBadge';
import DivisionBadge, {
    type Division,
    allDivisions,
} from '@/components/orders/DivisionBadge';
import GlassModal from '@/components/ui/GlassModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import OrderForm, {
    defaultOrderData,
    type OrderFormData,
} from '@/components/orders/OrderForm';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { cn, formatCurrency } from '@/lib/utils';

interface Order {
    id: number;
    title: string;
    customer: { id: number; name: string };
    division: Division[];
    status: OrderStatus;
    price: number;
    total_time_cost: number | null;
    deadline: string | null;
    created_at: string;
    deleted_at?: string | null;
}

interface PaginatedOrders {
    data: Order[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface Props {
    orders: PaginatedOrders;
    customers: Customer[];
    filters: {
        search?: string;
        status?: string;
        division?: string;
        customer_id?: string;
        sort?: string;
        direction?: 'asc' | 'desc';
        trashed?: string;
    };
    trashedCount: number;
}

function deadlineClass(deadline: string | null): string {
    if (!deadline) return 'text-muted-foreground';
    const diff = new Date(deadline).getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < 0) return 'text-red-400';
    if (days < 7) return 'text-amber-400';
    return 'text-muted-foreground';
}

const baseColumns: Column<Order>[] = [
    {
        key: 'title',
        label: 'Zakázka',
        sortable: true,
        render: (o) => (
            <span className="font-medium text-foreground">{o.title}</span>
        ),
    },
    {
        key: 'customer',
        label: 'Zákazník',
        render: (o) => (
            <Link
                href={`/zakaznici/${o.customer.id}`}
                className="text-primary hover:underline"
                onClick={(e) => e.stopPropagation()}
            >
                {o.customer.name}
            </Link>
        ),
    },
    {
        key: 'division',
        label: 'Divize',
        render: (o) => (
            <div className="flex flex-wrap gap-1">
                {(Array.isArray(o.division) ? o.division : [o.division]).map((d) => (
                    <DivisionBadge key={d} division={d} />
                ))}
            </div>
        ),
    },
    {
        key: 'status',
        label: 'Stav',
        render: (o) => <OrderStatusBadge status={o.status} />,
    },
    {
        key: 'price',
        label: 'Cena',
        sortable: true,
        render: (o) => (
            <span className="text-foreground/70">{formatCurrency((Number(o.price) || 0) + (Number(o.total_time_cost) || 0))}</span>
        ),
    },
    {
        key: 'deadline',
        label: 'Deadline',
        sortable: true,
        render: (o) => (
            <span className={deadlineClass(o.deadline)}>
                {o.deadline
                    ? new Date(o.deadline).toLocaleDateString('cs-CZ')
                    : '—'}
            </span>
        ),
    },
    {
        key: 'created_at',
        label: 'Vytvořeno',
        sortable: true,
        render: (o) => (
            <span className="text-muted-foreground">
                {new Date(o.created_at).toLocaleDateString('cs-CZ')}
            </span>
        ),
    },
];

export default function Index({ orders, customers, filters, trashedCount }: Props) {
    const isTrashed = filters.trashed === '1';
    const [search, setSearch] = useState(filters.search ?? '');
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [showEmptyTrash, setShowEmptyTrash] = useState(false);
    const [customerOpen, setCustomerOpen] = useState(false);

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        if (isTrashed) {
            router.delete(`/zakazky/${deleteTarget.id}/force-delete`, {
                onSuccess: () => { setDeleteTarget(null); setDeleting(false); },
                onError: () => setDeleting(false),
            });
        } else {
            router.delete(`/zakazky/${deleteTarget.id}`, {
                onSuccess: () => { setDeleteTarget(null); setDeleting(false); },
                onError: () => setDeleting(false),
            });
        }
    };

    const handleRestore = (order: Order) => {
        router.post(`/zakazky/${order.id}/restore`, {}, { preserveScroll: true });
    };

    const handleBulkDelete = () => {
        setBulkProcessing(true);
        router.post('/zakazky/bulk-delete', { ids: Array.from(selectedIds) }, {
            onSuccess: () => { setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    const handleBulkRestore = () => {
        setBulkProcessing(true);
        router.post('/zakazky/bulk-restore', { ids: Array.from(selectedIds) }, {
            onSuccess: () => { setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    const handleBulkForceDelete = () => {
        setBulkProcessing(true);
        router.delete('/zakazky/bulk-force-delete', {
            data: { ids: Array.from(selectedIds) },
            onSuccess: () => { setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    const handleEmptyTrash = () => {
        setBulkProcessing(true);
        router.delete('/zakazky/empty-trash', {
            onSuccess: () => { setShowEmptyTrash(false); setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    // Columns for active view
    const activeColumns = useMemo<Column<Order>[]>(() => [
        ...baseColumns,
        {
            key: 'actions',
            label: '',
            className: 'w-[100px] text-right',
            render: (row) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => router.visit(`/zakazky/${row.id}/upravit`)}
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

    // Columns for trash view
    const trashedColumns = useMemo<Column<Order>[]>(() => [
        ...baseColumns,
        {
            key: 'deleted_at',
            label: 'Smazáno',
            render: (o) => (
                <span className="text-muted-foreground">
                    {o.deleted_at ? new Date(o.deleted_at).toLocaleDateString('cs-CZ') : '—'}
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
                        onClick={() => handleRestore(row)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-500"
                        title="Obnovit"
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(row)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Smazat trvale"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ], []);

    const form = useForm<OrderFormData>({ ...defaultOrderData });

    const handleCreateSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/zakazky', {
            onSuccess: () => {
                setShowCreate(false);
                form.reset();
            },
        });
    };

    const applyFilters = useCallback(
        (params: Record<string, string | number | undefined>) => {
            router.get(
                '/zakazky',
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

    const switchTab = (trashed: boolean) => {
        setSelectedIds(new Set());
        router.get('/zakazky', trashed ? { trashed: '1' } : {}, { preserveState: false });
    };

    return (
        <AuthenticatedLayout
            title="Zakázky"
            breadcrumbs={[{ label: 'Zakázky' }]}
        >
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-foreground">
                        Zakázky
                    </h1>
                    {!isTrashed && (
                        <Button
                            className="bg-primary text-white hover:bg-primary/80"
                            onClick={() => setShowCreate(true)}
                        >
                            <Plus className="h-4 w-4" />
                            Nová zakázka
                        </Button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-6 border-b border-border">
                    <button
                        onClick={() => switchTab(false)}
                        className={cn(
                            'pb-3 text-sm font-medium transition-colors',
                            !isTrashed
                                ? 'border-b-2 border-primary text-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        Všechny
                    </button>
                    <button
                        onClick={() => switchTab(true)}
                        className={cn(
                            'pb-3 text-sm font-medium transition-colors flex items-center gap-2',
                            isTrashed
                                ? 'border-b-2 border-primary text-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        Koš
                        {trashedCount > 0 && (
                            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/15 px-1.5 text-xs font-semibold text-red-400">
                                {trashedCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Bulk actions bar */}
                {selectedIds.size > 0 && (
                    <div className="flex items-center gap-3 rounded-xl border border-border bg-accent px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                            Vybráno: <span className="font-semibold text-foreground">{selectedIds.size}</span>
                        </span>
                        <div className="ml-auto flex gap-2">
                            {isTrashed ? (
                                <>
                                    <Button
                                        size="sm"
                                        className="bg-emerald-600 text-white hover:bg-emerald-700"
                                        onClick={handleBulkRestore}
                                        disabled={bulkProcessing}
                                    >
                                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                                        Obnovit
                                    </Button>
                                    <Button
                                        size="sm"
                                        className="bg-red-600 text-white hover:bg-red-700"
                                        onClick={handleBulkForceDelete}
                                        disabled={bulkProcessing}
                                    >
                                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                                        Smazat trvale
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    size="sm"
                                    className="bg-red-600 text-white hover:bg-red-700"
                                    onClick={handleBulkDelete}
                                    disabled={bulkProcessing}
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                    Smazat vybrané
                                </Button>
                            )}
                        </div>
                    </div>
                )}

                <DataTable<Order>
                    columns={isTrashed ? trashedColumns : activeColumns}
                    data={orders.data}
                    pagination={{
                        current_page: orders.current_page,
                        last_page: orders.last_page,
                        per_page: orders.per_page,
                        total: orders.total,
                        from: orders.from,
                        to: orders.to,
                    }}
                    searchValue={search}
                    onSearchChange={handleSearch}
                    searchPlaceholder="Hledat zakázky..."
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
                    onRowClick={(o) => !isTrashed && router.visit(`/zakazky/${o.id}`)}
                    selectable
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    getItemId={(o) => o.id}
                    toolbar={
                        isTrashed ? (
                            trashedCount > 0 ? (
                                <Button
                                    size="sm"
                                    className="bg-red-600 text-white hover:bg-red-700"
                                    onClick={() => setShowEmptyTrash(true)}
                                >
                                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                                    Vysypat koš
                                </Button>
                            ) : undefined
                        ) : (
                            <div className="flex gap-2">
                                <Popover open={customerOpen} onOpenChange={setCustomerOpen}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={customerOpen}
                                            className="w-[180px] justify-between border-border bg-muted text-sm font-normal"
                                        >
                                            <span className="truncate">
                                                {filters.customer_id
                                                    ? customers.find((c) => c.id === Number(filters.customer_id))?.name ?? 'Zákazník'
                                                    : 'Všichni zákazníci'}
                                            </span>
                                            <ChevronsUpDown className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[220px] p-0 border-border bg-card" align="end">
                                        <Command>
                                            <CommandInput placeholder="Hledat zákazníka..." />
                                            <CommandList>
                                                <CommandEmpty>Nenalezeno</CommandEmpty>
                                                <CommandGroup>
                                                    <CommandItem
                                                        onSelect={() => {
                                                            applyFilters({ customer_id: undefined });
                                                            setCustomerOpen(false);
                                                        }}
                                                    >
                                                        <Check className={cn('mr-2 h-4 w-4', !filters.customer_id ? 'opacity-100' : 'opacity-0')} />
                                                        Všichni zákazníci
                                                    </CommandItem>
                                                    {customers.map((c) => (
                                                        <CommandItem
                                                            key={c.id}
                                                            onSelect={() => {
                                                                applyFilters({ customer_id: String(c.id) });
                                                                setCustomerOpen(false);
                                                            }}
                                                        >
                                                            <Check className={cn('mr-2 h-4 w-4', filters.customer_id === String(c.id) ? 'opacity-100' : 'opacity-0')} />
                                                            {c.name}
                                                            {c.company && <span className="ml-1 text-muted-foreground">({c.company})</span>}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <Select
                                    value={filters.status ?? 'all'}
                                    onValueChange={(v) =>
                                        applyFilters({
                                            status:
                                                v === 'all' ? undefined : v,
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-[160px] border-border bg-muted">
                                        <SelectValue placeholder="Stav" />
                                    </SelectTrigger>
                                    <SelectContent className="border-border bg-card">
                                        <SelectItem value="all" className="focus:bg-muted">
                                            Všechny stavy
                                        </SelectItem>
                                        <SelectItem value="nova" className="focus:bg-muted">
                                            Nová
                                        </SelectItem>
                                        <SelectItem value="v_reseni" className="focus:bg-muted">
                                            V řešení
                                        </SelectItem>
                                        <SelectItem value="hotovo" className="focus:bg-muted">
                                            Hotovo
                                        </SelectItem>
                                        <SelectItem value="fakturovano" className="focus:bg-muted">
                                            Fakturováno
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                                <Select
                                    value={filters.division ?? 'all'}
                                    onValueChange={(v) =>
                                        applyFilters({
                                            division:
                                                v === 'all' ? undefined : v,
                                        })
                                    }
                                >
                                    <SelectTrigger className="w-[160px] border-border bg-muted">
                                        <SelectValue placeholder="Divize" />
                                    </SelectTrigger>
                                    <SelectContent className="border-border bg-card">
                                        <SelectItem value="all" className="focus:bg-muted">
                                            Všechny divize
                                        </SelectItem>
                                        {allDivisions.map((d) => (
                                            <SelectItem key={d.value} value={d.value} className="focus:bg-muted">
                                                {d.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )
                    }
                    emptyMessage={isTrashed ? 'Koš je prázdný' : 'Žádné zakázky'}
                />
            </div>

            <GlassModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title="Nová zakázka"
                maxWidth="max-w-3xl"
            >
                <OrderForm
                    form={form}
                    onSubmit={handleCreateSubmit}
                    submitLabel="Vytvořit zakázku"
                    customers={customers}
                    onCancel={() => setShowCreate(false)}
                />
            </GlassModal>

            {/* Delete / force delete confirmation */}
            <ConfirmDialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                processing={deleting}
                title={isTrashed ? 'Trvale smazat zakázku' : 'Smazat zakázku'}
                message={
                    isTrashed
                        ? `Opravdu chcete trvale smazat zakázku "${deleteTarget?.title}"? Tuto akci nelze vrátit.`
                        : `Opravdu chcete smazat zakázku "${deleteTarget?.title}"? Zakázka bude přesunuta do koše.`
                }
                confirmLabel={isTrashed ? 'Smazat trvale' : 'Smazat'}
            />

            {/* Empty trash confirmation */}
            <ConfirmDialog
                open={showEmptyTrash}
                onClose={() => setShowEmptyTrash(false)}
                onConfirm={handleEmptyTrash}
                processing={bulkProcessing}
                title="Vysypat koš"
                message={`Opravdu chcete trvale smazat všech ${trashedCount} zakázek z koše? Tuto akci nelze vrátit.`}
                confirmLabel="Vysypat koš"
            />
        </AuthenticatedLayout>
    );
}
