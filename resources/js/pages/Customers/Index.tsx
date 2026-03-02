import { type FormEvent, useCallback, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import DataTable from '@/components/ui/DataTable';
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
                    <h1 className="text-2xl font-semibold text-[#F5F0E8]">
                        Zákazníci
                    </h1>
                    <Button
                        className="bg-[#D97706] text-white hover:bg-[#B45309]"
                        onClick={() => setShowCreate(true)}
                    >
                        <Plus className="h-4 w-4" />
                        Nový zákazník
                    </Button>
                </div>

                {/* Table */}
                <DataTable<CustomerRow>
                    columns={customerColumns}
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
        </AuthenticatedLayout>
    );
}
