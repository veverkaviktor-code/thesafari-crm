import { type FormEvent } from 'react';
import { router, type InertiaFormProps } from '@inertiajs/react';
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
import { FieldError } from '@/components/ui/FieldError';
import CustomerCombobox from '@/components/ui/CustomerCombobox';

export interface OrderFormData {
    customer_id: string;
    division: string[];
    title: string;
    description: string;
    price: string;
    deadline: string;
}

export const defaultOrderData: OrderFormData = {
    customer_id: '',
    division: [],
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

import { allDivisions } from '@/components/orders/DivisionBadge';

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
            router.visit('/zakazky');
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
                        <CustomerCombobox
                            customers={customers}
                            value={data.customer_id}
                            onChange={(v) => setData('customer_id', v)}
                        />
                        <FieldError error={errors.customer_id} />
                    </div>

                    {/* Division multi-select */}
                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground">Divize *</Label>
                        <div className="flex flex-wrap gap-2">
                            {allDivisions.map((d) => {
                                const selected = data.division.includes(d.value);
                                return (
                                    <button
                                        key={d.value}
                                        type="button"
                                        onClick={() => {
                                            const next = selected
                                                ? data.division.filter((v) => v !== d.value)
                                                : [...data.division, d.value];
                                            setData('division', next);
                                        }}
                                        className={cn(
                                            'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                                            selected
                                                ? 'border-primary bg-primary/15 text-primary'
                                                : 'border-border bg-accent text-muted-foreground hover:border-primary/50',
                                        )}
                                    >
                                        {d.label}
                                    </button>
                                );
                            })}
                        </div>
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

