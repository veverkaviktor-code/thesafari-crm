import { type FormEvent, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import GlassModal from '@/components/ui/GlassModal';
import ExpirationBadge from '@/components/neniweb/ExpirationBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { format, addYears, addMonths } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
    Globe,
    Server,
    ArrowLeft,
    Pencil,
    Trash2,
    Plus,
    CalendarIcon,
    RefreshCw,
    ReceiptText,
    FileText,
    Play,
    Loader2,
    Eye,
    EyeOff,
    Copy,
    Check,
} from 'lucide-react';

const czk = (amount: number) =>
    new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
    }).format(amount);

interface Payment {
    id: number;
    subscription_id: number;
    amount: number;
    period_start: string;
    period_end: string;
    status: string;
    paid_at: string | null;
    payment_method: string | null;
    notes: string | null;
}

interface Invoice {
    id: number;
    invoice_number: string;
    issue_date: string;
    due_date: string;
    status: string;
    total: number;
}

interface Subscription {
    id: number;
    type: 'hosting' | 'domena';
    name: string;
    provider: string | null;
    server: string | null;
    price_yearly: number;
    cost_yearly: number;
    sell_yearly: number;
    billing_cycle: string;
    monthly_price: number;
    monthly_plan: string | null;
    starts_at: string | null;
    expires_at: string | null;
    managed_since: string | null;
    auto_renew: boolean;
    is_free: boolean;
    status: string;
    notes: string | null;
    payments: Payment[];
    invoices: Invoice[];
    days_until_expiry: number | null;
    urgency: string;
    yearly_margin: number;
    monthly_revenue: number;
    total_annual_revenue: number;
    customer: { id: number; name: string; company: string | null } | null;
    is_registered_by_us: boolean;
    ip_address: string | null;
    storage_quota_mb: number;
    storage_used_mb: number;
    tariff: string | null;
    synced_at: string | null;
    has_linked_hosting: boolean | null;
    has_linked_domain: boolean | null;
    admin_url: string | null;
    admin_user: string | null;
    admin_password: string | null;
    client_user: string | null;
    client_password: string | null;
}

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface Props {
    subscription: Subscription;
    paymentStats: {
        total_paid: number;
        total_unpaid: number;
        payments_count: number;
    };
    customers: Customer[];
}

interface PaymentFormData {
    amount: string;
    period_start: string;
    period_end: string;
    status: string;
    payment_method: string;
    notes: string;
}

const statusMap: Record<string, { label: string; variant: 'active' | 'inactive' | 'cancelled' }> = {
    aktivni: { label: 'Aktivní', variant: 'active' },
    pozastaveno: { label: 'Pozastaveno', variant: 'inactive' },
    zruseno: { label: 'Zrušeno', variant: 'cancelled' },
};

const invoiceStatusConfig: Record<string, { label: string; className: string }> = {
    vystavena: { label: 'Vystavena', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    odeslana: { label: 'Odeslaná', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    zaplacena: { label: 'Zaplacena', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    po_splatnosti: { label: 'Po splatnosti', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    storno: { label: 'Storno', className: 'bg-muted text-muted-foreground border-border' },
};

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
    zaplaceno: {
        label: 'Zaplaceno',
        className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    nezaplaceno: {
        label: 'Nezaplaceno',
        className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    po_splatnosti: {
        label: 'Po splatnosti',
        className: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
};

function PaymentStatusBadge({ status }: { status: string }) {
    const config = paymentStatusConfig[status] ?? paymentStatusConfig.nezaplaceno;
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.className}`}>
            {config.label}
        </span>
    );
}

const billingCycleLabels: Record<string, string> = {
    yearly: 'Roční',
    monthly: 'Měsíční',
    once: 'Jednorázově',
};

const monthlyPlanLabels: Record<string, string> = {
    'klidny-spanek': 'Klidný spánek',
    vlastni: 'Vlastní',
    zadny: 'Žádný',
};

function PaymentForm({
    subscription,
    onClose,
}: {
    subscription: Subscription;
    onClose: () => void;
}) {
    const isMonthly = subscription.billing_cycle === 'monthly';
    const defaultAmount = isMonthly
        ? String(subscription.monthly_price || '')
        : String(subscription.sell_yearly || subscription.price_yearly || '');

    const defaultPeriodStart = format(new Date(), 'yyyy-MM-dd');
    const defaultPeriodEnd = isMonthly
        ? format(addMonths(new Date(), 1), 'yyyy-MM-dd')
        : format(addYears(new Date(), 1), 'yyyy-MM-dd');

    const { data, setData, post, processing, errors } = useForm<PaymentFormData>({
        amount: defaultAmount,
        period_start: defaultPeriodStart,
        period_end: defaultPeriodEnd,
        status: 'zaplaceno',
        payment_method: 'prevod',
        notes: '',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        post(`/neniweb/${subscription.id}/platby`, {
            onSuccess: () => onClose(),
        });
    };

    const isPaid = data.status === 'zaplaceno';

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Amount */}
            <div>
                <Label className="text-muted-foreground">Částka (Kč)</Label>
                <Input
                    type="number"
                    value={data.amount}
                    onChange={(e) => setData('amount', e.target.value)}
                    placeholder="0"
                    className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
                {errors.amount && (
                    <p className="mt-1 text-xs text-red-400">{errors.amount}</p>
                )}
            </div>

            {/* Period */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-muted-foreground">Období od</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="mt-1.5 w-full justify-start text-left bg-muted border-border text-foreground hover:bg-muted"
                            >
                                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                {data.period_start
                                    ? format(new Date(data.period_start), 'd. M. yyyy', { locale: cs })
                                    : 'Vyberte datum'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border">
                            <Calendar
                                mode="single"
                                selected={data.period_start ? new Date(data.period_start) : undefined}
                                onSelect={(d) => {
                                    if (!d) return;
                                    const startStr = format(d, 'yyyy-MM-dd');
                                    const endStr = isMonthly
                                        ? format(addMonths(d, 1), 'yyyy-MM-dd')
                                        : format(addYears(d, 1), 'yyyy-MM-dd');
                                    setData('period_start', startStr);
                                    setData('period_end', endStr);
                                }}
                                locale={cs}
                            />
                        </PopoverContent>
                    </Popover>
                    {errors.period_start && (
                        <p className="mt-1 text-xs text-red-400">{errors.period_start}</p>
                    )}
                </div>
                <div>
                    <Label className="text-muted-foreground">Období do</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="mt-1.5 w-full justify-start text-left bg-muted border-border text-foreground hover:bg-muted"
                            >
                                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                {data.period_end
                                    ? format(new Date(data.period_end), 'd. M. yyyy', { locale: cs })
                                    : 'Vyberte datum'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border">
                            <Calendar
                                mode="single"
                                selected={data.period_end ? new Date(data.period_end) : undefined}
                                onSelect={(d) =>
                                    d && setData('period_end', format(d, 'yyyy-MM-dd'))
                                }
                                locale={cs}
                            />
                        </PopoverContent>
                    </Popover>
                    {errors.period_end && (
                        <p className="mt-1 text-xs text-red-400">{errors.period_end}</p>
                    )}
                </div>
            </div>

            {/* Status */}
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
                        <SelectItem value="zaplaceno">Zaplaceno</SelectItem>
                        <SelectItem value="nezaplaceno">Nezaplaceno</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Payment method — only when paid */}
            {isPaid && (
                <div>
                    <Label className="text-muted-foreground">Způsob platby</Label>
                    <Select
                        value={data.payment_method}
                        onValueChange={(v) => setData('payment_method', v)}
                    >
                        <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="prevod">Převodem</SelectItem>
                            <SelectItem value="hotovost">Hotovost</SelectItem>
                            <SelectItem value="karta">Kartou</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Notes */}
            <div>
                <Label className="text-muted-foreground">Poznámka</Label>
                <Textarea
                    value={data.notes}
                    onChange={(e) => setData('notes', e.target.value)}
                    rows={2}
                    className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none"
                />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
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
                    {processing ? 'Ukládám...' : 'Uložit platbu'}
                </Button>
            </div>
        </form>
    );
}

function PasswordField({ password }: { password: string }) {
    const [visible, setVisible] = useState(false);
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        navigator.clipboard.writeText(password);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <div className="flex items-center justify-between py-1">
            <span className="text-sm text-muted-foreground">Heslo</span>
            <div className="flex items-center gap-1.5">
                <span className="text-sm font-mono text-foreground">
                    {visible ? password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                </span>
                <button
                    onClick={() => setVisible(!visible)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground"
                    title={visible ? 'Skr\u00fdt' : 'Zobrazit'}
                >
                    {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                    onClick={handleCopy}
                    className={`rounded p-1 transition-colors ${copied ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'}`}
                    title={copied ? 'Zkop\u00edrov\u00e1no!' : 'Kop\u00edrovat'}
                >
                    {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
            </div>
        </div>
    );
}

export default function NeniwebShow({ subscription, paymentStats }: Props) {
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const isDomain = subscription.type === 'domena';
    const statusInfo = statusMap[subscription.status];

    const handleDelete = () => {
        if (confirm(`Opravdu chcete smazat "${subscription.name}"?`)) {
            router.delete(`/neniweb/${subscription.id}`);
        }
    };

    const handleMarkPaid = (paymentId: number) => {
        router.put(`/neniweb/${subscription.id}/platby/${paymentId}/zaplaceno`, {});
    };

    const [activatingHosting, setActivatingHosting] = useState(false);
    const [activateHostingResult, setActivateHostingResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleActivateHosting = async () => {
        setActivatingHosting(true);
        setActivateHostingResult(null);
        try {
            const response = await fetch('/neniweb/activate-domain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''),
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ domain_name: subscription.name }),
            });
            const data = await response.json();
            if (response.ok) {
                setActivateHostingResult({ success: true, message: data.message ?? 'Hosting aktivován.' });
                // Spustí sync aby se hosting objevil v CRM
                setTimeout(() => router.post('/neniweb/sync', {}, { preserveState: false }), 1500);
            } else {
                setActivateHostingResult({ success: false, message: data.message ?? 'Aktivace selhala.' });
            }
        } catch {
            setActivateHostingResult({ success: false, message: 'Síťová chyba.' });
        } finally {
            setActivatingHosting(false);
        }
    };

    const paymentMethodLabels: Record<string, string> = {
        prevod: 'Převodem',
        hotovost: 'Hotovost',
        karta: 'Kartou',
    };

    return (
        <AuthenticatedLayout
            title={subscription.name}
            breadcrumbs={[
                { label: 'Webové služby', href: '/neniweb' },
                { label: subscription.name },
            ]}
        >
            <div className="p-6 space-y-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 min-w-0">
                            <Button
                                variant="ghost"
                                onClick={() => router.visit('/neniweb')}
                                className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
                            >
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                            <div className="min-w-0">
                                <div className="flex items-center gap-3 mb-1 flex-wrap">
                                    {isDomain ? (
                                        <Globe className="h-6 w-6 text-amber-500 shrink-0" />
                                    ) : (
                                        <Server className="h-6 w-6 text-blue-400 shrink-0" />
                                    )}
                                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                                        {subscription.name}
                                    </h1>
                                    {statusInfo && (
                                        <StatusBadge status={statusInfo.variant}>
                                            {statusInfo.label}
                                        </StatusBadge>
                                    )}
                                    <ExpirationBadge expiresAt={subscription.expires_at} />
                                    {subscription.is_free && (
                                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                                            ZDARMA
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                    {subscription.customer && (
                                        <a
                                            href={`/zakaznici/${subscription.customer.id}`}
                                            className="hover:text-primary transition-colors"
                                        >
                                            {subscription.customer.company || subscription.customer.name}
                                        </a>
                                    )}
                                    {subscription.customer && subscription.managed_since && (
                                        <span className="text-muted-foreground/40">·</span>
                                    )}
                                    {subscription.managed_since && (
                                        <span className="text-muted-foreground/70 text-xs">
                                            Spravujeme od {format(new Date(subscription.managed_since), 'MMMM yyyy', { locale: cs })}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap justify-end">
                        {isDomain && !subscription.has_linked_hosting && (
                            <Button
                                variant="ghost"
                                onClick={handleActivateHosting}
                                disabled={activatingHosting}
                                className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/25"
                            >
                                {activatingHosting ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Play className="h-4 w-4 mr-2" />
                                )}
                                Aktivovat hosting
                            </Button>
                        )}
                        {!subscription.is_free && subscription.customer && (
                            <Button
                                onClick={() => router.post(`/neniweb/${subscription.id}/faktura`)}
                                className="bg-[#ad9d8e] text-white hover:bg-[#ad9d8e]/90 border-0"
                            >
                                <FileText className="h-4 w-4 mr-2" />
                                Vystavit fakturu
                            </Button>
                        )}
                        <Button
                            onClick={() => router.visit(`/neniweb/${subscription.id}/edit`)}
                            className="bg-[#ad9d8e]/15 text-[#ad9d8e] hover:bg-[#ad9d8e]/25 border border-[#ad9d8e]/25"
                        >
                            <Pencil className="h-4 w-4 mr-2" />
                            Upravit
                        </Button>
                        <Button
                            onClick={handleDelete}
                            className="bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/25"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Smazat
                        </Button>
                        {activateHostingResult && (
                            <span className={`text-xs ${activateHostingResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                {activateHostingResult.message}
                            </span>
                        )}
                    </div>
                </div>

                {/* Stats cards */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="bg-card border border-border rounded-xl px-4 py-4">
                        <p className="text-xs text-muted-foreground mb-1">Roční náklad</p>
                        <p className="text-xl font-semibold text-foreground">
                            {subscription.cost_yearly ? czk(subscription.cost_yearly) : '—'}
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-xl px-4 py-4">
                        <p className="text-xs text-muted-foreground mb-1">Prodejní cena</p>
                        <p className="text-xl font-semibold text-foreground">
                            {subscription.sell_yearly ? czk(subscription.sell_yearly) : czk(subscription.price_yearly)}
                        </p>
                    </div>
                    <div className="bg-card border border-border rounded-xl px-4 py-4">
                        <p className="text-xs text-muted-foreground mb-1">Marže</p>
                        <p className={`text-xl font-semibold ${subscription.yearly_margin > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {subscription.yearly_margin != null ? czk(subscription.yearly_margin) : '—'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* Payment history — 2/3 width */}
                    <div className="lg:col-span-2">
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                                <div className="flex items-center gap-2">
                                    <ReceiptText className="h-4 w-4 text-muted-foreground" />
                                    <h2 className="text-sm font-semibold text-foreground">Platební historie</h2>
                                    <span className="text-xs text-muted-foreground">
                                        ({paymentStats.payments_count})
                                    </span>
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => setShowPaymentModal(true)}
                                    className="bg-primary hover:bg-primary/80 text-white h-7 px-3 text-xs"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Nová platba
                                </Button>
                            </div>

                            {subscription.payments.length === 0 ? (
                                <div className="px-5 py-8 text-center text-sm text-muted-foreground">
                                    Žádné platby
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {subscription.payments.map((payment) => (
                                        <div
                                            key={payment.id}
                                            className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="min-w-0">
                                                    <p className="text-sm text-muted-foreground">
                                                        {format(new Date(payment.period_start), 'd. M. yyyy', { locale: cs })}
                                                        {' – '}
                                                        {format(new Date(payment.period_end), 'd. M. yyyy', { locale: cs })}
                                                    </p>
                                                    {payment.notes && (
                                                        <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                                                            {payment.notes}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                <span className="text-sm font-medium text-foreground">
                                                    {czk(payment.amount)}
                                                </span>
                                                <PaymentStatusBadge status={payment.status} />
                                                {payment.paid_at && (
                                                    <span className="text-xs text-muted-foreground hidden sm:block">
                                                        {format(new Date(payment.paid_at), 'd. M. yyyy', { locale: cs })}
                                                    </span>
                                                )}
                                                {payment.payment_method && (
                                                    <span className="text-xs text-muted-foreground hidden md:block">
                                                        {paymentMethodLabels[payment.payment_method] ?? payment.payment_method}
                                                    </span>
                                                )}
                                                {payment.status !== 'zaplaceno' && (
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleMarkPaid(payment.id)}
                                                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 px-2 text-xs"
                                                    >
                                                        <RefreshCw className="h-3 w-3 mr-1" />
                                                        Zaplatit
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Payment stats footer */}
                            {paymentStats.payments_count > 0 && (
                                <div className="flex items-center gap-6 px-5 py-3 border-t border-border bg-muted/30">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Zaplaceno celkem</p>
                                        <p className="text-sm font-medium text-emerald-400">{czk(paymentStats.total_paid)}</p>
                                    </div>
                                    {paymentStats.total_unpaid > 0 && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">Nezaplaceno</p>
                                            <p className="text-sm font-medium text-amber-400">{czk(paymentStats.total_unpaid)}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        {/* Linked invoices */}
                        {subscription.invoices && subscription.invoices.length > 0 && (
                            <div className="bg-card border border-border rounded-xl overflow-hidden mt-4">
                                <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                    <h2 className="text-sm font-semibold text-foreground">Faktury</h2>
                                    <span className="text-xs text-muted-foreground">
                                        ({subscription.invoices.length})
                                    </span>
                                </div>
                                <div className="divide-y divide-border">
                                    {subscription.invoices.map((inv) => {
                                        const invStatus = invoiceStatusConfig[inv.status] ?? invoiceStatusConfig.vystavena;
                                        return (
                                            <a
                                                key={inv.id}
                                                href={`/faktury/${inv.id}`}
                                                className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium text-foreground">
                                                        {inv.invoice_number}
                                                    </span>
                                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${invStatus.className}`}>
                                                        {invStatus.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm font-medium text-foreground">
                                                        {czk(Number(inv.total))}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {format(new Date(inv.issue_date), 'd. M. yyyy', { locale: cs })}
                                                    </span>
                                                </div>
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Info sidebar — 1/3 width */}
                    <div className="space-y-4">
                        <div className="bg-card border border-border rounded-xl px-5 py-4 space-y-3">
                            <h2 className="text-sm font-semibold text-foreground mb-3">Informace</h2>

                            <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Typ</span>
                                    <span className="text-foreground">
                                        {isDomain ? 'Doména' : 'Hosting'}
                                    </span>
                                </div>

                                {isDomain && subscription.has_linked_hosting !== null && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Hosting</span>
                                        {subscription.has_linked_hosting ? (
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                <span className="text-emerald-400 font-medium">Ano</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                                                <span className="text-muted-foreground/60">Ne</span>
                                            </span>
                                        )}
                                    </div>
                                )}

                                {!isDomain && subscription.has_linked_domain !== null && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Doména</span>
                                        {subscription.has_linked_domain ? (
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                <span className="text-emerald-400 font-medium">Ano</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                                                <span className="text-muted-foreground/60">Ne</span>
                                            </span>
                                        )}
                                    </div>
                                )}

                                {isDomain && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Registrátor</span>
                                        {subscription.is_registered_by_us ? (
                                            <span className="inline-flex items-center gap-1.5">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                <span className="text-emerald-400 font-medium">Váš-Hosting</span>
                                            </span>
                                        ) : (
                                            <span className="text-muted-foreground/60">Externí</span>
                                        )}
                                    </div>
                                )}

                                {subscription.ip_address && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">IP adresa</span>
                                        <span className="text-foreground font-mono text-xs">
                                            {subscription.ip_address}
                                        </span>
                                    </div>
                                )}

                                {subscription.tariff && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Tarif</span>
                                        <span className="text-foreground">{subscription.tariff}</span>
                                    </div>
                                )}

                                {subscription.server && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Server</span>
                                        <span className="text-foreground font-mono text-xs">
                                            {subscription.server}
                                        </span>
                                    </div>
                                )}

                                {subscription.storage_quota_mb > 0 && (
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <span className="text-muted-foreground">Úložiště</span>
                                            <span className="text-foreground text-xs">
                                                {subscription.storage_used_mb} / {subscription.storage_quota_mb} MB
                                            </span>
                                        </div>
                                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${
                                                    (subscription.storage_used_mb / subscription.storage_quota_mb) > 0.9
                                                        ? 'bg-red-400'
                                                        : (subscription.storage_used_mb / subscription.storage_quota_mb) > 0.7
                                                            ? 'bg-amber-400'
                                                            : 'bg-emerald-400'
                                                }`}
                                                style={{ width: `${Math.min(100, Math.round((subscription.storage_used_mb / subscription.storage_quota_mb) * 100))}%` }}
                                            />
                                        </div>
                                    </div>
                                )}

                                {!isDomain && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Fakturační cyklus</span>
                                        <span className="text-foreground">
                                            {billingCycleLabels[subscription.billing_cycle] ?? subscription.billing_cycle}
                                        </span>
                                    </div>
                                )}

                                {!isDomain && subscription.monthly_plan && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Plán</span>
                                        <span className="text-foreground">
                                            {monthlyPlanLabels[subscription.monthly_plan] ?? subscription.monthly_plan}
                                        </span>
                                    </div>
                                )}

                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Auto-renew</span>
                                    <span className={subscription.auto_renew ? 'text-emerald-400' : 'text-muted-foreground'}>
                                        {subscription.auto_renew ? 'Ano' : 'Ne'}
                                    </span>
                                </div>

                                <Separator className="bg-border" />

                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Začátek</span>
                                    <span className="text-foreground">
                                        {subscription.starts_at
                                            ? format(new Date(subscription.starts_at), 'd. M. yyyy', { locale: cs })
                                            : <span className="text-muted-foreground/50">Nenastaveno</span>}
                                    </span>
                                </div>

                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Expirace</span>
                                    <span className="text-foreground">
                                        {subscription.expires_at
                                            ? format(new Date(subscription.expires_at), 'd. M. yyyy', { locale: cs })
                                            : <span className="text-muted-foreground/50">Nenastaveno</span>}
                                    </span>
                                </div>

                                {subscription.managed_since && (
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Ve správě od</span>
                                        <span className="text-foreground">
                                            {format(new Date(subscription.managed_since), 'd. M. yyyy', { locale: cs })}
                                        </span>
                                    </div>
                                )}

                                {subscription.synced_at && (
                                    <>
                                        <Separator className="bg-border" />
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Poslední sync</span>
                                            <span className="text-muted-foreground/70 text-xs">
                                                {format(new Date(subscription.synced_at), 'd. M. yyyy HH:mm', { locale: cs })}
                                            </span>
                                        </div>
                                    </>
                                )}

                                {/* Přístupy do webu */}
                                {(subscription.admin_url || subscription.admin_user || subscription.client_user) && (
                                    <>
                                        <Separator className="bg-border" />
                                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Přístupy do webu
                                        </h4>
                                        {subscription.admin_url && (
                                            <div className="flex items-center justify-between py-1">
                                                <span className="text-sm text-muted-foreground">Admin URL</span>
                                                <a
                                                    href={subscription.admin_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm text-primary hover:underline"
                                                >
                                                    Otevřít →
                                                </a>
                                            </div>
                                        )}
                                        {subscription.admin_user && (
                                            <>
                                                <p className="mt-2 text-xs font-medium text-muted-foreground/70">Můj přístup</p>
                                                <div className="flex items-center justify-between py-1">
                                                    <span className="text-sm text-muted-foreground">Login</span>
                                                    <span className="text-sm text-foreground">{subscription.admin_user}</span>
                                                </div>
                                                {subscription.admin_password && (
                                                    <PasswordField password={subscription.admin_password} />
                                                )}
                                            </>
                                        )}
                                        {subscription.client_user && (
                                            <>
                                                <p className="mt-2 text-xs font-medium text-muted-foreground/70">Zákazník</p>
                                                <div className="flex items-center justify-between py-1">
                                                    <span className="text-sm text-muted-foreground">Login</span>
                                                    <span className="text-sm text-foreground">{subscription.client_user}</span>
                                                </div>
                                                {subscription.client_password && (
                                                    <PasswordField password={subscription.client_password} />
                                                )}
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {subscription.notes && (
                            <div className="bg-card border border-border rounded-xl px-5 py-4">
                                <h2 className="text-sm font-semibold text-foreground mb-2">Poznámky</h2>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {subscription.notes}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <GlassModal
                open={showPaymentModal}
                onClose={() => setShowPaymentModal(false)}
                title="Nová platba"
                maxWidth="max-w-lg"
            >
                <PaymentForm
                    subscription={subscription}
                    onClose={() => setShowPaymentModal(false)}
                />
            </GlassModal>
        </AuthenticatedLayout>
    );
}
