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
import InvoiceStatusBadge, {
    type InvoiceStatus,
} from '@/components/invoices/InvoiceStatusBadge';

interface Invoice {
    id: number;
    invoice_number: string;
    customer: { id: number; name: string };
    issue_date: string;
    due_date: string;
    total: number;
    status: InvoiceStatus;
    payment_method: string;
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
    };
}

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
    }).format(v);

const formatDate = (d: string) => new Date(d).toLocaleDateString('cs-CZ');

function dueDateClass(dueDate: string, status: string): string {
    if (status === 'zaplacena') return 'text-[#6B6560]';
    const diff = new Date(dueDate).getTime() - Date.now();
    if (diff < 0) return 'text-red-400';
    if (diff < 7 * 24 * 60 * 60 * 1000) return 'text-amber-400';
    return 'text-[#9C9585]';
}

const columns: Column<Invoice>[] = [
    {
        key: 'invoice_number',
        label: 'Číslo',
        sortable: true,
        render: (i) => (
            <span className="font-medium text-white">{i.invoice_number}</span>
        ),
    },
    {
        key: 'customer',
        label: 'Zákazník',
        render: (i) => (
            <span className="text-[#F5F0E8]/70">{i.customer.name}</span>
        ),
    },
    {
        key: 'issue_date',
        label: 'Vystaveno',
        sortable: true,
        render: (i) => (
            <span className="text-[#9C9585]">{formatDate(i.issue_date)}</span>
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
            <span className="font-medium text-white">
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
            <span className="text-[#6B6560]">
                {i.payment_method === 'banka' ? 'Převodem' : 'Hotově'}
            </span>
        ),
    },
];

export default function Index({ invoices, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

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
            title="Faktury"
            breadcrumbs={[{ label: 'Faktury' }]}
        >
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-[#F5F0E8]">
                        Faktury
                    </h1>
                    <Button
                        asChild
                        className="bg-[#D97706] text-white hover:bg-[#B45309]"
                    >
                        <Link href="/faktury/create">
                            <Plus className="h-4 w-4" />
                            Nová faktura
                        </Link>
                    </Button>
                </div>

                <DataTable<Invoice>
                    columns={columns}
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
                    onRowClick={(i) => router.visit(`/faktury/${i.id}`)}
                    toolbar={
                        <Select
                            value={filters.status ?? 'all'}
                            onValueChange={(v) =>
                                applyFilters({
                                    status: v === 'all' ? undefined : v,
                                })
                            }
                        >
                            <SelectTrigger className="w-[140px] border-[#F5F0E8]/[0.06] bg-[#0f0e0c]">
                                <SelectValue placeholder="Stav" />
                            </SelectTrigger>
                            <SelectContent className="border-[#F5F0E8]/[0.06] bg-[#16140f]">
                                <SelectItem value="all" className="focus:bg-[#0f0e0c]">
                                    Všechny stavy
                                </SelectItem>
                                <SelectItem value="vystavena" className="focus:bg-[#0f0e0c]">
                                    Vystavena
                                </SelectItem>
                                <SelectItem value="odeslana" className="focus:bg-[#0f0e0c]">
                                    Odeslaná
                                </SelectItem>
                                <SelectItem value="zaplacena" className="focus:bg-[#0f0e0c]">
                                    Zaplacena
                                </SelectItem>
                                <SelectItem value="po_splatnosti" className="focus:bg-[#0f0e0c]">
                                    Po splatnosti
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    }
                    emptyMessage="Žádné faktury"
                />
            </div>
        </AuthenticatedLayout>
    );
}
