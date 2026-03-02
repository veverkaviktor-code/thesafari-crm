import { type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import InvoiceItemsEditor, {
    type InvoiceItemRow,
} from '@/components/invoices/InvoiceItemsEditor';
import InvoicePreview from '@/components/invoices/InvoicePreview';
import { cn } from '@/lib/utils';

interface InvoiceItem {
    id: number;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
}

interface Invoice {
    id: number;
    invoice_number: string;
    customer_id: number;
    order_id: number | null;
    issue_date: string;
    due_date: string;
    payment_method: string;
    notes: string | null;
    items: InvoiceItem[];
}

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface Order {
    id: number;
    title: string;
    price: number;
    customer_id: number;
}

interface Props {
    invoice: Invoice;
    customers: Customer[];
    orders: Order[];
}

interface FormData {
    customer_id: string;
    order_id: string;
    issue_date: string;
    due_date: string;
    payment_method: string;
    notes: string;
    items: InvoiceItemRow[];
}

export default function Edit({ invoice, customers, orders }: Props) {
    const form = useForm<FormData>({
        customer_id: String(invoice.customer_id),
        order_id: invoice.order_id ? String(invoice.order_id) : '',
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        payment_method: invoice.payment_method,
        notes: invoice.notes ?? '',
        items: invoice.items.map((item) => ({
            description: item.description,
            quantity: String(item.quantity),
            unit: item.unit,
            unit_price: String(item.unit_price),
        })),
    });

    const { data, setData, errors, processing } = form;

    const filteredOrders = data.customer_id
        ? orders.filter((o) => o.customer_id === Number(data.customer_id))
        : orders;

    const selectedCustomer = customers.find(
        (c) => c.id === Number(data.customer_id),
    );

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.put(`/faktury/${invoice.id}`);
    };

    const issueDateObj = data.issue_date ? new Date(data.issue_date) : undefined;
    const dueDateObj = data.due_date ? new Date(data.due_date) : undefined;

    return (
        <AuthenticatedLayout
            title={`Upravit: ${invoice.invoice_number}`}
            breadcrumbs={[
                { label: 'Faktury', href: '/faktury' },
                {
                    label: invoice.invoice_number,
                    href: `/faktury/${invoice.id}`,
                },
                { label: 'Upravit' },
            ]}
        >
            <form onSubmit={handleSubmit}>
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="space-y-6 lg:col-span-2">
                        {/* Basic info */}
                        <div className="rounded-xl border border-white/5 bg-[#1a1a22] p-6">
                            <h3 className="mb-4 text-sm font-semibold text-gray-300">
                                Základní údaje
                            </h3>
                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-1.5">
                                    <Label className="text-gray-400">Zákazník *</Label>
                                    <Select
                                        value={data.customer_id}
                                        onValueChange={(v) => {
                                            setData('customer_id', v);
                                            setData('order_id', '');
                                        }}
                                    >
                                        <SelectTrigger className="w-full border-white/10 bg-white/5">
                                            <SelectValue placeholder="Vyberte zákazníka..." />
                                        </SelectTrigger>
                                        <SelectContent className="border-white/10 bg-[#1a1a22]">
                                            {customers.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)} className="focus:bg-white/5">
                                                    {c.name}{c.company ? ` (${c.company})` : ''}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FieldError error={errors.customer_id} />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-gray-400">Zakázka</Label>
                                    <Select
                                        value={data.order_id}
                                        onValueChange={(v) => setData('order_id', v)}
                                    >
                                        <SelectTrigger className="w-full border-white/10 bg-white/5">
                                            <SelectValue placeholder="Bez zakázky" />
                                        </SelectTrigger>
                                        <SelectContent className="border-white/10 bg-[#1a1a22]">
                                            {filteredOrders.map((o) => (
                                                <SelectItem key={o.id} value={String(o.id)} className="focus:bg-white/5">
                                                    {o.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-gray-400">Datum vystavení</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn('w-full justify-start border-white/10 bg-white/5 text-left font-normal', !data.issue_date && 'text-gray-500')}>
                                                <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                                                {issueDateObj ? format(issueDateObj, 'd. MMMM yyyy', { locale: cs }) : 'Vyberte datum...'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto border-white/10 bg-[#1a1a22] p-0" align="start">
                                            <Calendar mode="single" selected={issueDateObj} onSelect={(date) => setData('issue_date', date ? format(date, 'yyyy-MM-dd') : '')} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-gray-400">Datum splatnosti</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn('w-full justify-start border-white/10 bg-white/5 text-left font-normal', !data.due_date && 'text-gray-500')}>
                                                <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                                                {dueDateObj ? format(dueDateObj, 'd. MMMM yyyy', { locale: cs }) : 'Vyberte datum...'}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto border-white/10 bg-[#1a1a22] p-0" align="start">
                                            <Calendar mode="single" selected={dueDateObj} onSelect={(date) => setData('due_date', date ? format(date, 'yyyy-MM-dd') : '')} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-gray-400">Způsob platby</Label>
                                    <Select value={data.payment_method} onValueChange={(v) => setData('payment_method', v)}>
                                        <SelectTrigger className="w-full border-white/10 bg-white/5">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="border-white/10 bg-[#1a1a22]">
                                            <SelectItem value="banka" className="focus:bg-white/5">Bankovní převod</SelectItem>
                                            <SelectItem value="hotovost" className="focus:bg-white/5">Hotovost</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-1.5 md:col-span-2">
                                    <Label className="text-gray-400">Poznámky</Label>
                                    <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} placeholder="Poznámky k faktuře..." className="min-h-16 border-white/10 bg-white/5" />
                                </div>
                            </div>
                        </div>

                        <InvoiceItemsEditor
                            items={data.items}
                            onChange={(items) => setData('items', items)}
                        />

                        <div className="flex items-center justify-end gap-3">
                            <Button type="button" variant="ghost" className="text-gray-400 hover:text-white" onClick={() => window.history.back()}>
                                Zrušit
                            </Button>
                            <Separator orientation="vertical" className="h-6 bg-white/10" />
                            <Button type="submit" disabled={processing} className="bg-[#D97706] text-white hover:bg-[#B45309]">
                                {processing ? 'Ukládám...' : 'Uložit změny'}
                            </Button>
                        </div>
                    </div>

                    <div>
                        <InvoicePreview
                            invoiceNumber={invoice.invoice_number}
                            customerName={selectedCustomer?.name}
                            issueDate={data.issue_date}
                            dueDate={data.due_date}
                            paymentMethod={data.payment_method}
                            items={data.items}
                            notes={data.notes}
                        />
                    </div>
                </div>
            </form>
        </AuthenticatedLayout>
    );
}

function FieldError({ error }: { error?: string }) {
    if (!error) return null;
    return <p className="text-xs text-red-400">{error}</p>;
}
