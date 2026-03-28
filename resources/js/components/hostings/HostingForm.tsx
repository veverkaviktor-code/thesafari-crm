import { type FormEvent, useEffect, useState, useRef } from 'react';
import { type InertiaFormProps, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarIcon, X, Globe, HardDrive, Settings } from 'lucide-react';
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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export interface HostingFormData {
    customer_id: string;
    name: string;
    server: string;
    status: string;
    notes: string;
    starts_at: string;
    auto_invoice: boolean;
    auto_invoice_management: boolean;
    is_free: boolean;
    sell_yearly: string;
    cost_yearly: string;
    admin_url: string;
    expires_at: string;
    server_id: string;
    management_plan_id: string;
    management_cycle: string;
    storage_quota_mb: string;
}

export const defaultHostingData: HostingFormData = {
    customer_id: '',
    name: '',
    server: '',
    status: 'aktivni',
    notes: '',
    starts_at: format(new Date(), 'yyyy-MM-dd'),
    auto_invoice: false,
    auto_invoice_management: false,
    is_free: false,
    sell_yearly: '',
    cost_yearly: '',
    admin_url: '',
    expires_at: '',
    server_id: '',
    management_plan_id: '',
    management_cycle: '',
    storage_quota_mb: '',
};

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface VpsServerOption {
    id: number;
    name: string;
}

interface ManagementPlanOption {
    id: number;
    name: string;
    price_monthly: number | string;
    is_active: boolean;
}

interface HostingFormProps {
    form: InertiaFormProps<HostingFormData>;
    onSubmit: (e: FormEvent) => void;
    submitLabel: string;
    customers: Customer[];
    vpsServers?: VpsServerOption[];
    managementPlans?: ManagementPlanOption[];
    onCancel?: () => void;
}

function FormSection({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 pb-1">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            </div>
            {children}
        </div>
    );
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

    // Sync text field when value changes externally (calendar pick, clear)
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
            // Re-format to nice Czech format
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

export default function HostingForm({
    form,
    onSubmit,
    submitLabel,
    customers,
    vpsServers = [],
    managementPlans = [],
    onCancel,
}: HostingFormProps) {
    const { data, setData, errors, processing } = form;

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            router.visit('/hostingy');
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-6">
            {/* Základní údaje */}
            <FormSection icon={Globe} title="Základní údaje">
                {/* Name */}
                <div>
                    <Label className="text-muted-foreground">Název (doména)</Label>
                    <Input
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        placeholder="example.cz"
                        className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                    />
                    {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                </div>

                {/* Customer */}
                <div>
                    <Label className="text-muted-foreground">Zákazník</Label>
                    <Select
                        value={data.customer_id}
                        onValueChange={(v) => setData('customer_id', v === 'none' ? '' : v)}
                    >
                        <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                            <SelectValue placeholder="Vyberte zákazníka" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="none">Bez zákazníka</SelectItem>
                            {customers.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                    {c.name}{c.company && c.company !== c.name ? ` (${c.company})` : ''}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {errors.customer_id && <p className="mt-1 text-xs text-red-400">{errors.customer_id}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Status */}
                    <div>
                        <Label className="text-muted-foreground">Stav</Label>
                        <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                            <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="aktivni">Aktivní</SelectItem>
                                <SelectItem value="pozastaveno">Pozastaveno</SelectItem>
                                <SelectItem value="zruseno">Zrušeno</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Starts at */}
                    <DatePickerField
                        label="Začátek"
                        value={data.starts_at}
                        onChange={(d) => setData('starts_at', d)}
                    />
                </div>

                {/* Admin URL */}
                <div>
                    <Label className="text-muted-foreground">Admin URL</Label>
                    <Input
                        value={data.admin_url}
                        onChange={(e) => setData('admin_url', e.target.value)}
                        placeholder="https://example.cz/wp-admin"
                        className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                    />
                </div>

                {/* Notes */}
                <div>
                    <Label className="text-muted-foreground">Poznámky</Label>
                    <Textarea
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                        rows={3}
                        className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none"
                    />
                </div>
            </FormSection>
            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-6">
            {/* Hosting */}
            <FormSection icon={HardDrive} title="Hosting">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-muted-foreground">Server</Label>
                        <Select
                            value={data.server_id || 'none'}
                            onValueChange={(v) => setData('server_id', v === 'none' ? '' : v)}
                        >
                            <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                                <SelectValue placeholder="Bez hostingu" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="none">Bez hostingu</SelectItem>
                                {vpsServers.map((vps) => (
                                    <SelectItem key={vps.id} value={String(vps.id)}>
                                        {vps.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-3 pt-7">
                        <Switch
                            checked={data.is_free}
                            onCheckedChange={(v) => setData('is_free', v)}
                        />
                        <Label className="text-muted-foreground">Hosting zdarma</Label>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DatePickerField
                        label="Expirace hostingu"
                        value={data.expires_at}
                        onChange={(d) => setData('expires_at', d)}
                        onClear={() => setData('expires_at', '')}
                        error={errors.expires_at}
                    />
                    <div>
                        <Label className="text-muted-foreground">Úložiště kvóta (MB)</Label>
                        <Input
                            type="number"
                            value={data.storage_quota_mb}
                            onChange={(e) => setData('storage_quota_mb', e.target.value)}
                            placeholder="např. 4096"
                            className="mt-1.5 bg-muted border-border"
                        />
                    </div>
                </div>

                {!data.is_free && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground">Roční náklad hostingu (Kč)</Label>
                            <Input
                                type="number"
                                value={data.cost_yearly}
                                onChange={(e) => setData('cost_yearly', e.target.value)}
                                placeholder="363"
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                            {errors.cost_yearly && <p className="mt-1 text-xs text-red-400">{errors.cost_yearly}</p>}
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Prodejní cena hostingu (Kč)</Label>
                            <Input
                                type="number"
                                value={data.sell_yearly}
                                onChange={(e) => setData('sell_yearly', e.target.value)}
                                placeholder="2050"
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                            {errors.sell_yearly && <p className="mt-1 text-xs text-red-400">{errors.sell_yearly}</p>}
                        </div>
                    </div>
                )}
            </FormSection>

            {/* Správa webu */}
            {managementPlans.length > 0 && (
                <FormSection icon={Settings} title="Správa webu">
                    <div>
                        <Label className="text-muted-foreground">Balíček správy</Label>
                        <Select
                            value={data.management_plan_id || 'none'}
                            onValueChange={(v) => setData('management_plan_id', v === 'none' ? '' : v)}
                        >
                            <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                                <SelectValue placeholder="Bez správy" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="none">Bez správy</SelectItem>
                                {managementPlans.map((p) => (
                                    <SelectItem key={p.id} value={String(p.id)}>
                                        {p.name} — {Number(p.price_monthly).toLocaleString('cs-CZ')} Kč/měs
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Fakturační cyklus správy</Label>
                        <Select
                            value={data.management_cycle || 'none'}
                            onValueChange={(v) => setData('management_cycle', v === 'none' ? '' : v)}
                        >
                            <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                                <SelectValue placeholder="Nevybráno" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="none">Nevybráno</SelectItem>
                                <SelectItem value="quarterly">Čtvrtletně</SelectItem>
                                <SelectItem value="semi_annual">Pololetně</SelectItem>
                                <SelectItem value="annual">Ročně</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </FormSection>
            )}

            </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancel}
                    className="text-muted-foreground hover:text-foreground"
                >
                    Zrušit
                </Button>
                <Separator orientation="vertical" className="h-6 bg-border" />
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
