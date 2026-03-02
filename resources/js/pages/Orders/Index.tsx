import { type FormEvent, useCallback, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Plus } from 'lucide-react';
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
} from '@/components/orders/DivisionBadge';
import GlassModal from '@/components/ui/GlassModal';
import OrderForm, {
    defaultOrderData,
    type OrderFormData,
} from '@/components/orders/OrderForm';
import { cn } from '@/lib/utils';

interface Order {
    id: number;
    title: string;
    customer: { id: number; name: string };
    division: Division;
    status: OrderStatus;
    price: number;
    deadline: string | null;
    created_at: string;
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
        sort?: string;
        direction?: 'asc' | 'desc';
    };
}

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
    }).format(v);

function deadlineClass(deadline: string | null): string {
    if (!deadline) return 'text-[#6B6560]';
    const diff = new Date(deadline).getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < 0) return 'text-red-400';
    if (days < 7) return 'text-amber-400';
    return 'text-[#9C9585]';
}

const columns: Column<Order>[] = [
    {
        key: 'title',
        label: 'Zakázka',
        sortable: true,
        render: (o) => (
            <div>
                <p className="font-medium text-white">{o.title}</p>
                <p className="text-xs text-[#6B6560]">{o.customer.name}</p>
            </div>
        ),
    },
    {
        key: 'division',
        label: 'Divize',
        render: (o) => <DivisionBadge division={o.division} />,
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
            <span className="text-[#F5F0E8]/70">{formatCurrency(o.price)}</span>
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
            <span className="text-[#6B6560]">
                {new Date(o.created_at).toLocaleDateString('cs-CZ')}
            </span>
        ),
    },
];

export default function Index({ orders, customers, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [showCreate, setShowCreate] = useState(false);

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
            const timeout = setTimeout(
                () => applyFilters({ search: value || undefined }),
                300,
            );
            return () => clearTimeout(timeout);
        },
        [applyFilters],
    );

    return (
        <AuthenticatedLayout
            title="Zakázky"
            breadcrumbs={[{ label: 'Zakázky' }]}
        >
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-[#F5F0E8]">
                        Zakázky
                    </h1>
                    <Button
                        className="bg-[#D97706] text-white hover:bg-[#B45309]"
                        onClick={() => setShowCreate(true)}
                    >
                        <Plus className="h-4 w-4" />
                        Nová zakázka
                    </Button>
                </div>

                <DataTable<Order>
                    columns={columns}
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
                    onRowClick={(o) => router.visit(`/zakazky/${o.id}`)}
                    toolbar={
                        <div className="flex gap-2">
                            <Select
                                value={filters.status ?? 'all'}
                                onValueChange={(v) =>
                                    applyFilters({
                                        status:
                                            v === 'all' ? undefined : v,
                                    })
                                }
                            >
                                <SelectTrigger className="w-[130px] border-[#F5F0E8]/[0.06] bg-[#0f0e0c]">
                                    <SelectValue placeholder="Stav" />
                                </SelectTrigger>
                                <SelectContent className="border-[#F5F0E8]/[0.06] bg-[#16140f]">
                                    <SelectItem value="all" className="focus:bg-[#0f0e0c]">
                                        Všechny stavy
                                    </SelectItem>
                                    <SelectItem value="nova" className="focus:bg-[#0f0e0c]">
                                        Nová
                                    </SelectItem>
                                    <SelectItem value="v_reseni" className="focus:bg-[#0f0e0c]">
                                        V řešení
                                    </SelectItem>
                                    <SelectItem value="hotovo" className="focus:bg-[#0f0e0c]">
                                        Hotovo
                                    </SelectItem>
                                    <SelectItem value="fakturovano" className="focus:bg-[#0f0e0c]">
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
                                <SelectTrigger className="w-[130px] border-[#F5F0E8]/[0.06] bg-[#0f0e0c]">
                                    <SelectValue placeholder="Divize" />
                                </SelectTrigger>
                                <SelectContent className="border-[#F5F0E8]/[0.06] bg-[#16140f]">
                                    <SelectItem value="all" className="focus:bg-[#0f0e0c]">
                                        Všechny divize
                                    </SelectItem>
                                    <SelectItem value="tisk" className="focus:bg-[#0f0e0c]">
                                        Tisk
                                    </SelectItem>
                                    <SelectItem value="reklama" className="focus:bg-[#0f0e0c]">
                                        Reklama
                                    </SelectItem>
                                    <SelectItem value="polepy" className="focus:bg-[#0f0e0c]">
                                        Polepy
                                    </SelectItem>
                                    <SelectItem value="montaze" className="focus:bg-[#0f0e0c]">
                                        Montáže
                                    </SelectItem>
                                    <SelectItem value="weby" className="focus:bg-[#0f0e0c]">
                                        Weby
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    }
                    emptyMessage="Žádné zakázky"
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
        </AuthenticatedLayout>
    );
}
