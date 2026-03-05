import { type FormEvent, useCallback, useMemo, useState } from 'react';
import { Link, router, useForm } from '@inertiajs/react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
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
        key: 'customer' as any,
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
            <span className="text-foreground/70">{formatCurrency(o.price)}</span>
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

export default function Index({ orders, customers, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [showCreate, setShowCreate] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Order | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(`/zakazky/${deleteTarget.id}`, {
            onSuccess: () => {
                setDeleteTarget(null);
                setDeleting(false);
            },
            onError: () => setDeleting(false),
        });
    };

    const columns = useMemo<Column<Order>[]>(() => [
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
                    <h1 className="text-2xl font-semibold text-foreground">
                        Zakázky
                    </h1>
                    <Button
                        className="bg-primary text-white hover:bg-primary/80"
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
                                <SelectTrigger className="w-[130px] border-border bg-muted">
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
                                <SelectTrigger className="w-[130px] border-border bg-muted">
                                    <SelectValue placeholder="Divize" />
                                </SelectTrigger>
                                <SelectContent className="border-border bg-card">
                                    <SelectItem value="all" className="focus:bg-muted">
                                        Všechny divize
                                    </SelectItem>
                                    <SelectItem value="tisk" className="focus:bg-muted">
                                        Tisk
                                    </SelectItem>
                                    <SelectItem value="reklama" className="focus:bg-muted">
                                        Reklama
                                    </SelectItem>
                                    <SelectItem value="polepy" className="focus:bg-muted">
                                        Polepy
                                    </SelectItem>
                                    <SelectItem value="montaze" className="focus:bg-muted">
                                        Montáže
                                    </SelectItem>
                                    <SelectItem value="weby" className="focus:bg-muted">
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

            {/* Delete confirmation modal */}
            <GlassModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Smazat zakázku"
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Opravdu chcete smazat zakázku{' '}
                        <span className="font-semibold text-foreground">{deleteTarget?.title}</span>?
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
