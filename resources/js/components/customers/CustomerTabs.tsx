import { router } from '@inertiajs/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DataTable, { type Column } from '@/components/ui/DataTable';
import StatusBadge, { type Status } from '@/components/ui/StatusBadge';

/* ──── Shared types ──── */

interface Order {
    id: number;
    title: string;
    status: Status;
    total_price: number;
    created_at: string;
}

interface Invoice {
    id: number;
    number: string;
    status: Status;
    amount: number;
    due_date: string;
}

interface Requirement {
    id: number;
    subject: string;
    status: Status;
    priority: string;
    created_at: string;
}

interface FileItem {
    id: number;
    name: string;
    size: string;
    uploaded_at: string;
}

interface Props {
    orders: Order[];
    invoices: Invoice[];
    requirements: Requirement[];
    files: FileItem[];
}

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
    }).format(v);

const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('cs-CZ');

/* ──── Column definitions ──── */

const orderColumns: Column<Order>[] = [
    {
        key: 'title',
        label: 'Název',
        render: (o) => <span className="font-medium text-white">{o.title}</span>,
    },
    {
        key: 'status',
        label: 'Stav',
        render: (o) => <StatusBadge status={o.status} />,
    },
    {
        key: 'total_price',
        label: 'Cena',
        render: (o) => <span className="text-[#9C9585]">{formatCurrency(o.total_price)}</span>,
    },
    {
        key: 'created_at',
        label: 'Vytvořeno',
        render: (o) => <span className="text-[#6B6560]">{formatDate(o.created_at)}</span>,
    },
];

const invoiceColumns: Column<Invoice>[] = [
    {
        key: 'number',
        label: 'Číslo',
        render: (i) => <span className="font-medium text-white">{i.number}</span>,
    },
    {
        key: 'status',
        label: 'Stav',
        render: (i) => <StatusBadge status={i.status} />,
    },
    {
        key: 'amount',
        label: 'Částka',
        render: (i) => <span className="text-[#9C9585]">{formatCurrency(i.amount)}</span>,
    },
    {
        key: 'due_date',
        label: 'Splatnost',
        render: (i) => <span className="text-[#6B6560]">{formatDate(i.due_date)}</span>,
    },
];

const requirementColumns: Column<Requirement>[] = [
    {
        key: 'subject',
        label: 'Předmět',
        render: (r) => <span className="font-medium text-white">{r.subject}</span>,
    },
    {
        key: 'status',
        label: 'Stav',
        render: (r) => <StatusBadge status={r.status} />,
    },
    {
        key: 'priority',
        label: 'Priorita',
        render: (r) => <span className="text-[#9C9585]">{r.priority}</span>,
    },
    {
        key: 'created_at',
        label: 'Vytvořeno',
        render: (r) => <span className="text-[#6B6560]">{formatDate(r.created_at)}</span>,
    },
];

const fileColumns: Column<FileItem>[] = [
    {
        key: 'name',
        label: 'Soubor',
        render: (f) => <span className="font-medium text-white">{f.name}</span>,
    },
    {
        key: 'size',
        label: 'Velikost',
        render: (f) => <span className="text-[#9C9585]">{f.size}</span>,
    },
    {
        key: 'uploaded_at',
        label: 'Nahráno',
        render: (f) => <span className="text-[#6B6560]">{formatDate(f.uploaded_at)}</span>,
    },
];

export default function CustomerTabs({
    orders,
    invoices,
    requirements,
    files,
}: Props) {
    return (
        <Tabs defaultValue="orders" className="rounded-xl border border-[#F5F0E8]/[0.05] bg-[#16140f]">
            <TabsList className="w-full justify-start border-b border-[#F5F0E8]/[0.05] bg-transparent px-4 pt-2">
                <TabsTrigger
                    value="orders"
                    className="text-[#9C9585] data-[state=active]:border-b-2 data-[state=active]:border-[#D97706] data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                    Zakázky ({orders.length})
                </TabsTrigger>
                <TabsTrigger
                    value="invoices"
                    className="text-[#9C9585] data-[state=active]:border-b-2 data-[state=active]:border-[#D97706] data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                    Faktury ({invoices.length})
                </TabsTrigger>
                <TabsTrigger
                    value="requirements"
                    className="text-[#9C9585] data-[state=active]:border-b-2 data-[state=active]:border-[#D97706] data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                    Požadavky ({requirements.length})
                </TabsTrigger>
                <TabsTrigger
                    value="files"
                    className="text-[#9C9585] data-[state=active]:border-b-2 data-[state=active]:border-[#D97706] data-[state=active]:text-white data-[state=active]:shadow-none"
                >
                    Soubory ({files.length})
                </TabsTrigger>
            </TabsList>

            <TabsContent value="orders" className="mt-0">
                <DataTable<Order>
                    columns={orderColumns}
                    data={orders}
                    onRowClick={(o) => router.visit(`/zakazky/${o.id}`)}
                    emptyMessage="Žádné zakázky"
                />
            </TabsContent>

            <TabsContent value="invoices" className="mt-0">
                <DataTable<Invoice>
                    columns={invoiceColumns}
                    data={invoices}
                    onRowClick={(i) => router.visit(`/faktury/${i.id}`)}
                    emptyMessage="Žádné faktury"
                />
            </TabsContent>

            <TabsContent value="requirements" className="mt-0">
                <DataTable<Requirement>
                    columns={requirementColumns}
                    data={requirements}
                    onRowClick={(r) => router.visit(`/pozadavky/${r.id}`)}
                    emptyMessage="Žádné požadavky"
                />
            </TabsContent>

            <TabsContent value="files" className="mt-0">
                <DataTable<FileItem>
                    columns={fileColumns}
                    data={files}
                    emptyMessage="Žádné soubory"
                />
            </TabsContent>
        </Tabs>
    );
}
