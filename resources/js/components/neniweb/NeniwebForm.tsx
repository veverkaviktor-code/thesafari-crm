import { type FormEvent } from 'react';
import { type InertiaFormProps } from '@inertiajs/react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarIcon, X } from 'lucide-react';
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

export interface NeniwebFormData {
    type: string;
    customer_id: string;
    name: string;
    provider: string;
    server: string;
    storage_quota_mb: string;
    price_yearly: string;
    cost_yearly: string;
    sell_yearly: string;
    billing_cycle: string;
    monthly_price: string;
    monthly_plan: string;
    starts_at: string;
    expires_at: string;
    auto_renew: boolean;
    is_free: boolean;
    is_external: boolean;
    status: string;
    notes: string;
}

export const defaultNeniwebData: NeniwebFormData = {
    type: 'domena',
    customer_id: '',
    name: '',
    provider: '',
    server: '',
    storage_quota_mb: '',
    price_yearly: '',
    cost_yearly: '',
    sell_yearly: '',
    billing_cycle: 'yearly',
    monthly_price: '',
    monthly_plan: '',
    starts_at: format(new Date(), 'yyyy-MM-dd'),
    expires_at: '',
    auto_renew: true,
    is_free: false,
    is_external: false,
    status: 'aktivni',
    notes: '',
};

const PLAN_OPTIONS = [
    { value: 'spravuji_sam', label: 'Spravuji sám', price: 0 },
    { value: 'zaklad', label: 'Základ', price: 490 },
    { value: 'klidny_spanek', label: 'Klidný spánek', price: 1490 },
    { value: 'aktivni_rozvoj', label: 'Aktivní rozvoj', price: 2990 },
    { value: 'vip_pece', label: 'VIP péče', price: 5990 },
] as const;

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface NeniwebFormProps {
    form: InertiaFormProps<NeniwebFormData>;
    onSubmit: (e: FormEvent) => void;
    submitLabel: string;
    customers: Customer[];
    onCancel?: () => void;
}

export default function NeniwebForm({
    form,
    onSubmit,
    submitLabel,
    customers,
    onCancel,
}: NeniwebFormProps) {
    const { data, setData, errors, processing } = form;

    const isDomain = data.type === 'domena';
    const isService = data.type === 'sluzba';
    const isHosting = data.type === 'hosting';
    const isMonthly = data.billing_cycle === 'monthly';

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            window.history.back();
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            {/* Type */}
            <div>
                <Label className="text-muted-foreground">Typ</Label>
                <Select
                    value={data.type}
                    onValueChange={(v) => {
                        setData('type', v);
                        if (v === 'sluzba') {
                            setData('billing_cycle', 'monthly');
                        }
                    }}
                >
                    <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                        <SelectItem value="domena">Doména</SelectItem>
                        <SelectItem value="hosting">Hosting</SelectItem>
                        <SelectItem value="sluzba">Služba (správa)</SelectItem>
                    </SelectContent>
                </Select>
                {errors.type && (
                    <p className="mt-1 text-xs text-red-400">{errors.type}</p>
                )}
            </div>

            {/* Customer */}
            <div>
                <Label className="text-muted-foreground">Zákazník</Label>
                <Select
                    value={data.customer_id}
                    onValueChange={(v) => setData('customer_id', v)}
                >
                    <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                        <SelectValue placeholder="Vyberte zákazníka" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                        {customers.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                                {c.company || c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.customer_id && (
                    <p className="mt-1 text-xs text-red-400">
                        {errors.customer_id}
                    </p>
                )}
            </div>

            {/* Name */}
            <div>
                <Label className="text-muted-foreground">
                    {isDomain ? 'Název domény' : isService ? 'Název služby' : 'Název hostingu'}
                </Label>
                <Input
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder={
                        isDomain ? 'example.cz' : isService ? 'Správa webu example.cz' : 'Hosting example.cz'
                    }
                    className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
                {errors.name && (
                    <p className="mt-1 text-xs text-red-400">{errors.name}</p>
                )}
            </div>

            {/* Provider / Server — hidden for services */}
            {!isService && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-muted-foreground">
                            {isDomain ? 'Registrár' : 'Poskytovatel'}
                        </Label>
                        <Input
                            value={data.provider}
                            onChange={(e) => setData('provider', e.target.value)}
                            placeholder={
                                isDomain ? 'WEDOS, Forpsi...' : 'WEDOS, VPS...'
                            }
                            className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    {isHosting && (
                        <div>
                            <Label className="text-muted-foreground">Server</Label>
                            <Input
                                value={data.server}
                                onChange={(e) =>
                                    setData('server', e.target.value)
                                }
                                placeholder="37.235.108.29"
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                    )}
                </div>
            )}

            {data.type === 'hosting' && (
                <div className="space-y-1.5">
                    <Label className="text-muted-foreground">Úložiště kvóta (MB)</Label>
                    <Input
                        type="number"
                        value={data.storage_quota_mb}
                        onChange={(e) => setData('storage_quota_mb', e.target.value)}
                        placeholder="např. 4096"
                        className="bg-muted border-border"
                    />
                </div>
            )}

            {/* Roční cena + Nákupní/Prodejní — hidden for services */}
            {!isService && (
                <>
                    <div>
                        <Label className="text-muted-foreground">Roční cena (Kč)</Label>
                        <Input
                            type="number"
                            value={data.price_yearly}
                            onChange={(e) => setData('price_yearly', e.target.value)}
                            placeholder={isDomain ? '250' : '1200'}
                            className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground">Nákupní cena (Kč)</Label>
                            <Input
                                type="number"
                                value={data.cost_yearly}
                                onChange={(e) => setData('cost_yearly', e.target.value)}
                                placeholder="200"
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                            {errors.cost_yearly && (
                                <p className="mt-1 text-xs text-red-400">{errors.cost_yearly}</p>
                            )}
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Prodejní cena (Kč)</Label>
                            <Input
                                type="number"
                                value={data.sell_yearly}
                                onChange={(e) => setData('sell_yearly', e.target.value)}
                                placeholder="350"
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                            {errors.sell_yearly && (
                                <p className="mt-1 text-xs text-red-400">{errors.sell_yearly}</p>
                            )}
                        </div>
                    </div>
                </>
            )}

            {/* Billing cycle — only for hosting and služba (domains are always yearly) */}
            {!isDomain && (
                <div>
                    <Label className="text-muted-foreground">Fakturační cyklus</Label>
                    <Select
                        value={data.billing_cycle}
                        onValueChange={(v) => setData('billing_cycle', v)}
                    >
                        <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            {isService ? (
                                <>
                                    <SelectItem value="monthly">Měsíčně</SelectItem>
                                    <SelectItem value="quarterly">Čtvrtletně</SelectItem>
                                    <SelectItem value="yearly">Ročně</SelectItem>
                                </>
                            ) : (
                                <>
                                    <SelectItem value="yearly">Roční</SelectItem>
                                    <SelectItem value="monthly">Měsíční</SelectItem>
                                    <SelectItem value="once">Jednorázově</SelectItem>
                                </>
                            )}
                        </SelectContent>
                    </Select>
                    {errors.billing_cycle && (
                        <p className="mt-1 text-xs text-red-400">{errors.billing_cycle}</p>
                    )}
                </div>
            )}

            {/* Service fields — package + monthly price */}
            {isService && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-muted-foreground">Balíček</Label>
                        <Select
                            value={data.monthly_plan}
                            onValueChange={(v) => {
                                setData('monthly_plan', v);
                                const plan = PLAN_OPTIONS.find((p) => p.value === v);
                                if (plan) setData('monthly_price', String(plan.price));
                            }}
                        >
                            <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                                <SelectValue placeholder="Vyberte balíček" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                {PLAN_OPTIONS.map((p) => (
                                    <SelectItem key={p.value} value={p.value}>
                                        {p.label} — {p.price} Kč/měs
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.monthly_plan && (
                            <p className="mt-1 text-xs text-red-400">{errors.monthly_plan}</p>
                        )}
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Měsíční cena (Kč)</Label>
                        <Input
                            type="number"
                            value={data.monthly_price}
                            onChange={(e) => setData('monthly_price', e.target.value)}
                            placeholder="490"
                            className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                        />
                        {errors.monthly_price && (
                            <p className="mt-1 text-xs text-red-400">{errors.monthly_price}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Monthly fields for hosting — only visible when billing_cycle = monthly and NOT service */}
            {isMonthly && !isService && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-muted-foreground">Balíček</Label>
                        <Select
                            value={data.monthly_plan}
                            onValueChange={(v) => {
                                setData('monthly_plan', v);
                                const plan = PLAN_OPTIONS.find((p) => p.value === v);
                                if (plan) setData('monthly_price', String(plan.price));
                            }}
                        >
                            <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                                <SelectValue placeholder="Vyberte balíček" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                {PLAN_OPTIONS.map((p) => (
                                    <SelectItem key={p.value} value={p.value}>
                                        {p.label} — {p.price} Kč/měs
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.monthly_plan && (
                            <p className="mt-1 text-xs text-red-400">{errors.monthly_plan}</p>
                        )}
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Měsíční cena (Kč)</Label>
                        <Input
                            type="number"
                            value={data.monthly_price}
                            onChange={(e) => setData('monthly_price', e.target.value)}
                            placeholder="490"
                            className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                        />
                        {errors.monthly_price && (
                            <p className="mt-1 text-xs text-red-400">{errors.monthly_price}</p>
                        )}
                    </div>
                </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-muted-foreground">Začátek</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="mt-1.5 w-full justify-start text-left bg-muted border-border text-foreground hover:bg-muted"
                            >
                                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                {data.starts_at
                                    ? format(
                                          new Date(data.starts_at),
                                          'd. M. yyyy',
                                          { locale: cs },
                                      )
                                    : 'Vyberte datum'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border">
                            <Calendar
                                mode="single"
                                selected={
                                    data.starts_at
                                        ? new Date(data.starts_at)
                                        : undefined
                                }
                                onSelect={(d) => {
                                    if (!d) return;
                                    setData('starts_at', format(d, 'yyyy-MM-dd'));
                                    // Auto-set expiration +1 year for yearly billing
                                    if (data.billing_cycle === 'yearly') {
                                        const exp = new Date(d);
                                        exp.setFullYear(exp.getFullYear() + 1);
                                        setData('expires_at', format(exp, 'yyyy-MM-dd'));
                                    }
                                }}
                                locale={cs}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div>
                    <Label className="text-muted-foreground">Expirace</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="mt-1.5 w-full justify-start text-left bg-muted border-border text-foreground hover:bg-muted"
                            >
                                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                <span className="flex-1 truncate">
                                    {data.expires_at
                                        ? format(
                                              new Date(data.expires_at),
                                              'd. M. yyyy',
                                              { locale: cs },
                                          )
                                        : 'Bez expirace'}
                                </span>
                                {data.expires_at && (
                                    <span
                                        role="button"
                                        className="ml-1 rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setData('expires_at', '');
                                        }}
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
                                selected={
                                    data.expires_at
                                        ? new Date(data.expires_at)
                                        : undefined
                                }
                                onSelect={(d) =>
                                    d &&
                                    setData(
                                        'expires_at',
                                        format(d, 'yyyy-MM-dd'),
                                    )
                                }
                                locale={cs}
                            />
                        </PopoverContent>
                    </Popover>
                    {errors.expires_at && (
                        <p className="mt-1 text-xs text-red-400">
                            {errors.expires_at}
                        </p>
                    )}
                </div>
            </div>

            {/* Flags + Status */}
            <div className="grid grid-cols-4 gap-4">
                <div className="flex items-center gap-3 pt-6">
                    <Switch
                        checked={data.auto_renew}
                        onCheckedChange={(v) => setData('auto_renew', v)}
                    />
                    <Label className="text-muted-foreground">Auto-renew</Label>
                </div>
                <div className="flex items-center gap-3 pt-6">
                    <Switch
                        checked={data.is_free}
                        onCheckedChange={(v) => setData('is_free', v)}
                    />
                    <Label className="text-muted-foreground">Zdarma</Label>
                </div>
                <div className="flex items-center gap-3 pt-6">
                    <Switch
                        checked={data.is_external}
                        onCheckedChange={(v) => setData('is_external', v)}
                    />
                    <Label className="text-muted-foreground">Externí</Label>
                </div>
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
                </div>
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
