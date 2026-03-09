import { type FormEvent, useState } from 'react';
import { useForm } from '@inertiajs/react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface Task {
    id: number;
    title: string;
    description: string | null;
    status: 'novy' | 'rozpracovany' | 'hotovy' | 'zruseny';
    priority: 'low' | 'medium' | 'high';
    due_date: string | null;
    customer_id: number | null;
    order_id: number | null;
    invoice_id: number | null;
}

interface TaskFormProps {
    task?: Task | null;
    customers: { id: number; name: string; company: string | null }[];
    orders: { id: number; title: string }[];
    invoices: { id: number; invoice_number: string }[];
    onClose: () => void;
}

export default function TaskForm({ task, customers, orders, invoices, onClose }: TaskFormProps) {
    const [calendarOpen, setCalendarOpen] = useState(false);

    const { data, setData, post, put, processing, errors } = useForm({
        title: task?.title ?? '',
        description: task?.description ?? '',
        priority: task?.priority ?? 'medium',
        status: task?.status ?? 'novy',
        due_date: task?.due_date ?? '',
        customer_id: task?.customer_id ? String(task.customer_id) : '',
        order_id: task?.order_id ? String(task.order_id) : '',
        invoice_id: task?.invoice_id ? String(task.invoice_id) : '',
    });

    const submit = (e: FormEvent) => {
        e.preventDefault();
        if (task) {
            put(`/planovac/${task.id}`, { preserveScroll: true, onSuccess: onClose });
        } else {
            post('/planovac', { preserveScroll: true, onSuccess: onClose });
        }
    };

    const selectedDate = data.due_date ? new Date(data.due_date) : undefined;

    return (
        <form onSubmit={submit} className="space-y-6">
            {/* Název – full width */}
            <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm font-medium text-foreground/80">
                    Název úkolu <span className="text-red-400">*</span>
                </Label>
                <Input
                    id="title"
                    value={data.title}
                    onChange={(e) => setData('title', e.target.value)}
                    placeholder="Název úkolu"
                    className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/30"
                />
                {errors.title && <p className="text-xs text-red-400">{errors.title}</p>}
            </div>

            {/* Popis – full width */}
            <div className="space-y-1.5">
                <Label htmlFor="description" className="text-sm font-medium text-foreground/80">
                    Popis
                </Label>
                <Textarea
                    id="description"
                    value={data.description}
                    onChange={(e) => setData('description', e.target.value)}
                    placeholder="Volitelný popis úkolu..."
                    rows={3}
                    className="border-border bg-muted text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/30 resize-none"
                />
            </div>

            {/* 2-column grid */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Priorita */}
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground/80">Priorita</Label>
                    <Select value={data.priority} onValueChange={(v) => setData('priority', v as 'low' | 'medium' | 'high')}>
                        <SelectTrigger className="border-border bg-muted text-foreground">
                            <SelectValue placeholder="Vyberte prioritu" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="low">Nízká</SelectItem>
                            <SelectItem value="medium">Střední</SelectItem>
                            <SelectItem value="high">Vysoká</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Stav */}
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground/80">Stav</Label>
                    <Select value={data.status} onValueChange={(v) => setData('status', v as 'novy' | 'rozpracovany' | 'hotovy' | 'zruseny')}>
                        <SelectTrigger className="border-border bg-muted text-foreground">
                            <SelectValue placeholder="Vyberte stav" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="novy">Nový</SelectItem>
                            <SelectItem value="rozpracovany">Rozpracovaný</SelectItem>
                            <SelectItem value="hotovy">Hotový</SelectItem>
                            <SelectItem value="zruseny">Zrušený</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Termín */}
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground/80">Termín splnění</Label>
                    <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className={cn(
                                    'flex h-9 w-full items-center gap-2 rounded-md border border-border bg-muted px-3 py-1 text-sm text-left transition-colors hover:bg-accent',
                                    !selectedDate && 'text-muted-foreground',
                                )}
                            >
                                <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                {selectedDate
                                    ? format(selectedDate, 'd. MMMM yyyy', { locale: cs })
                                    : 'Vyberte datum'}
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border" align="start">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                    setData('due_date', date ? format(date, 'yyyy-MM-dd') : '');
                                    setCalendarOpen(false);
                                }}
                                locale={cs}
                                weekStartsOn={1}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    {errors.due_date && <p className="text-xs text-red-400">{errors.due_date}</p>}
                </div>

                {/* Zákazník */}
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground/80">Zákazník</Label>
                    <Select value={data.customer_id || 'none'} onValueChange={(v) => setData('customer_id', v === 'none' ? '' : v)}>
                        <SelectTrigger className="border-border bg-muted text-foreground">
                            <SelectValue placeholder="Žádný" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="none">Žádný</SelectItem>
                            {customers.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                    {c.company ?? c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Zakázka */}
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground/80">Zakázka</Label>
                    <Select value={data.order_id || 'none'} onValueChange={(v) => setData('order_id', v === 'none' ? '' : v)}>
                        <SelectTrigger className="border-border bg-muted text-foreground">
                            <SelectValue placeholder="Žádná" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="none">Žádná</SelectItem>
                            {orders.map((o) => (
                                <SelectItem key={o.id} value={String(o.id)}>
                                    {o.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Faktura */}
                <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground/80">Faktura</Label>
                    <Select value={data.invoice_id || 'none'} onValueChange={(v) => setData('invoice_id', v === 'none' ? '' : v)}>
                        <SelectTrigger className="border-border bg-muted text-foreground">
                            <SelectValue placeholder="Žádná" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="none">Žádná</SelectItem>
                            {invoices.map((inv) => (
                                <SelectItem key={inv.id} value={String(inv.id)}>
                                    {inv.invoice_number}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
                <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={onClose}
                >
                    Zrušit
                </Button>
                <Button
                    type="submit"
                    disabled={processing}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    {task ? 'Uložit změny' : 'Vytvořit úkol'}
                </Button>
            </div>
        </form>
    );
}
