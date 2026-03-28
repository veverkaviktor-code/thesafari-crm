import { type FormEvent, useEffect, useState, useRef } from 'react';
import { type InertiaFormProps, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarIcon, X, Globe } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export interface DomainFormData {
    name: string;
    customer_id: string;
    hosting_id: string;
    registrar: string;
    expires_at: string;
    is_registered_by_us: boolean;
    sell_yearly: string;
    cost_yearly: string;
    auto_invoice: boolean;
    status: string;
    notes: string;
}

export const defaultDomainData: DomainFormData = {
    name: '',
    customer_id: '',
    hosting_id: '',
    registrar: 'vas-hosting',
    expires_at: '',
    is_registered_by_us: true,
    sell_yearly: '',
    cost_yearly: '',
    auto_invoice: false,
    status: 'aktivni',
    notes: '',
};

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface HostingOption {
    id: number;
    name: string;
}

interface DomainFormProps {
    form: InertiaFormProps<DomainFormData>;
    onSubmit: (e: FormEvent) => void;
    submitLabel: string;
    customers: Customer[];
    hostings?: HostingOption[];
    onCancel?: () => void;
}

/**
 * Parse Czech date string (e.g. "27.1.2027", "27. 1. 2027", "27/1/2027")
 * Returns ISO date string (yyyy-MM-dd) or null if invalid.
 */
function parseCzechDate(input: string): string | null {
    const cleaned = input.replace(/\s/g, '');
    const match = cleaned.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
    if (!match) return null;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    if (month < 1 || month > 12 || day < 1 || day > 31 || year < 2000 || year > 2100) return null;

    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;

    return format(date, 'yyyy-MM-dd');
}

function DatePickerField({
    label,
    value,
    onChange,
    onClear,
    error,
}: {
    label: string;
    value: string;
    onChange: (date: string) => void;
    onClear?: () => void;
    error?: string;
}) {
    const [textValue, setTextValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [parseError, setParseError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!isTyping) {
            setTextValue(value ? format(new Date(value), 'd. M. yyyy', { locale: cs }) : '');
            setParseError(false);
        }
    }, [value, isTyping]);

    const handleTextChange = (text: string) => {
        setIsTyping(true);
        setTextValue(text);
        setParseError(false);

        if (text.trim() === '') {
            onClear?.();
            return;
        }

        const parsed = parseCzechDate(text);
        if (parsed) {
            onChange(parsed);
            setParseError(false);
        }
    };

    const handleBlur = () => {
        setIsTyping(false);
        if (textValue.trim() && !parseCzechDate(textValue)) {
            setParseError(true);
        } else {
            setParseError(false);
            if (value) {
                setTextValue(format(new Date(value), 'd. M. yyyy', { locale: cs }));
            }
        }
    };

    return (
        <div>
            <Label className="text-muted-foreground">{label}</Label>
            <div className="mt-1.5 flex gap-1.5">
                <div className="relative flex-1">
                    <Input
                        ref={inputRef}
                        value={textValue}
                        placeholder="27. 1. 2027"
                        className={`bg-muted border-border text-foreground pr-8 ${parseError ? 'border-red-500 focus-visible:ring-red-500/50' : ''}`}
                        onFocus={() => setIsTyping(true)}
                        onChange={(e) => handleTextChange(e.target.value)}
                        onBlur={handleBlur}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                (e.target as HTMLInputElement).blur();
                            }
                        }}
                    />
                    {value && onClear && (
                        <span
                            role="button"
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent cursor-pointer"
                            onClick={() => { onClear(); setTextValue(''); setParseError(false); }}
                            title="Bez expirace"
                        >
                            <X className="h-3.5 w-3.5" />
                        </span>
                    )}
                </div>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="icon"
                            className="shrink-0 bg-muted border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                            <CalendarIcon className="h-4 w-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-card border-border">
                        <Calendar
                            mode="single"
                            selected={value ? new Date(value) : undefined}
                            onSelect={(d) => {
                                if (d) {
                                    setIsTyping(false);
                                    onChange(format(d, 'yyyy-MM-dd'));
                                }
                            }}
                            locale={cs}
                        />
                    </PopoverContent>
                </Popover>
            </div>
            {parseError && <p className="mt-1 text-xs text-red-400">Neplatné datum — použij formát d.M.rrrr</p>}
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
    );
}

const registrarConfig: Record<string, { label: string; className: string }> = {
    'vas-hosting': { label: 'vas-hosting', className: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
    wedos: { label: 'Wedos', className: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
    external: { label: 'Externí', className: 'bg-muted text-muted-foreground border-border' },
};

export default function DomainForm({
    form,
    onSubmit,
    submitLabel,
    customers,
    hostings = [],
    onCancel,
}: DomainFormProps) {
    const { data, setData, errors, processing } = form;

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            router.visit('/domeny');
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            {/* Základní údaje */}
            <div className="space-y-4">
                <div className="flex items-center gap-2 pb-1">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-semibold text-foreground">Základní údaje</h3>
                </div>

                {/* Název domény */}
                <div>
                    <Label className="text-muted-foreground">Název domény *</Label>
                    <Input
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="example.cz"
                        className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                </div>

                {/* Zákazník */}
                <div>
                    <Label className="text-muted-foreground">Zákazník</Label>
                    <Select
                        value={data.customer_id}
                        onValueChange={(v) => setData('customer_id', v === '_none' ? '' : v)}
                    >
                        <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                            <SelectValue placeholder="Vyberte zákazníka" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="_none">— Bez zákazníka —</SelectItem>
                            {customers.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                    {c.company ? `${c.name} (${c.company})` : c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.customer_id && <p className="mt-1 text-xs text-red-400">{errors.customer_id}</p>}
                </div>

                {/* Registrátor */}
                <div>
                    <Label className="text-muted-foreground">Registrátor</Label>
                    <Select
                        value={data.registrar}
                        onValueChange={(v) => setData('registrar', v)}
                    >
                        <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            {Object.entries(registrarConfig).map(([value, config]) => (
                                <SelectItem key={value} value={value}>
                                    <div className="flex items-center gap-2">
                                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.className}`}>
                                            {config.label}
                                        </span>
                                    </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.registrar && <p className="mt-1 text-xs text-red-400">{errors.registrar}</p>}
                </div>

                {/* Expirace */}
                <DatePickerField
                    label="Expirace"
                    value={data.expires_at}
                    onChange={(date) => setData('expires_at', date)}
                    onClear={() => setData('expires_at', '')}
                    error={errors.expires_at}
                />

                {/* Registrujeme my */}
                <div className="flex items-center gap-3 py-1">
                    <Switch
                        checked={data.is_registered_by_us}
                        onCheckedChange={(v) => setData('is_registered_by_us', v)}
                    />
                    <Label className="text-muted-foreground">Registrujeme my</Label>
                </div>

                {/* Ceny — pouze pokud registrujeme my */}
                {data.is_registered_by_us && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground">Prodejní cena roční (Kč)</Label>
                            <Input
                                type="number"
                                value={data.sell_yearly}
                                onChange={(e) => setData('sell_yearly', e.target.value)}
                                placeholder="300"
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                            {errors.sell_yearly && <p className="mt-1 text-xs text-red-400">{errors.sell_yearly}</p>}
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Nákladová cena roční (Kč)</Label>
                            <Input
                                type="number"
                                value={data.cost_yearly}
                                onChange={(e) => setData('cost_yearly', e.target.value)}
                                placeholder="223"
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                            {errors.cost_yearly && <p className="mt-1 text-xs text-red-400">{errors.cost_yearly}</p>}
                        </div>
                    </div>
                )}

                {/* Hosting */}
                {hostings.length > 0 && (
                    <div>
                        <Label className="text-muted-foreground">Hosting</Label>
                        <Select
                            value={data.hosting_id}
                            onValueChange={(v) => setData('hosting_id', v === '_none' ? '' : v)}
                        >
                            <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                                <SelectValue placeholder="— Bez hostingu (samostatná doména) —" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="_none">— Bez hostingu (samostatná doména) —</SelectItem>
                                {hostings.map((h) => (
                                    <SelectItem key={h.id} value={String(h.id)}>
                                        {h.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.hosting_id && <p className="mt-1 text-xs text-red-400">{errors.hosting_id}</p>}
                    </div>
                )}

                {/* Auto-fakturace */}
                <div className="flex items-center gap-3 py-1">
                    <Switch
                        checked={data.auto_invoice}
                        onCheckedChange={(v) => setData('auto_invoice', v)}
                    />
                    <Label className="text-muted-foreground">Auto-fakturace</Label>
                </div>

                {/* Stav */}
                <div>
                    <Label className="text-muted-foreground">Stav</Label>
                    <Select
                        value={data.status}
                        onValueChange={(v) => setData('status', v)}
                    >
                        <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="aktivni">Aktivní</SelectItem>
                            <SelectItem value="pozastaveno">Pozastaveno</SelectItem>
                            <SelectItem value="zruseno">Zrušeno</SelectItem>
                        </SelectContent>
                    </Select>
                    {errors.status && <p className="mt-1 text-xs text-red-400">{errors.status}</p>}
                </div>

                {/* Poznámky */}
                <div>
                    <Label className="text-muted-foreground">Poznámky</Label>
                    <Textarea
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                        rows={3}
                        placeholder="Volitelné poznámky..."
                        className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none"
                    />
                    {errors.notes && <p className="mt-1 text-xs text-red-400">{errors.notes}</p>}
                </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancel}
                    className="text-muted-foreground hover:text-foreground"
                >
                    Zrušit
                </Button>
                <Button
                    type="submit"
                    disabled={processing}
                    className="bg-primary hover:bg-primary/80 text-white"
                >
                    {processing ? 'Ukládám...' : submitLabel}
                </Button>
            </div>
        </form>
    );
}
