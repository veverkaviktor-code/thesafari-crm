import { useCallback, useState } from 'react';
import { Link, router } from '@inertiajs/react';
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

interface Props {
    orders: PaginatedOrders;
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
    if (!deadline) return 'text-gray-500';
    const diff = new Date(deadline).getTime() - Date.now();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < 0) return 'text-red-400';
    if (days < 7) return 'text-amber-400';
    return 'text-gray-400';
}

const columns: Column<Order>[] = [
    {
        key: 'title',
        label: 'Zakázka',
        sortable: true,
        render: (o) => (
            <div>
                <p className="font-medium text-white">{o.title}</p>
                <p className="text-xs text-gray-500">{o.customer.name}</p>
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
            <span className="text-gray-300">{formatCurrency(o.price)}</span>
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
            <span className="text-gray-500">
                {new Date(o.created_at).toLocaleDateString('cs-CZ')}
            </span>
        ),
    },
];

export default function Index({ orders, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

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
                    <h1 className="text-2xl font-semibold text-white">
                        Zakázky
                    </h1>
                    <Button
                        asChild
                        className="bg-[#D97706] text-white hover:bg-[#B45309]"
                    >
                        <Link href="/zakazky/create">
                            <Plus className="h-4 w-4" />
                            Nová zakázka
                        </Link>
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
                                <SelectTrigger className="w-[130px] border-white/10 bg-white/5">
                                    <SelectValue placeholder="Stav" />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-[#1a1a22]">
                                    <SelectItem value="all" className="focus:bg-white/5">
                                        Všechny stavy
                                    </SelectItem>
                                    <SelectItem value="nova" className="focus:bg-white/5">
                                        Nová
                                    </SelectItem>
                                    <SelectItem value="v_reseni" className="focus:bg-white/5">
                                        V řešení
                                    </SelectItem>
                                    <SelectItem value="hotovo" className="focus:bg-white/5">
                                        Hotovo
                                    </SelectItem>
                                    <SelectItem value="fakturovano" className="focus:bg-white/5">
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
                                <SelectTrigger className="w-[130px] border-white/10 bg-white/5">
                                    <SelectValue placeholder="Divize" />
                                </SelectTrigger>
                                <SelectContent className="border-white/10 bg-[#1a1a22]">
                                    <SelectItem value="all" className="focus:bg-white/5">
                                        Všechny divize
                                    </SelectItem>
                                    <SelectItem value="tisk" className="focus:bg-white/5">
                                        Tisk
                                    </SelectItem>
                                    <SelectItem value="reklama" className="focus:bg-white/5">
                                        Reklama
                                    </SelectItem>
                                    <SelectItem value="polepy" className="focus:bg-white/5">
                                        Polepy
                                    </SelectItem>
                                    <SelectItem value="montaze" className="focus:bg-white/5">
                                        Montáže
                                    </SelectItem>
                                    <SelectItem value="weby" className="focus:bg-white/5">
                                        Weby
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    }
                    emptyMessage="Žádné zakázky"
                />
            </div>
        </AuthenticatedLayout>
    );
}
