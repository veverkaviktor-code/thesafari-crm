import { type FormEvent } from 'react';
import { type InertiaFormProps } from '@inertiajs/react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';

export interface OrderFormData {
    customer_id: string;
    division: string;
    title: string;
    description: string;
    price: string;
    deadline: string;
}

export const defaultOrderData: OrderFormData = {
    customer_id: '',
    division: '',
    title: '',
    description: '',
    price: '',
    deadline: '',
};

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface Props {
    form: InertiaFormProps<OrderFormData>;
    onSubmit: (e: FormEvent) => void;
    submitLabel: string;
    customers: Customer[];
    onCancel?: () => void;
}

const divisions = [
    { value: 'tisk', label: 'Tisk' },
    { value: 'reklama', label: 'Reklama' },
    { value: 'polepy', label: 'Polepy' },
    { value: 'montaze', label: 'Montáže' },
    { value: 'weby', label: 'Weby' },
];

export default function OrderForm({
    form,
    onSubmit,
    submitLabel,
    customers,
    onCancel,
}: Props) {
    const { data, setData, errors, processing } = form;

    const deadlineDate = data.deadline ? new Date(data.deadline) : undefined;

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            window.history.back();
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            {/* Customer + Division */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="mb-4 text-sm font-semibold text-foreground/70">
                    Základní údaje
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Customer select */}
                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground">Zákazník *</Label>
                        <Select
                            value={data.customer_id}
                            onValueChange={(v) => setData('customer_id', v)}
                        >
                            <SelectTrigger className="w-full border-border bg-accent">
                                <SelectValue placeholder="Vyberte zákazníka..." />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-card">
                                {customers.map((c) => (
                                    <SelectItem
                                        key={c.id}
                                        value={String(c.id)}
                                        className="focus:bg-accent"
                                    >
                                        {c.name}
                                        {c.company ? ` (${c.company})` : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FieldError error={errors.customer_id} />
                    </div>

                    {/* Division select */}
                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground">Divize *</Label>
                        <Select
                            value={data.division}
                            onValueChange={(v) => setData('division', v)}
                        >
                            <SelectTrigger className="w-full border-border bg-accent">
                                <SelectValue placeholder="Vyberte divizi..." />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-card">
                                {divisions.map((d) => (
                                    <SelectItem
                                        key={d.value}
                                        value={d.value}
                                        className="focus:bg-accent"
                                    >
                                        {d.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <FieldError error={errors.division} />
                    </div>
                </div>
            </div>

            {/* Title + Description */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="mb-4 text-sm font-semibold text-foreground/70">
                    Detail zakázky
                </h3>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground">Název zakázky *</Label>
                        <Input
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            placeholder="Např. Polep firemní dodávky"
                            className="border-border bg-accent"
                            aria-invalid={!!errors.title}
                        />
                        <FieldError error={errors.title} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground">Popis</Label>
                        <Textarea
                            value={data.description}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
                            placeholder="Podrobnosti k zakázce..."
                            className="min-h-24 border-border bg-accent"
                        />
                        <FieldError error={errors.description} />
                    </div>
                </div>
            </div>

            {/* Deadline */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="mb-4 text-sm font-semibold text-foreground/70">
                    Termín
                </h3>
                <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Deadline</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className={cn(
                                    'w-full justify-start border-border bg-accent text-left font-normal',
                                    !data.deadline && 'text-muted-foreground',
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                                {deadlineDate
                                    ? format(deadlineDate, 'd. MMMM yyyy', {
                                          locale: cs,
                                      })
                                    : 'Vyberte datum...'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent
                            className="w-auto border-border bg-card p-0"
                            align="start"
                        >
                            <Calendar
                                mode="single"
                                selected={deadlineDate}
                                onSelect={(date) =>
                                    setData(
                                        'deadline',
                                        date
                                            ? format(date, 'yyyy-MM-dd')
                                            : '',
                                    )
                                }
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                    <FieldError error={errors.deadline} />
                </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3">
                <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleCancel}
                >
                    Zrušit
                </Button>
                <Separator orientation="vertical" className="h-6 bg-border" />
                <Button
                    type="submit"
                    disabled={processing}
                    className="bg-primary text-white hover:bg-primary/80"
                >
                    {processing ? 'Ukládám...' : submitLabel}
                </Button>
            </div>
        </form>
    );
}

function FieldError({ error }: { error?: string }) {
    if (!error) return null;
    return <p className="text-xs text-red-400">{error}</p>;
}
