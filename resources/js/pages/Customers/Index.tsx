import { type FormEvent, useCallback, useMemo, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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

interface PaginatedCustomers {
    data: CustomerRow[];
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
    };
}

export default function Index({ customers, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [showCreate, setShowCreate] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<CustomerRow | null>(null);
    const [deleting, setDeleting] = useState(false);

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
        router.delete(`/zakaznici/${deleteTarget.id}`, {
            onSuccess: () => {
                setDeleteTarget(null);
                setDeleting(false);
            },
            onError: () => setDeleting(false),
        });
    };

    const columns = useMemo<Column<CustomerRow>[]>(() => [
        ...customerColumns,
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
            const timeout = setTimeout(
                () => applyFilters({ search: value || undefined }),
                300,
            );
            return () => clearTimeout(timeout);
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
                    <Button
                        className="bg-primary text-white hover:bg-primary/80"
                        onClick={() => setShowCreate(true)}
                    >
                        <Plus className="h-4 w-4" />
                        Nový zákazník
                    </Button>
                </div>

                {/* Table */}
                <DataTable<CustomerRow>
                    columns={columns}
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
                    onRowClick={handleCustomerRowClick}
                    emptyMessage="Zatím nemáte žádné zákazníky"
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
                title="Smazat zákazníka"
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Opravdu chcete smazat zákazníka{' '}
                        <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
                        Tato akce se nedá vrátit.
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
                            {deleting ? 'Mažu...' : 'Smazat'}
                        </Button>
                    </div>
                </div>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
