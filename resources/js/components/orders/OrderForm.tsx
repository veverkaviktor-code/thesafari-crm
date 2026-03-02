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
            <div className="rounded-xl border border-white/5 bg-[#1a1a22] p-6">
                <h3 className="mb-4 text-sm font-semibold text-gray-300">
                    Základní údaje
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Customer select */}
                    <div className="space-y-1.5">
                        <Label className="text-gray-400">Zákazník *</Label>
                        <Select
                            value={data.customer_id}
                            onValueChange={(v) => setData('customer_id', v)}
                        >
                            <SelectTrigger className="w-full border-white/10 bg-white/5">
                                <SelectValue placeholder="Vyberte zákazníka..." />
                            </SelectTrigger>
                            <SelectContent className="border-white/10 bg-[#1a1a22]">
                                {customers.map((c) => (
                                    <SelectItem
                                        key={c.id}
                                        value={String(c.id)}
                                        className="focus:bg-white/5"
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
                        <Label className="text-gray-400">Divize *</Label>
                        <Select
                            value={data.division}
                            onValueChange={(v) => setData('division', v)}
                        >
                            <SelectTrigger className="w-full border-white/10 bg-white/5">
                                <SelectValue placeholder="Vyberte divizi..." />
                            </SelectTrigger>
                            <SelectContent className="border-white/10 bg-[#1a1a22]">
                                {divisions.map((d) => (
                                    <SelectItem
                                        key={d.value}
                                        value={d.value}
                                        className="focus:bg-white/5"
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
            <div className="rounded-xl border border-white/5 bg-[#1a1a22] p-6">
                <h3 className="mb-4 text-sm font-semibold text-gray-300">
                    Detail zakázky
                </h3>
                <div className="space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-gray-400">Název zakázky *</Label>
                        <Input
                            value={data.title}
                            onChange={(e) => setData('title', e.target.value)}
                            placeholder="Např. Polep firemní dodávky"
                            className="border-white/10 bg-white/5"
                            aria-invalid={!!errors.title}
                        />
                        <FieldError error={errors.title} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-gray-400">Popis</Label>
                        <Textarea
                            value={data.description}
                            onChange={(e) =>
                                setData('description', e.target.value)
                            }
                            placeholder="Podrobnosti k zakázce..."
                            className="min-h-24 border-white/10 bg-white/5"
                        />
                        <FieldError error={errors.description} />
                    </div>
                </div>
            </div>

            {/* Price + Deadline */}
            <div className="rounded-xl border border-white/5 bg-[#1a1a22] p-6">
                <h3 className="mb-4 text-sm font-semibold text-gray-300">
                    Cena a termín
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                        <Label className="text-gray-400">Cena (Kč)</Label>
                        <div className="relative">
                            <Input
                                value={data.price}
                                onChange={(e) =>
                                    setData('price', e.target.value)
                                }
                                type="number"
                                min="0"
                                step="1"
                                placeholder="0"
                                className="border-white/10 bg-white/5 pr-10"
                                aria-invalid={!!errors.price}
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                                Kč
                            </span>
                        </div>
                        <FieldError error={errors.price} />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-gray-400">Deadline</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className={cn(
                                        'w-full justify-start border-white/10 bg-white/5 text-left font-normal',
                                        !data.deadline && 'text-gray-500',
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                                    {deadlineDate
                                        ? format(deadlineDate, 'd. MMMM yyyy', {
                                              locale: cs,
                                          })
                                        : 'Vyberte datum...'}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-auto border-white/10 bg-[#1a1a22] p-0"
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
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3">
                <Button
                    type="button"
                    variant="ghost"
                    className="text-gray-400 hover:text-white"
                    onClick={handleCancel}
                >
                    Zrušit
                </Button>
                <Separator orientation="vertical" className="h-6 bg-white/10" />
                <Button
                    type="submit"
                    disabled={processing}
                    className="bg-[#D97706] text-white hover:bg-[#B45309]"
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
