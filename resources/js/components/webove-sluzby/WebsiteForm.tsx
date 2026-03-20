import { type FormEvent, useEffect } from 'react';
import { type InertiaFormProps, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarIcon, X, Globe, HardDrive, DollarSign, Settings } from 'lucide-react';
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

export interface WebsiteFormData {
    customer_id: string;
    name: string;
    server: string;
    status: string;
    notes: string;
    starts_at: string;
    is_registered_by_us: boolean;
    auto_renew: boolean;
    auto_invoice: boolean;
    auto_invoice_management: boolean;
    is_free: boolean;
    is_external: boolean;
    sell_yearly: string;
    cost_yearly: string;
    admin_url: string;
    domain_expires_at: string;
    hosting_expires_at: string;
    hosting_server_id: string;
    alias_of_id: string;
    management_plan_id: string;
    management_cycle: string;
    storage_quota_mb: string;
}

export const defaultWebsiteData: WebsiteFormData = {
    customer_id: '',
    name: '',
    server: '',
    status: 'aktivni',
    notes: '',
    starts_at: format(new Date(), 'yyyy-MM-dd'),
    is_registered_by_us: true,
    auto_renew: true,
    auto_invoice: true,
    auto_invoice_management: false,
    is_free: false,
    is_external: false,
    sell_yearly: '',
    cost_yearly: '',
    admin_url: '',
    domain_expires_at: '',
    hosting_expires_at: '',
    hosting_server_id: '',
    alias_of_id: '',
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

interface AliasOption {
    id: number;
    name: string;
}

interface WebsiteFormProps {
    form: InertiaFormProps<WebsiteFormData>;
    onSubmit: (e: FormEvent) => void;
    submitLabel: string;
    customers: Customer[];
    vpsServers?: VpsServerOption[];
    managementPlans?: ManagementPlanOption[];
    aliasOptions?: AliasOption[];
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
    return (
        <div>
            <Label className="text-muted-foreground">{label}</Label>
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        className="mt-1.5 w-full justify-start text-left bg-muted border-border text-foreground hover:bg-muted"
                    >
                        <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="flex-1 truncate">
                            {value ? format(new Date(value), 'd. M. yyyy', { locale: cs }) : 'Bez expirace'}
                        </span>
                        {value && onClear && (
                            <span
                                role="button"
                                className="ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent"
                                onClick={(e) => { e.stopPropagation(); onClear(); }}
                                title="Bez expirace"
                            >
                                <X className="h-3.5 w-3.5" />
                            </span>
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-card border-border">
                    <Calendar
                        mode="single"
                        selected={value ? new Date(value) : undefined}
                        onSelect={(d) => d && onChange(format(d, 'yyyy-MM-dd'))}
                        locale={cs}
                    />
                </PopoverContent>
            </Popover>
            {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
        </div>
    );
}

export default function WebsiteForm({
    form,
    onSubmit,
    submitLabel,
    customers,
    vpsServers = [],
    managementPlans = [],
    aliasOptions = [],
    onCancel,
}: WebsiteFormProps) {
    const { data, setData, errors, processing } = form;

    useEffect(() => {
        if (!data.auto_renew) {
            setData('auto_invoice', false);
        }
    }, [data.auto_renew]);

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            router.visit('/webove-sluzby');
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-8">
            {/* ═══════ Zakladni udaje ═══════ */}
            <FormSection icon={Globe} title="Zakladni udaje">
                {/* Name */}
                <div>
                    <Label className="text-muted-foreground">Nazev (domena)</Label>
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
                    <Label className="text-muted-foreground">Zakaznik</Label>
                    <Select
                        value={data.customer_id}
                        onValueChange={(v) => setData('customer_id', v === 'none' ? '' : v)}
                    >
                        <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                            <SelectValue placeholder="Vyberte zakaznika" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="none">Bez zakaznika</SelectItem>
                            {customers.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                    {c.company || c.name}
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
                                <SelectItem value="aktivni">Aktivni</SelectItem>
                                <SelectItem value="pozastaveno">Pozastaveno</SelectItem>
                                <SelectItem value="zruseno">Zruseno</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Starts at */}
                    <DatePickerField
                        label="Zacatek"
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
                    <Label className="text-muted-foreground">Poznamky</Label>
                    <Textarea
                        value={data.notes}
                        onChange={(e) => setData('notes', e.target.value)}
                        rows={3}
                        className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none"
                    />
                </div>
            </FormSection>

            <Separator className="bg-border" />

            {/* ═══════ Domena ═══════ */}
            <FormSection icon={Globe} title="Domena">
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 pt-6">
                        <Switch
                            checked={data.is_registered_by_us}
                            onCheckedChange={(v) => setData('is_registered_by_us', v)}
                        />
                        <Label className="text-muted-foreground">Registrator u nas</Label>
                    </div>
                    <div className="flex items-center gap-3 pt-6">
                        <Switch
                            checked={data.auto_renew}
                            onCheckedChange={(v) => setData('auto_renew', v)}
                        />
                        <Label className="text-muted-foreground">Auto-renew</Label>
                    </div>
                </div>

                <DatePickerField
                    label="Expirace domeny"
                    value={data.domain_expires_at}
                    onChange={(d) => setData('domain_expires_at', d)}
                    onClear={() => setData('domain_expires_at', '')}
                    error={errors.domain_expires_at}
                />
            </FormSection>

            <Separator className="bg-border" />

            {/* ═══════ Hosting ═══════ */}
            <FormSection icon={HardDrive} title="Hosting">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-muted-foreground">Server (hostname)</Label>
                        <Input
                            value={data.server}
                            onChange={(e) => setData('server', e.target.value)}
                            placeholder="sss06.vas-server.cz"
                            className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    {vpsServers.length > 0 && (
                        <div>
                            <Label className="text-muted-foreground">VPS server</Label>
                            <Select
                                value={data.hosting_server_id || 'none'}
                                onValueChange={(v) => setData('hosting_server_id', v === 'none' ? '' : v)}
                            >
                                <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                                    <SelectValue placeholder="Zadny" />
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
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <DatePickerField
                        label="Expirace hostingu"
                        value={data.hosting_expires_at}
                        onChange={(d) => setData('hosting_expires_at', d)}
                        onClear={() => setData('hosting_expires_at', '')}
                        error={errors.hosting_expires_at}
                    />
                    <div>
                        <Label className="text-muted-foreground">Uloziste kvota (MB)</Label>
                        <Input
                            type="number"
                            value={data.storage_quota_mb}
                            onChange={(e) => setData('storage_quota_mb', e.target.value)}
                            placeholder="napr. 4096"
                            className="mt-1.5 bg-muted border-border"
                        />
                    </div>
                </div>
            </FormSection>

            <Separator className="bg-border" />

            {/* ═══════ Fakturace ═══════ */}
            <FormSection icon={DollarSign} title="Fakturace">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label className="text-muted-foreground">Rocni cena (Kc)</Label>
                        <Input
                            type="number"
                            value={data.sell_yearly}
                            onChange={(e) => setData('sell_yearly', e.target.value)}
                            placeholder="2050"
                            className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                        />
                        {errors.sell_yearly && <p className="mt-1 text-xs text-red-400">{errors.sell_yearly}</p>}
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Rocni naklad (Kc)</Label>
                        <Input
                            type="number"
                            value={data.cost_yearly}
                            onChange={(e) => setData('cost_yearly', e.target.value)}
                            placeholder="200"
                            className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                        />
                        {errors.cost_yearly && <p className="mt-1 text-xs text-red-400">{errors.cost_yearly}</p>}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 pt-2">
                        <Switch
                            checked={data.auto_invoice}
                            onCheckedChange={(v) => setData('auto_invoice', v)}
                            disabled={!data.auto_renew}
                        />
                        <Label className={!data.auto_renew ? 'text-muted-foreground/50' : 'text-muted-foreground'}>
                            Auto-fakturace hosting
                        </Label>
                    </div>
                </div>

                {/* Management plan + cycle */}
                {managementPlans.length > 0 && (
                    <>
                        <Separator className="bg-border !my-3" />
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sprava webu</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground">Balicek spravy</Label>
                                <Select
                                    value={data.management_plan_id || 'none'}
                                    onValueChange={(v) => setData('management_plan_id', v === 'none' ? '' : v)}
                                >
                                    <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                                        <SelectValue placeholder="Bez spravy" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="none">Bez spravy</SelectItem>
                                        {managementPlans.map((p) => (
                                            <SelectItem key={p.id} value={String(p.id)}>
                                                {p.name} \u2014 {Number(p.price_monthly).toLocaleString('cs-CZ')} Kc/mes
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {errors.management_plan_id && <p className="mt-1 text-xs text-red-400">{errors.management_plan_id}</p>}
                            </div>
                            <div>
                                <Label className="text-muted-foreground">Fakturacni cyklus spravy</Label>
                                <Select
                                    value={data.management_cycle || 'none'}
                                    onValueChange={(v) => setData('management_cycle', v === 'none' ? '' : v)}
                                >
                                    <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                                        <SelectValue placeholder="Nevybrano" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border">
                                        <SelectItem value="none">Nevybrano</SelectItem>
                                        <SelectItem value="quarterly">Ctvrtletne</SelectItem>
                                        <SelectItem value="semi_annual">Pololetne</SelectItem>
                                        <SelectItem value="annual">Rocne</SelectItem>
                                    </SelectContent>
                                </Select>
                                {errors.management_cycle && <p className="mt-1 text-xs text-red-400">{errors.management_cycle}</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <Switch
                                checked={data.auto_invoice_management}
                                onCheckedChange={(v) => setData('auto_invoice_management', v)}
                            />
                            <Label className="text-muted-foreground">Auto-fakturace sprava</Label>
                        </div>
                    </>
                )}
            </FormSection>

            <Separator className="bg-border" />

            {/* ═══════ Pokrocile ═══════ */}
            <FormSection icon={Settings} title="Pokrocile">
                {/* Alias of */}
                {aliasOptions.length > 0 && (
                    <div>
                        <Label className="text-muted-foreground">Alias webu (nadrazeny hosting)</Label>
                        <Select
                            value={data.alias_of_id || 'none'}
                            onValueChange={(v) => setData('alias_of_id', v === 'none' ? '' : v)}
                        >
                            <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                                <SelectValue placeholder="Zadny (samostatny web)" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="none">Zadny (samostatny web)</SelectItem>
                                {aliasOptions.map((opt) => (
                                    <SelectItem key={opt.id} value={String(opt.id)}>
                                        {opt.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.alias_of_id && <p className="mt-1 text-xs text-red-400">{errors.alias_of_id}</p>}
                    </div>
                )}

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 pt-2">
                        <Switch
                            checked={data.is_external}
                            onCheckedChange={(v) => setData('is_external', v)}
                        />
                        <Label className="text-muted-foreground">Je externi</Label>
                    </div>
                    <div className="flex items-center gap-3 pt-2">
                        <Switch
                            checked={data.is_free}
                            onCheckedChange={(v) => setData('is_free', v)}
                        />
                        <Label className="text-muted-foreground">Zdarma</Label>
                    </div>
                </div>
            </FormSection>

            {/* ═══════ Actions ═══════ */}
            <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancel}
                    className="text-muted-foreground hover:text-foreground"
                >
                    Zrusit
                </Button>
                <Separator orientation="vertical" className="h-6 bg-border" />
                <Button
                    type="submit"
                    disabled={processing}
                    className="bg-primary hover:bg-primary/80 text-white"
                >
                    {processing ? 'Ukladam...' : submitLabel}
                </Button>
            </div>
        </form>
    );
}
