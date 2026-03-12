import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import DataTable, { type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import GlassModal from '@/components/ui/GlassModal';
import CustomerForm, {
    defaultCustomerData,
    type CustomerFormData,
} from '@/components/customers/CustomerForm';
import {
    type CustomerRow,
    customerColumns,
    handleCustomerRowClick,
} from '@/components/customers/CustomerTable';

type CustomerRowWithTrash = CustomerRow & { deleted_at?: string | null };

interface PaginatedCustomers {
    data: CustomerRowWithTrash[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Props {
    customers: PaginatedCustomers;
    filters: {
        search?: string;
        sort?: string;
        direction?: 'asc' | 'desc';
        trashed?: string;
    };
    trashedCount: number;
}

export default function Index({ customers, filters, trashedCount }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<CustomerRowWithTrash | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [restoring, setRestoring] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [showEmptyTrash, setShowEmptyTrash] = useState(false);

    const isTrashed = filters.trashed === '1';

    // Reset selection on tab change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [isTrashed]);

    const form = useForm<CustomerFormData>({ ...defaultCustomerData });

    const handleCreateSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/zakaznici', {
            onSuccess: () => {
                setShowCreate(false);
                form.reset();
            },
        });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        if (isTrashed) {
            router.delete(`/zakaznici/${deleteTarget.id}/force-delete`, {
                onSuccess: () => { setDeleteTarget(null); setDeleting(false); },
                onError: () => setDeleting(false),
            });
        } else {
            router.delete(`/zakaznici/${deleteTarget.id}`, {
                onSuccess: () => { setDeleteTarget(null); setDeleting(false); },
                onError: () => setDeleting(false),
            });
        }
    };

    const handleRestore = (id: number) => {
        setRestoring(id);
        router.post(`/zakaznici/${id}/restore`, {}, {
            onSuccess: () => setRestoring(null),
            onError: () => setRestoring(null),
        });
    };

    const handleBulkDelete = () => {
        setBulkProcessing(true);
        router.post('/zakaznici/bulk-delete', { ids: Array.from(selectedIds) }, {
            onSuccess: () => { setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    const handleBulkRestore = () => {
        setBulkProcessing(true);
        router.post('/zakaznici/bulk-restore', { ids: Array.from(selectedIds) }, {
            onSuccess: () => { setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    const handleBulkForceDelete = () => {
        setBulkProcessing(true);
        router.delete('/zakaznici/bulk-force-delete', { data: { ids: Array.from(selectedIds) } }, {
            onSuccess: () => { setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    const handleEmptyTrash = () => {
        setBulkProcessing(true);
        router.delete('/zakaznici/empty-trash', {}, {
            onSuccess: () => { setShowEmptyTrash(false); setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    const activeColumns = useMemo<Column<CustomerRowWithTrash>[]>(() => [
        ...(customerColumns as Column<CustomerRowWithTrash>[]),
        {
            key: 'actions',
            label: '',
            className: 'w-[100px] text-right',
            render: (c) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => router.visit(`/zakaznici/${c.id}/edit`)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Upravit"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(c)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Smazat"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ], []);

    const trashedColumns = useMemo<Column<CustomerRowWithTrash>[]>(() => [
        {
            key: 'name',
            label: 'Jméno',
            render: (c) => (
                <span className="font-medium text-muted-foreground">{c.name}</span>
            ),
        },
        {
            key: 'company',
            label: 'Firma',
            render: (c) => (
                <span className="text-muted-foreground">{c.company || '—'}</span>
            ),
        },
        {
            key: 'email',
            label: 'E-mail',
            render: (c) => (
                <span className="text-muted-foreground">{c.email || '—'}</span>
            ),
        },
        {
            key: 'deleted_at',
            label: 'Smazáno',
            render: (c) => (
                <span className="text-muted-foreground">
                    {c.deleted_at ? formatDate(c.deleted_at) : ''}
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

    const applyFilters = useCallback(
        (params: Record<string, string | number | undefined>) => {
            router.get(
                '/zakaznici',
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

    const handleSort = useCallback(
        (field: string) => {
            const direction =
                filters.sort === field && filters.direction === 'asc'
                    ? 'desc'
                    : 'asc';
            applyFilters({ sort: field, direction });
        },
        [filters, applyFilters],
    );

    const handlePageChange = useCallback(
        (page: number) => applyFilters({ page }),
        [applyFilters],
    );

    return (
        <AuthenticatedLayout
            title="Zákazníci"
            breadcrumbs={[{ label: 'Zákazníci' }]}
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-foreground">
                        Zákazníci
                    </h1>
                    {!isTrashed && (
                        <Button
                            className="bg-primary text-white hover:bg-primary/80"
                            onClick={() => setShowCreate(true)}
                        >
                            <Plus className="h-4 w-4" />
                            Nový zákazník
                        </Button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => applyFilters({ trashed: undefined, search: undefined })}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                !isTrashed
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Všechny
                        </button>
                        <button
                            onClick={() => applyFilters({ trashed: '1', search: undefined })}
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

                {/* Table */}
                <DataTable<CustomerRow>
                    columns={isTrashed ? trashedColumns : activeColumns}
                    data={customers.data}
                    pagination={{
                        current_page: customers.current_page,
                        last_page: customers.last_page,
                        per_page: customers.per_page,
                        total: customers.total,
                        from: customers.from,
                        to: customers.to,
                    }}
                    searchValue={search}
                    onSearchChange={handleSearch}
                    searchPlaceholder="Hledat zákazníky..."
                    sortField={filters.sort}
                    sortDirection={filters.direction}
                    onSort={handleSort}
                    onPageChange={handlePageChange}
                    onRowClick={isTrashed ? undefined : handleCustomerRowClick}
                    selectable={true}
                    selectedIds={selectedIds}
                    onSelectionChange={setSelectedIds}
                    getItemId={(item) => item.id}
                    emptyMessage={isTrashed ? 'Žádní smazaní zákazníci' : 'Zatím nemáte žádné zákazníky'}
                />
            </div>

            {/* Create modal */}
            <GlassModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title="Nový zákazník"
            >
                <CustomerForm
                    form={form}
                    onSubmit={handleCreateSubmit}
                    submitLabel="Vytvořit zákazníka"
                    onCancel={() => setShowCreate(false)}
                />
            </GlassModal>

            {/* Delete confirmation modal */}
            <GlassModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title={isTrashed ? 'Trvale smazat zákazníka' : 'Smazat zákazníka'}
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        {isTrashed ? (
                            <>
                                Opravdu chcete <span className="font-semibold text-red-400">trvale smazat</span> zákazníka{' '}
                                <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
                                Tuto akci nelze vrátit.
                            </>
                        ) : (
                            <>
                                Zákazník{' '}
                                <span className="font-semibold text-foreground">{deleteTarget?.name}</span>{' '}
                                bude přesunut do koše. Po 30 dnech se smaže trvale.
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
