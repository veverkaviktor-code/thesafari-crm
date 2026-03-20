import { type FormEvent, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import GlassModal from '@/components/ui/GlassModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ExpirationBadge from '@/components/webove-sluzby/ExpirationBadge';
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
import { format, addYears } from 'date-fns';
import { cs } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import {
    Globe,
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
    Mail,
    Shield,
    Link2,
    Server,
    HardDrive,
    DollarSign,
    Settings,
    ExternalLink,
} from 'lucide-react';

/* ─────── Types ─────── */

interface WebsiteCredential {
    id: number;
    label: string;
    login: string;
    password: string | null;
    notes: string | null;
    sort_order: number;
}

interface EmailAccount {
    id: number;
    email: string;
    password: string | null;
    quota_mb: number;
    notes: string | null;
}

interface Payment {
    id: number;
    website_id: number;
    amount: number;
    period_start: string;
    period_end: string;
    status: string;
    paid_at: string | null;
    payment_method: string | null;
    notes: string | null;
    invoice?: { id: number; invoice_number: string } | null;
}

interface Invoice {
    id: number;
    invoice_number: string;
    issue_date: string;
    due_date: string;
    status: string;
    total: number;
}

interface ManagementPlan {
    id: number;
    name: string;
    price_monthly: number | string;
}

interface AliasWebsite {
    id: number;
    name: string;
}

interface Website {
    id: number;
    name: string;
    server: string | null;
    status: string;
    notes: string | null;
    starts_at: string | null;
    is_registered_by_us: boolean;
    auto_renew: boolean;
    auto_invoice: boolean;
    auto_invoice_management: boolean;
    is_free: boolean;
    is_external: boolean;
    sell_yearly: number;
    cost_yearly: number;
    admin_url: string | null;
    domain_expires_at: string | null;
    hosting_expires_at: string | null;
    ip_address: string | null;
    storage_quota_mb: number;
    storage_used_mb: number;
    synced_at: string | null;
    days_until_expiry: number | null;
    urgency: string;
    yearly_margin: number;
    monthly_revenue: number;
    total_annual_revenue: number;
    customer: { id: number; name: string; company: string | null } | null;
    hosting_server: { id: number; name: string } | null;
    alias_of: { id: number; name: string } | null;
    aliases: AliasWebsite[];
    management_plan: ManagementPlan | null;
    management_cycle: string | null;
    credentials: WebsiteCredential[];
    email_accounts: EmailAccount[];
    payments: Payment[];
    invoices: Invoice[];
}

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface Props {
    website: Website;
    paymentStats: {
        total_paid: number;
        total_unpaid: number;
        payments_count: number;
    };
    customers: Customer[];
}

/* ─────── Config maps ─────── */

const statusMap: Record<string, { label: string; variant: 'active' | 'inactive' | 'cancelled' }> = {
    aktivni: { label: 'Aktivni', variant: 'active' },
    pozastaveno: { label: 'Pozastaveno', variant: 'inactive' },
    zruseno: { label: 'Zruseno', variant: 'cancelled' },
};

const invoiceStatusConfig: Record<string, { label: string; className: string }> = {
    vystavena: { label: 'Vystavena', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    odeslana: { label: 'Odeslana', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    zaplacena: { label: 'Zaplacena', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    po_splatnosti: { label: 'Po splatnosti', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    storno: { label: 'Storno', className: 'bg-muted text-muted-foreground border-border' },
};

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
    zaplaceno: { label: 'Zaplaceno', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    nezaplaceno: { label: 'Nezaplaceno', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    po_splatnosti: { label: 'Po splatnosti', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const managementCycleLabels: Record<string, string> = {
    quarterly: 'Ctvrtletne',
    semi_annual: 'Pololetne',
    annual: 'Rocne',
};

const paymentMethodLabels: Record<string, string> = {
    prevod: 'Prevodem',
    hotovost: 'Hotovost',
    karta: 'Kartou',
};

/* ─────── Small components ─────── */

function PaymentStatusBadge({ status }: { status: string }) {
    const config = paymentStatusConfig[status] ?? paymentStatusConfig.nezaplaceno;
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.className}`}>
            {config.label}
        </span>
    );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm text-foreground text-right">{children}</span>
        </div>
    );
}

function SectionHeader({ icon: Icon, title, count, action }: {
    icon: React.ElementType;
    title: string;
    count?: number;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                {count !== undefined && (
                    <span className="text-xs text-muted-foreground">({count})</span>
                )}
            </div>
            {action}
        </div>
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
        <div className="flex items-center gap-1.5">
            <span className="text-sm font-mono text-foreground">
                {visible ? password : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
            </span>
            <button
                onClick={() => setVisible(!visible)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                title={visible ? 'Skryt' : 'Zobrazit'}
            >
                {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button
                onClick={handleCopy}
                className={`rounded p-1 transition-colors ${copied ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'}`}
                title={copied ? 'Zkopirovano!' : 'Kopirovat'}
            >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
        </div>
    );
}

/* ─────── Payment Form (modal content) ─────── */

interface PaymentFormData {
    amount: string;
    period_start: string;
    period_end: string;
    status: string;
    payment_method: string;
    notes: string;
}

function PaymentForm({ website, onClose }: { website: Website; onClose: () => void }) {
    const defaultAmount = String(website.sell_yearly || '');
    const defaultPeriodStart = format(new Date(), 'yyyy-MM-dd');
    const defaultPeriodEnd = format(addYears(new Date(), 1), 'yyyy-MM-dd');

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
        post(`/webove-sluzby/${website.id}/platby`, { onSuccess: () => onClose() });
    };

    const isPaid = data.status === 'zaplaceno';

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <Label className="text-muted-foreground">Castka (Kc)</Label>
                <Input type="number" value={data.amount} onChange={(e) => setData('amount', e.target.value)} placeholder="0" className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground" />
                {errors.amount && <p className="mt-1 text-xs text-red-400">{errors.amount}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-muted-foreground">Obdobi od</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="mt-1.5 w-full justify-start text-left bg-muted border-border text-foreground hover:bg-muted">
                                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                {data.period_start ? format(new Date(data.period_start), 'd. M. yyyy', { locale: cs }) : 'Vyberte datum'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border">
                            <Calendar mode="single" selected={data.period_start ? new Date(data.period_start) : undefined} onSelect={(d) => { if (!d) return; const startStr = format(d, 'yyyy-MM-dd'); const endStr = format(addYears(d, 1), 'yyyy-MM-dd'); setData('period_start', startStr); setData('period_end', endStr); }} locale={cs} />
                        </PopoverContent>
                    </Popover>
                    {errors.period_start && <p className="mt-1 text-xs text-red-400">{errors.period_start}</p>}
                </div>
                <div>
                    <Label className="text-muted-foreground">Obdobi do</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className="mt-1.5 w-full justify-start text-left bg-muted border-border text-foreground hover:bg-muted">
                                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                {data.period_end ? format(new Date(data.period_end), 'd. M. yyyy', { locale: cs }) : 'Vyberte datum'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border">
                            <Calendar mode="single" selected={data.period_end ? new Date(data.period_end) : undefined} onSelect={(d) => d && setData('period_end', format(d, 'yyyy-MM-dd'))} locale={cs} />
                        </PopoverContent>
                    </Popover>
                    {errors.period_end && <p className="mt-1 text-xs text-red-400">{errors.period_end}</p>}
                </div>
            </div>
            <div>
                <Label className="text-muted-foreground">Stav</Label>
                <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                    <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card border-border">
                        <SelectItem value="zaplaceno">Zaplaceno</SelectItem>
                        <SelectItem value="nezaplaceno">Nezaplaceno</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            {isPaid && (
                <div>
                    <Label className="text-muted-foreground">Zpusob platby</Label>
                    <Select value={data.payment_method} onValueChange={(v) => setData('payment_method', v)}>
                        <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="prevod">Prevodem</SelectItem>
                            <SelectItem value="hotovost">Hotovost</SelectItem>
                            <SelectItem value="karta">Kartou</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div>
                <Label className="text-muted-foreground">Poznamka</Label>
                <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none" />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">Zrusit</Button>
                <Separator orientation="vertical" className="h-6 bg-border" />
                <Button type="submit" disabled={processing} className="bg-primary hover:bg-primary/80 text-white">
                    {processing ? 'Ukladam...' : 'Ulozit platbu'}
                </Button>
            </div>
        </form>
    );
}

/* ─────── Main Component ─────── */

export default function WeboveSluzbyShow({ website, paymentStats }: Props) {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const statusInfo = statusMap[website.status];

    const handleMarkPaid = (paymentId: number) => {
        router.put(`/webove-sluzby/${website.id}/platby/${paymentId}/zaplaceno`, {});
    };

    const [activatingHosting, setActivatingHosting] = useState(false);
    const [activateHostingResult, setActivateHostingResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleActivateHosting = async () => {
        setActivatingHosting(true);
        setActivateHostingResult(null);
        try {
            const response = await fetch('/webove-sluzby/activate-domain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''),
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ domain_name: website.name }),
            });
            const data = await response.json();
            if (response.ok) {
                setActivateHostingResult({ success: true, message: data.message ?? 'Hosting aktivovan.' });
                setTimeout(() => router.post('/webove-sluzby/sync', {}, { preserveState: false }), 1500);
            } else {
                setActivateHostingResult({ success: false, message: data.message ?? 'Aktivace selhala.' });
            }
        } catch {
            setActivateHostingResult({ success: false, message: 'Sitova chyba.' });
        } finally {
            setActivatingHosting(false);
        }
    };

    const storagePct = website.storage_quota_mb > 0
        ? Math.min(100, Math.round((website.storage_used_mb / website.storage_quota_mb) * 100))
        : 0;
    const storageColor = storagePct > 90 ? 'bg-red-400' : storagePct > 70 ? 'bg-amber-400' : 'bg-emerald-400';

    return (
        <AuthenticatedLayout
            title={website.name}
            breadcrumbs={[
                { label: 'Webove sluzby', href: '/webove-sluzby' },
                { label: website.name },
            ]}
        >
            <div className="p-6 space-y-6 max-w-6xl mx-auto">
                {/* ═══════ HEADER ═══════ */}
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-start gap-4 min-w-0">
                        <Button
                            variant="ghost"
                            onClick={() => router.visit('/webove-sluzby')}
                            className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div className="min-w-0">
                            <div className="flex items-center gap-3 mb-1 flex-wrap">
                                <Globe className="h-6 w-6 text-amber-500 shrink-0" />
                                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{website.name}</h1>
                                {statusInfo && <StatusBadge status={statusInfo.variant}>{statusInfo.label}</StatusBadge>}
                                <ExpirationBadge expiresAt={website.hosting_expires_at} />
                                {website.is_free && (
                                    <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">ZDARMA</span>
                                )}
                                {website.alias_of && (
                                    <span className="inline-flex items-center rounded-full bg-violet-500/15 border border-violet-500/25 px-2 py-0.5 text-[10px] font-semibold text-violet-400">
                                        ALIAS &rarr; {website.alias_of.name}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                {website.customer && (
                                    <a href={`/zakaznici/${website.customer.id}`} className="hover:text-primary transition-colors">
                                        {website.customer.company || website.customer.name}
                                    </a>
                                )}
                                {website.customer && website.starts_at && <span className="text-muted-foreground/40">&middot;</span>}
                                {website.starts_at && (
                                    <span className="text-muted-foreground/70 text-xs">
                                        Od {format(new Date(website.starts_at), 'MMMM yyyy', { locale: cs })}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        <Button
                            variant="ghost"
                            onClick={handleActivateHosting}
                            disabled={activatingHosting}
                            className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 border border-emerald-500/25"
                        >
                            {activatingHosting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                            Aktivovat hosting
                        </Button>
                        {!website.is_free && website.customer && (
                            <Button onClick={() => router.post(`/webove-sluzby/${website.id}/faktura`)} className="bg-[#ad9d8e] text-white hover:bg-[#ad9d8e]/90 border-0">
                                <FileText className="h-4 w-4 mr-2" />
                                Vystavit fakturu
                            </Button>
                        )}
                        <Button onClick={() => router.visit(`/webove-sluzby/${website.id}/edit`)} className="bg-[#ad9d8e]/15 text-[#ad9d8e] hover:bg-[#ad9d8e]/25 border border-[#ad9d8e]/25">
                            <Pencil className="h-4 w-4 mr-2" />
                            Upravit
                        </Button>
                        <Button onClick={() => setShowDeleteConfirm(true)} className="bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/25">
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

                {/* ═══════ INFO CARDS — Domain / Hosting / Billing ═══════ */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    {/* Card 1: Domena */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
                            <Globe className="h-4 w-4 text-amber-500" />
                            <h3 className="text-sm font-semibold text-foreground">Domena</h3>
                        </div>
                        <div className="px-5 py-4 space-y-1">
                            <InfoRow label="Registrator">
                                {website.is_registered_by_us ? (
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                        <span className="text-emerald-400 font-medium">Vlastni</span>
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground/60">Externi</span>
                                )}
                            </InfoRow>
                            <InfoRow label="Expirace domeny">
                                {website.domain_expires_at ? (
                                    <ExpirationBadge expiresAt={website.domain_expires_at} />
                                ) : (
                                    <span className="text-muted-foreground/50">Nenastaveno</span>
                                )}
                            </InfoRow>
                            {website.ip_address && (
                                <InfoRow label="IP adresa">
                                    <span className="font-mono text-xs">{website.ip_address}</span>
                                </InfoRow>
                            )}
                            <InfoRow label="Auto-renew">
                                <span className={website.auto_renew ? 'text-emerald-400' : 'text-muted-foreground'}>
                                    {website.auto_renew ? 'Ano' : 'Ne'}
                                </span>
                            </InfoRow>
                        </div>
                    </div>

                    {/* Card 2: Hosting */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
                            <HardDrive className="h-4 w-4 text-sky-400" />
                            <h3 className="text-sm font-semibold text-foreground">Hosting</h3>
                        </div>
                        <div className="px-5 py-4 space-y-1">
                            <InfoRow label="Server">
                                {website.hosting_server ? (
                                    <span className="font-medium">{website.hosting_server.name}</span>
                                ) : website.server ? (
                                    <span className="font-mono text-xs">{website.server}</span>
                                ) : (
                                    <span className="text-muted-foreground/50">Bez hostingu</span>
                                )}
                            </InfoRow>
                            <InfoRow label="Expirace hostingu">
                                {website.hosting_expires_at ? (
                                    <ExpirationBadge expiresAt={website.hosting_expires_at} />
                                ) : (
                                    <span className="text-muted-foreground/50">—</span>
                                )}
                            </InfoRow>
                            {website.storage_quota_mb > 0 && (
                                <div className="py-1.5">
                                    <div className="flex items-center justify-between text-sm mb-1.5">
                                        <span className="text-muted-foreground">Uloziste</span>
                                        <span className="text-foreground text-xs">
                                            {website.storage_used_mb} / {website.storage_quota_mb} MB
                                        </span>
                                    </div>
                                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full ${storageColor}`} style={{ width: `${storagePct}%` }} />
                                    </div>
                                </div>
                            )}
                            {website.admin_url && (
                                <InfoRow label="Admin URL">
                                    <a
                                        href={website.admin_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                        Otevrit <ExternalLink className="h-3 w-3" />
                                    </a>
                                </InfoRow>
                            )}
                        </div>
                    </div>

                    {/* Card 3: Fakturace */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
                            <DollarSign className="h-4 w-4 text-emerald-400" />
                            <h3 className="text-sm font-semibold text-foreground">Fakturace</h3>
                        </div>
                        <div className="px-5 py-4 space-y-1">
                            <InfoRow label="Rocni cena">
                                <span className="font-semibold">{website.sell_yearly ? formatCurrency(website.sell_yearly) : '—'}</span>
                            </InfoRow>
                            <InfoRow label="Rocni naklad">
                                <span>{website.cost_yearly ? formatCurrency(website.cost_yearly) : '—'}</span>
                            </InfoRow>
                            <InfoRow label="Marze">
                                <span className={website.yearly_margin > 0 ? 'text-emerald-400 font-medium' : website.yearly_margin < 0 ? 'text-red-400 font-medium' : ''}>
                                    {formatCurrency(website.yearly_margin)}
                                </span>
                            </InfoRow>
                            <Separator className="bg-border !my-2" />
                            <InfoRow label="Auto-fakturace">
                                <span className={website.auto_invoice ? 'text-emerald-400' : 'text-muted-foreground'}>
                                    {website.auto_invoice ? 'Ano' : 'Ne'}
                                </span>
                            </InfoRow>
                            {website.management_plan && (
                                <>
                                    <InfoRow label="Balicek spravy">
                                        <span className="font-medium">{website.management_plan.name}</span>
                                    </InfoRow>
                                    <InfoRow label="Cena spravy">
                                        {Number(website.management_plan.price_monthly).toLocaleString('cs-CZ')} Kc/mes
                                    </InfoRow>
                                    {website.management_cycle && (
                                        <InfoRow label="Cyklus spravy">
                                            {managementCycleLabels[website.management_cycle] ?? '—'}
                                        </InfoRow>
                                    )}
                                    <InfoRow label="Auto-fakt. sprava">
                                        <span className={website.auto_invoice_management ? 'text-emerald-400' : 'text-muted-foreground'}>
                                            {website.auto_invoice_management ? 'Ano' : 'Ne'}
                                        </span>
                                    </InfoRow>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* ═══════ TWO COLUMN LAYOUT ═══════ */}
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                    {/* LEFT: Payments + Invoices — 2/3 */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* Platebni historie */}
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <SectionHeader
                                icon={ReceiptText}
                                title="Platebni historie"
                                count={paymentStats.payments_count}
                                action={
                                    <Button size="sm" onClick={() => setShowPaymentModal(true)} className="bg-primary hover:bg-primary/80 text-white h-7 px-3 text-xs">
                                        <Plus className="h-3.5 w-3.5 mr-1" />
                                        Nova platba
                                    </Button>
                                }
                            />
                            {website.payments.length === 0 ? (
                                <div className="px-5 py-8 text-center text-sm text-muted-foreground">Zadne platby</div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {website.payments.map((payment) => (
                                        <div key={payment.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                                            <div className="min-w-0">
                                                <p className="text-sm text-muted-foreground">
                                                    {format(new Date(payment.period_start), 'd. M. yyyy', { locale: cs })}
                                                    {' \u2013 '}
                                                    {format(new Date(payment.period_end), 'd. M. yyyy', { locale: cs })}
                                                </p>
                                                {payment.notes && (
                                                    <p className="text-xs text-muted-foreground/70 truncate mt-0.5">{payment.notes}</p>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0 ml-4">
                                                <span className="text-sm font-medium text-foreground">{formatCurrency(payment.amount)}</span>
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
                                                    <Button size="sm" variant="ghost" onClick={() => handleMarkPaid(payment.id)} className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 px-2 text-xs">
                                                        <RefreshCw className="h-3 w-3 mr-1" />
                                                        Zaplatit
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {paymentStats.payments_count > 0 && (
                                <div className="flex items-center gap-6 px-5 py-3 border-t border-border bg-muted/30">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Zaplaceno celkem</p>
                                        <p className="text-sm font-medium text-emerald-400">{formatCurrency(paymentStats.total_paid)}</p>
                                    </div>
                                    {paymentStats.total_unpaid > 0 && (
                                        <div>
                                            <p className="text-xs text-muted-foreground">Nezaplaceno</p>
                                            <p className="text-sm font-medium text-amber-400">{formatCurrency(paymentStats.total_unpaid)}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Faktury */}
                        {website.invoices && website.invoices.length > 0 && (
                            <div className="bg-card border border-border rounded-xl overflow-hidden">
                                <SectionHeader icon={FileText} title="Faktury" count={website.invoices.length} />
                                <div className="divide-y divide-border">
                                    {website.invoices.map((inv) => {
                                        const invStatus = invoiceStatusConfig[inv.status] ?? invoiceStatusConfig.vystavena;
                                        return (
                                            <a key={inv.id} href={`/faktury/${inv.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-medium text-foreground">{inv.invoice_number}</span>
                                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${invStatus.className}`}>
                                                        {invStatus.label}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-sm font-medium text-foreground">{formatCurrency(Number(inv.total))}</span>
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

                    {/* RIGHT: Credentials, Emails, Aliases, Notes — 1/3 */}
                    <div className="space-y-4">
                        {/* Pristupove udaje */}
                        <div className="bg-card border border-border rounded-xl overflow-hidden">
                            <SectionHeader icon={Shield} title="Pristupove udaje" count={website.credentials.length} />
                            <div className="px-5 py-4">
                                {website.admin_url && (
                                    <div className="flex items-center justify-between py-1.5 mb-2">
                                        <span className="text-sm text-muted-foreground">Admin URL</span>
                                        <a href={website.admin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                                            Otevrit <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </div>
                                )}
                                {website.credentials.length === 0 && !website.admin_url && (
                                    <p className="text-sm text-muted-foreground py-2">Zadne pristupove udaje</p>
                                )}
                                {website.credentials.map((cred) => (
                                    <div key={cred.id} className="rounded-lg bg-accent px-3 py-2.5 mb-2 last:mb-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                            <span className="text-xs font-medium text-foreground">{cred.label}</span>
                                        </div>
                                        <div className="flex items-center justify-between py-0.5">
                                            <span className="text-xs text-muted-foreground">Login</span>
                                            <span className="text-sm text-foreground">{cred.login}</span>
                                        </div>
                                        {cred.password && (
                                            <div className="flex items-center justify-between py-0.5">
                                                <span className="text-xs text-muted-foreground">Heslo</span>
                                                <PasswordField password={cred.password} />
                                            </div>
                                        )}
                                        {cred.notes && (
                                            <p className="text-xs text-muted-foreground/70 mt-1">{cred.notes}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* E-mailove schranky */}
                        <EmailAccountsSection websiteId={website.id} emailAccounts={website.email_accounts ?? []} />

                        {/* Aliasy */}
                        {website.aliases && website.aliases.length > 0 && (
                            <div className="bg-card border border-border rounded-xl overflow-hidden">
                                <SectionHeader icon={Link2} title="Aliasy" count={website.aliases.length} />
                                <div className="px-5 py-4 space-y-1">
                                    {website.aliases.map((alias) => (
                                        <a
                                            key={alias.id}
                                            href={`/webove-sluzby/${alias.id}`}
                                            className="flex items-center gap-2 text-sm text-primary hover:underline py-1"
                                        >
                                            <Link2 className="h-3 w-3" />
                                            {alias.name}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Poznamky */}
                        {website.notes && (
                            <div className="bg-card border border-border rounded-xl px-5 py-4">
                                <h2 className="text-sm font-semibold text-foreground mb-2">Poznamky</h2>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{website.notes}</p>
                            </div>
                        )}

                        {/* Sync info */}
                        {website.synced_at && (
                            <div className="px-1 text-xs text-muted-foreground/50">
                                Posledni sync: {format(new Date(website.synced_at), 'd. M. yyyy HH:mm', { locale: cs })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <GlassModal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Nova platba" maxWidth="max-w-lg">
                <PaymentForm website={website} onClose={() => setShowPaymentModal(false)} />
            </GlassModal>

            <ConfirmDialog
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => router.delete(`/webove-sluzby/${website.id}`)}
                title="Smazat web"
                message={`Opravdu chcete smazat "${website.name}"?`}
            />
        </AuthenticatedLayout>
    );
}

/* ─────── Email Accounts Section ─────── */

function EmailAccountsSection({ websiteId, emailAccounts }: { websiteId: number; emailAccounts: { id: number; email: string; password: string | null; quota_mb: number; notes: string | null }[] }) {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold text-foreground">E-mailove schranky</h2>
                    {emailAccounts.length > 0 && (
                        <span className="text-xs text-muted-foreground">({emailAccounts.length})</span>
                    )}
                </div>
                {!showForm && !editingId && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Pridat
                    </button>
                )}
            </div>

            <div className="px-5 py-4">
                {showForm && (
                    <EmailAccountForm
                        websiteId={websiteId}
                        onCancel={() => setShowForm(false)}
                        onSuccess={() => setShowForm(false)}
                    />
                )}

                {emailAccounts.length === 0 && !showForm && (
                    <p className="text-sm text-muted-foreground py-2">Zadne e-mailove schranky</p>
                )}

                <div className="space-y-2">
                    {emailAccounts.map((ea) =>
                        editingId === ea.id ? (
                            <EmailAccountForm
                                key={ea.id}
                                websiteId={websiteId}
                                emailAccount={ea}
                                onCancel={() => setEditingId(null)}
                                onSuccess={() => setEditingId(null)}
                            />
                        ) : (
                            <div key={ea.id} className="flex items-center gap-3 rounded-lg bg-accent px-3 py-2.5">
                                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-foreground">{ea.email}</p>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span>{ea.quota_mb >= 1024 ? `${(ea.quota_mb / 1024).toFixed(0)} GB` : `${ea.quota_mb} MB`}</span>
                                        {ea.notes && <span>&middot; {ea.notes}</span>}
                                    </div>
                                </div>
                                {ea.password && <PasswordField password={ea.password} />}
                                <div className="flex shrink-0 gap-0.5">
                                    <button onClick={() => setEditingId(ea.id)} className="rounded p-1.5 text-muted-foreground hover:bg-background hover:text-foreground" title="Upravit">
                                        <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button onClick={() => setDeleteId(ea.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Smazat">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        ),
                    )}
                </div>
            </div>

            <ConfirmDialog
                open={deleteId !== null}
                onClose={() => setDeleteId(null)}
                onConfirm={() => {
                    if (deleteId !== null) {
                        router.delete(`/emaily/${deleteId}`, { preserveScroll: true });
                        setDeleteId(null);
                    }
                }}
                title="Smazat e-mail"
                message="Opravdu chcete smazat tento e-mailovy ucet z evidence?"
            />
        </div>
    );
}

function EmailAccountForm({
    websiteId,
    emailAccount,
    onCancel,
    onSuccess,
}: {
    websiteId: number;
    emailAccount?: { id: number; email: string; password: string | null; quota_mb: number; notes: string | null };
    onCancel: () => void;
    onSuccess: () => void;
}) {
    const isEdit = !!emailAccount;
    const form = useForm({
        email: emailAccount?.email ?? '',
        password: '',
        quota_mb: emailAccount?.quota_mb ?? 3072,
        notes: emailAccount?.notes ?? '',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            form.put(`/emaily/${emailAccount!.id}`, { preserveScroll: true, onSuccess });
        } else {
            form.post(`/webove-sluzby/${websiteId}/emaily`, { preserveScroll: true, onSuccess: () => { form.reset(); onSuccess(); } });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-accent p-3 mb-2 space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-muted-foreground">E-mail *</Label>
                    <Input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} placeholder="info@domena.cz" className="h-8 text-sm bg-background" />
                    {form.errors.email && <p className="text-xs text-red-400 mt-0.5">{form.errors.email}</p>}
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">Heslo {isEdit && <span className="text-muted-foreground/50">(prazdne = beze zmeny)</span>}</Label>
                    <Input type="text" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} placeholder={isEdit ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : 'heslo'} className="h-8 text-sm bg-background" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-muted-foreground">Kvota (MB)</Label>
                    <Input type="number" value={form.data.quota_mb} onChange={(e) => form.setData('quota_mb', parseInt(e.target.value) || 3072)} className="h-8 text-sm bg-background" />
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">Poznamka</Label>
                    <Input type="text" value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} placeholder="napr. hlavni schranka" className="h-8 text-sm bg-background" />
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">Zrusit</button>
                <button type="submit" disabled={form.processing} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/80 disabled:opacity-50">
                    {form.processing ? 'Ukladam...' : isEdit ? 'Ulozit' : 'Pridat'}
                </button>
            </div>
        </form>
    );
}
