import { type FormEvent, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import GlassModal from '@/components/ui/GlassModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ExpirationBadge from '@/components/shared/ExpirationBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
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
    ExternalLink,
    LayoutDashboard,
    Settings,
    KeyRound,
} from 'lucide-react';

/* ─────── Types ─────── */

interface HostingCredential {
    id: number;
    label: string;
    login: string;
    password: string | null;
    email: string | null;
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
    hosting_id: number;
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

interface Domain {
    id: number;
    name: string;
    registrar: string | null;
    is_registered_by_us: boolean;
    expires_at: string | null;
    sell_yearly: number;
    cost_yearly: number;
}

interface RedirectHosting {
    id: number;
    name: string;
}

interface Hosting {
    id: number;
    name: string;
    server: string | null;
    status: string;
    notes: string | null;
    starts_at: string | null;
    auto_invoice: boolean;
    auto_invoice_management: boolean;
    is_free: boolean;
    sell_yearly: number;
    cost_yearly: number;
    admin_url: string | null;
    expires_at: string | null;
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
    vps_server: { id: number; name: string } | null;
    management_plan: ManagementPlan | null;
    management_cycle: string | null;
    credentials: HostingCredential[];
    email_accounts: EmailAccount[];
    payments: Payment[];
    invoices: Invoice[];
    domains: Domain[];
    redirect_of_id: number | null;
    redirect_of: RedirectHosting | null;
    redirects: RedirectHosting[];
}

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface Props {
    hosting: Hosting;
    paymentStats: {
        total_paid: number;
        total_unpaid: number;
        payments_count: number;
    };
    customers: Customer[];
}

/* ─────── Config maps ─────── */

const statusMap: Record<string, { label: string; variant: 'active' | 'inactive' | 'cancelled' }> = {
    aktivni: { label: 'Aktivní', variant: 'active' },
    pozastaveno: { label: 'Pozastaveno', variant: 'inactive' },
    zruseno: { label: 'Zrušeno', variant: 'cancelled' },
};

const invoiceStatusConfig: Record<string, { label: string; className: string }> = {
    vystavena: { label: 'Vystavena', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    odeslana: { label: 'Odeslána', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    zaplacena: { label: 'Zaplacená', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    po_splatnosti: { label: 'Po splatnosti', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    storno: { label: 'Storno', className: 'bg-muted text-muted-foreground border-border' },
};

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
    zaplaceno: { label: 'Zaplaceno', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    nezaplaceno: { label: 'Nezaplaceno', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    po_splatnosti: { label: 'Po splatnosti', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

const managementCycleLabels: Record<string, string> = {
    quarterly: 'Čtvrtletně',
    semi_annual: 'Pololetně',
    annual: 'Ročně',
};

const paymentMethodLabels: Record<string, string> = {
    prevod: 'Převodem',
    hotovost: 'Hotovost',
    karta: 'Kartou',
};

type TabId = 'prehled' | 'sprava' | 'pristupy' | 'platby';

const tabs: { id: TabId; label: string; icon: React.ElementType }[] = [
    { id: 'prehled', label: 'Přehled', icon: LayoutDashboard },
    { id: 'sprava', label: 'Správa', icon: Settings },
    { id: 'pristupy', label: 'Přístupy', icon: KeyRound },
    { id: 'platby', label: 'Platby & Faktury', icon: DollarSign },
];

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
                title={visible ? 'Skrýt' : 'Zobrazit'}
            >
                {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </button>
            <button
                onClick={handleCopy}
                className={`rounded p-1 transition-colors ${copied ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'}`}
                title={copied ? 'Zkopírováno!' : 'Kopírovat'}
            >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
        </div>
    );
}

function StorageBar({ used, quota }: { used: number; quota: number }) {
    const pct = quota > 0 ? Math.min(100, Math.round((used / quota) * 100)) : 0;
    const color = pct > 90 ? 'bg-red-400' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-400';
    return (
        <div>
            <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-muted-foreground">Úložiště</span>
                <span className="text-foreground text-xs">{used} / {quota} MB</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
            </div>
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

function PaymentForm({ hosting, onClose }: { hosting: Hosting; onClose: () => void }) {
    const defaultAmount = String(hosting.sell_yearly || '');
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
        post(`/hostingy/${hosting.id}/platby`, { onSuccess: () => onClose() });
    };

    const isPaid = data.status === 'zaplaceno';

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <Label className="text-muted-foreground">Částka (Kč)</Label>
                <Input type="number" value={data.amount} onChange={(e) => setData('amount', e.target.value)} placeholder="0" className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground" />
                {errors.amount && <p className="mt-1 text-xs text-red-400">{errors.amount}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-muted-foreground">Období od</Label>
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
                    <Label className="text-muted-foreground">Období do</Label>
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
                    <Label className="text-muted-foreground">Způsob platby</Label>
                    <Select value={data.payment_method} onValueChange={(v) => setData('payment_method', v)}>
                        <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="prevod">Převodem</SelectItem>
                            <SelectItem value="hotovost">Hotovost</SelectItem>
                            <SelectItem value="karta">Kartou</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div>
                <Label className="text-muted-foreground">Poznámka</Label>
                <Textarea value={data.notes} onChange={(e) => setData('notes', e.target.value)} rows={2} className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none" />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={onClose} className="text-muted-foreground hover:text-foreground">Zrušit</Button>
                <Separator orientation="vertical" className="h-6 bg-border" />
                <Button type="submit" disabled={processing} className="bg-primary hover:bg-primary/80 text-white">
                    {processing ? 'Ukládám...' : 'Uložit platbu'}
                </Button>
            </div>
        </form>
    );
}

/* ─────── Tab: Přehled (merged from old Přehled + Hosting) ─────── */

function TabPrehled({ hosting }: { hosting: Hosting }) {
    const [activatingHosting, setActivatingHosting] = useState(false);
    const [activateResult, setActivateResult] = useState<{ success: boolean; message: string } | null>(null);

    const handleActivateHosting = async () => {
        setActivatingHosting(true);
        setActivateResult(null);
        try {
            const response = await fetch('/hostingy/activate-domain', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''),
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ domain_name: hosting.name }),
            });
            const data = await response.json();
            if (response.ok) {
                setActivateResult({ success: true, message: data.message ?? 'Hosting aktivován.' });
                setTimeout(() => router.reload(), 1500);
            } else {
                setActivateResult({ success: false, message: data.message ?? 'Aktivace selhala.' });
            }
        } catch {
            setActivateResult({ success: false, message: 'Síťová chyba.' });
        } finally {
            setActivatingHosting(false);
        }
    };

    const handleSyncHosting = async () => {
        setActivatingHosting(true);
        setActivateResult(null);
        try {
            const response = await fetch(`/hostingy/${hosting.id}/sync`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': decodeURIComponent(document.cookie.match(/XSRF-TOKEN=([^;]+)/)?.[1] ?? ''),
                    'Accept': 'application/json',
                },
            });
            const data = await response.json();
            if (response.ok) {
                setActivateResult({ success: true, message: data.message ?? 'Hosting synchronizován.' });
                setTimeout(() => router.reload(), 1500);
            } else {
                setActivateResult({ success: false, message: data.message ?? 'Synchronizace selhala.' });
            }
        } catch {
            setActivateResult({ success: false, message: 'Síťová chyba.' });
        } finally {
            setActivatingHosting(false);
        }
    };

    const hasHosting = !!(hosting.vps_server || hosting.server);
    const managementMonthly = hosting.management_plan ? Number(hosting.management_plan.price_monthly) : 0;
    const managementYearly = managementMonthly * 12;

    return (
        <div className="space-y-4">
            {/* Server card */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
                <SectionHeader icon={Server} title="Server" />
                <div className="px-5 py-4 space-y-1">
                    {hasHosting ? (
                        <>
                            <InfoRow label="Server">
                                {hosting.vps_server ? (
                                    <span className="font-medium">{hosting.vps_server.name}</span>
                                ) : hosting.server ? (
                                    <span className="font-mono text-xs">{hosting.server}</span>
                                ) : null}
                            </InfoRow>
                            <InfoRow label="Expirace">
                                {hosting.expires_at ? (
                                    <ExpirationBadge expiresAt={hosting.expires_at} />
                                ) : (
                                    <span className="text-muted-foreground/50">&mdash;</span>
                                )}
                            </InfoRow>
                            {hosting.storage_quota_mb > 0 && (
                                <div className="py-1.5">
                                    <StorageBar used={hosting.storage_used_mb} quota={hosting.storage_quota_mb} />
                                </div>
                            )}
                            {hosting.admin_url && (
                                <InfoRow label="Admin URL">
                                    <a href={hosting.admin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                                        Otevřít <ExternalLink className="h-3 w-3" />
                                    </a>
                                </InfoRow>
                            )}
                            {hosting.synced_at && (
                                <InfoRow label="Poslední sync">
                                    <span className="text-xs">{format(new Date(hosting.synced_at), 'd. M. yyyy HH:mm', { locale: cs })}</span>
                                </InfoRow>
                            )}
                        </>
                    ) : (
                        <div className="py-4 text-center">
                            <HardDrive className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground mb-4">Tento hosting nemá přiřazený server</p>
                            <Button
                                onClick={handleActivateHosting}
                                disabled={activatingHosting}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {activatingHosting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                                Aktivovat hosting na sss06
                            </Button>
                            {activateResult && (
                                <p className={`text-xs mt-3 ${activateResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {activateResult.message}
                                </p>
                            )}
                        </div>
                    )}
                </div>
                {/* Sync button when hosting already exists */}
                {hasHosting && (
                    <div className="px-5 pb-4 flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleSyncHosting}
                            disabled={activatingHosting}
                            className="text-muted-foreground hover:text-foreground hover:bg-accent border border-border"
                        >
                            {activatingHosting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                            Synchronizovat hosting
                        </Button>
                        {activateResult && (
                            <span className={`text-xs ${activateResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                                {activateResult.message}
                            </span>
                        )}
                    </div>
                )}
            </div>

            {/* Domény card */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
                <SectionHeader icon={Globe} title="Domény" count={hosting.domains?.length ?? 0} />
                <div className="px-5 py-4">
                    {(!hosting.domains || hosting.domains.length === 0) ? (
                        <div className="text-center py-4">
                            <Globe className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground">Žádné domény</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {hosting.domains.map((domain) => (
                                <a
                                    key={domain.id}
                                    href={`/domeny/${domain.id}`}
                                    className="flex items-center justify-between rounded-lg bg-accent px-3 py-2.5 hover:bg-accent/80 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-3.5 w-3.5 text-amber-500" />
                                        <span className="text-sm font-medium text-primary">{domain.name}</span>
                                        {domain.is_registered_by_us ? (
                                            <span className="inline-flex items-center gap-1 text-[10px]">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                                <span className="text-emerald-400">Vlastní</span>
                                            </span>
                                        ) : (
                                            <span className="text-[10px] text-muted-foreground/60">Externí</span>
                                        )}
                                    </div>
                                    <ExpirationBadge expiresAt={domain.expires_at} />
                                </a>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Redirecty card — only on parent hostings */}
            {hosting.redirects && hosting.redirects.length > 0 && (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <SectionHeader icon={Link2} title="Redirecty" count={hosting.redirects.length} />
                    <div className="px-5 py-4">
                        <div className="space-y-2">
                            {hosting.redirects.map((r) => (
                                <a
                                    key={r.id}
                                    href={`/hostingy/${r.id}`}
                                    className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors group"
                                >
                                    <span className="text-violet-400">↪</span>
                                    <span className="text-sm font-medium text-foreground group-hover:text-violet-400 transition-colors">{r.name}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Financial summary — Cena tabulka */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-foreground">Fakturace</h3>
                </div>
                <div className="p-5">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-xs text-muted-foreground uppercase tracking-wider">
                                    <th className="text-left pb-3 font-medium"></th>
                                    <th className="text-right pb-3 font-medium">Náklad</th>
                                    <th className="text-right pb-3 font-medium">Prodej</th>
                                    <th className="text-right pb-3 font-medium">Marže</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {/* Hosting row */}
                                <tr>
                                    <td className="py-2 text-muted-foreground">Hosting</td>
                                    <td className="py-2 text-right text-foreground">
                                        {parseFloat(String(hosting.cost_yearly)) ? formatCurrency(hosting.cost_yearly) : <span className="text-muted-foreground/50">—</span>}
                                    </td>
                                    <td className="py-2 text-right text-foreground">
                                        {parseFloat(String(hosting.sell_yearly)) ? formatCurrency(hosting.sell_yearly) : <span className="text-muted-foreground/50">—</span>}
                                    </td>
                                    <td className={`py-2 text-right ${(parseFloat(String(hosting.sell_yearly)) - parseFloat(String(hosting.cost_yearly))) > 0 ? 'text-emerald-400' : (parseFloat(String(hosting.sell_yearly)) - parseFloat(String(hosting.cost_yearly))) < 0 ? 'text-red-400' : 'text-foreground'}`}>
                                        {formatCurrency((parseFloat(String(hosting.sell_yearly)) || 0) - (parseFloat(String(hosting.cost_yearly)) || 0))}
                                    </td>
                                </tr>
                                {/* Management row */}
                                {managementMonthly > 0 && (
                                    <tr>
                                        <td className="py-2 text-muted-foreground">Správa ({hosting.management_plan?.name})</td>
                                        <td className="py-2 text-right text-muted-foreground/50">—</td>
                                        <td className="py-2 text-right text-foreground">{formatCurrency(managementMonthly)}/měs</td>
                                        <td className="py-2 text-right text-foreground"></td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-border font-semibold">
                                    <td className="pt-3 text-foreground">Celkem ročně</td>
                                    {(() => {
                                        const totalCost = parseFloat(String(hosting.cost_yearly)) || 0;
                                        const totalSell = (parseFloat(String(hosting.sell_yearly)) || 0) + managementYearly;
                                        const totalMargin = totalSell - totalCost;
                                        return (
                                            <>
                                                <td className="pt-3 text-right text-foreground">{formatCurrency(totalCost)}</td>
                                                <td className="pt-3 text-right text-foreground">{formatCurrency(totalSell)}</td>
                                                <td className={`pt-3 text-right ${totalMargin > 0 ? 'text-emerald-400' : totalMargin < 0 ? 'text-red-400' : 'text-foreground'}`}>
                                                    {formatCurrency(totalMargin)}
                                                </td>
                                            </>
                                        );
                                    })()}
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-2 text-sm">
                            <Switch
                                checked={hosting.auto_invoice}
                                onCheckedChange={(v) => router.put(`/hostingy/${hosting.id}`, { auto_invoice: v }, { preserveScroll: true })}
                                className="scale-90"
                            />
                            <span className="text-muted-foreground">Auto-fakturace hosting</span>
                        </div>
                        {hosting.management_plan && (
                            <div className="flex items-center gap-2 text-sm">
                                <Switch
                                    checked={hosting.auto_invoice_management}
                                    onCheckedChange={(v) => router.put(`/hostingy/${hosting.id}`, { auto_invoice_management: v }, { preserveScroll: true })}
                                    className="scale-90"
                                />
                                <span className="text-muted-foreground">Auto-fakturace správa</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Poznámky */}
            {hosting.notes && (
                <div className="bg-card border border-border rounded-lg px-5 py-4">
                    <h3 className="text-sm font-semibold text-foreground mb-2">Poznámky</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{hosting.notes}</p>
                </div>
            )}
        </div>
    );
}

/* ─────── Tab: Správa ─────── */

function TabSprava({ hosting }: { hosting: Hosting }) {
    const plan = hosting.management_plan;
    const monthlyPrice = plan ? Number(plan.price_monthly) : 0;

    return (
        <div className="space-y-4">
            {plan ? (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <SectionHeader icon={Settings} title="Balíček správy" />
                    <div className="px-5 py-4 space-y-1">
                        <InfoRow label="Balíček">
                            <span className="font-semibold text-foreground">{plan.name}</span>
                        </InfoRow>
                        <InfoRow label="Měsíční cena">
                            <span className="font-medium">{formatCurrency(monthlyPrice)}/měs</span>
                        </InfoRow>
                        {hosting.management_cycle && (
                            <InfoRow label="Fakturační cyklus">
                                <span>{managementCycleLabels[hosting.management_cycle] ?? hosting.management_cycle}</span>
                            </InfoRow>
                        )}
                        <InfoRow label="Auto-fakturace správy">
                            <span className={hosting.auto_invoice_management ? 'text-emerald-400 font-medium' : 'text-muted-foreground'}>
                                {hosting.auto_invoice_management ? 'Ano' : 'Ne'}
                            </span>
                        </InfoRow>
                        <Separator className="bg-border !my-3" />
                        <InfoRow label="Roční výše">
                            <span className="font-semibold text-foreground">{formatCurrency(monthlyPrice * 12)}/rok</span>
                        </InfoRow>
                        {hosting.management_cycle && (
                            <InfoRow label="Fakturační částka">
                                <span className="font-medium text-foreground">
                                    {hosting.management_cycle === 'quarterly' && formatCurrency(monthlyPrice * 3)}
                                    {hosting.management_cycle === 'semi_annual' && formatCurrency(monthlyPrice * 6)}
                                    {hosting.management_cycle === 'annual' && formatCurrency(monthlyPrice * 12)}
                                    {!['quarterly', 'semi_annual', 'annual'].includes(hosting.management_cycle ?? '') && formatCurrency(monthlyPrice)}
                                </span>
                            </InfoRow>
                        )}
                    </div>
                </div>
            ) : (
                <div className="bg-card border border-border rounded-lg px-5 py-8 text-center">
                    <Settings className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">Bez správy webu</p>
                    <p className="text-xs text-muted-foreground/60">Nastavte balíček přes tlačítko Upravit.</p>
                </div>
            )}
        </div>
    );
}

/* ─────── Tab: Přístupy ─────── */

function TabPristupy({ hosting }: { hosting: Hosting }) {
    return (
        <div className="space-y-4">
            <CredentialsSection hostingId={hosting.id} credentials={hosting.credentials} adminUrl={hosting.admin_url} />
            <EmailAccountsSection hostingId={hosting.id} hostingName={hosting.name} hostingServer={hosting.server} emailAccounts={hosting.email_accounts ?? []} />
        </div>
    );
}

function CopyCredentialButton({ credential, adminUrl }: { credential: HostingCredential; adminUrl: string | null }) {
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        const lines: string[] = [];
        lines.push(`Přístup: ${credential.label}`);
        if (adminUrl) lines.push(`URL: ${adminUrl}`);
        if (credential.login) lines.push(`Login: ${credential.login}`);
        if (credential.password) lines.push(`Heslo: ${credential.password}`);
        if (credential.email) lines.push(`E-mail: ${credential.email}`);

        navigator.clipboard.writeText(lines.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <button
            onClick={handleCopy}
            className={`rounded p-1.5 transition-colors ${copied ? 'text-emerald-500' : 'text-muted-foreground hover:bg-background hover:text-foreground'}`}
            title={copied ? 'Zkopírováno!' : 'Kopírovat přístupy'}
        >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
}

/* ─────── Credentials Section with CRUD ─────── */

function CredentialsSection({ hostingId, credentials, adminUrl }: {
    hostingId: number;
    credentials: HostingCredential[];
    adminUrl: string | null;
}) {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold text-foreground">Přístupové údaje</h2>
                    {credentials.length > 0 && (
                        <span className="text-xs text-muted-foreground">({credentials.length})</span>
                    )}
                </div>
                {!showForm && !editingId && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        Přidat
                    </button>
                )}
            </div>

            <div className="px-5 py-4">
                {adminUrl && (
                    <div className="flex items-center justify-between py-1.5 mb-2">
                        <span className="text-sm text-muted-foreground">Admin URL</span>
                        <a href={adminUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1">
                            Otevřít <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                )}

                {showForm && (
                    <CredentialForm
                        hostingId={hostingId}
                        onCancel={() => setShowForm(false)}
                        onSuccess={() => setShowForm(false)}
                    />
                )}

                {credentials.length === 0 && !showForm && !adminUrl && (
                    <p className="text-sm text-muted-foreground py-2">Žádné přístupové údaje</p>
                )}

                <div className="space-y-2">
                    {credentials.map((cred) =>
                        editingId === cred.id ? (
                            <CredentialForm
                                key={cred.id}
                                hostingId={hostingId}
                                credential={cred}
                                onCancel={() => setEditingId(null)}
                                onSuccess={() => setEditingId(null)}
                            />
                        ) : (
                            <div key={cred.id} className="rounded-lg bg-accent px-3 py-2.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Shield className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                        <span className="text-xs font-medium text-foreground">{cred.label}</span>
                                    </div>
                                    <div className="flex shrink-0 gap-0.5">
                                        <CopyCredentialButton credential={cred} adminUrl={adminUrl} />
                                        <button onClick={() => setEditingId(cred.id)} className="rounded p-1.5 text-muted-foreground hover:bg-background hover:text-foreground" title="Upravit">
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        <button onClick={() => setDeleteId(cred.id)} className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Smazat">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
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
                                {cred.email && (
                                    <div className="flex items-center justify-between py-0.5">
                                        <span className="text-xs text-muted-foreground">E-mail</span>
                                        <span className="text-sm text-foreground">{cred.email}</span>
                                    </div>
                                )}
                                {cred.notes && (
                                    <p className="text-xs text-muted-foreground/70 mt-1">{cred.notes}</p>
                                )}
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
                        router.delete(`/hostingy/credentials/${deleteId}`, { preserveScroll: true });
                        setDeleteId(null);
                    }
                }}
                title="Smazat přístup"
                message="Opravdu chcete smazat tyto přístupové údaje?"
            />
        </div>
    );
}

function CredentialForm({
    hostingId,
    credential,
    onCancel,
    onSuccess,
}: {
    hostingId: number;
    credential?: HostingCredential;
    onCancel: () => void;
    onSuccess: () => void;
}) {
    const isEdit = !!credential;
    const form = useForm({
        label: credential?.label ?? '',
        login: credential?.login ?? '',
        password: '',
        email: credential?.email ?? '',
        notes: credential?.notes ?? '',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            form.put(`/hostingy/credentials/${credential!.id}`, { preserveScroll: true, onSuccess });
        } else {
            form.post(`/hostingy/${hostingId}/credentials`, { preserveScroll: true, onSuccess: () => { form.reset(); onSuccess(); } });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-accent p-3 mb-2 space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-muted-foreground">Název *</Label>
                    <Input value={form.data.label} onChange={(e) => form.setData('label', e.target.value)} placeholder="např. WP admin" className="h-8 text-sm bg-background" />
                    {form.errors.label && <p className="text-xs text-red-400 mt-0.5">{form.errors.label}</p>}
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">Login</Label>
                    <Input value={form.data.login} onChange={(e) => form.setData('login', e.target.value)} placeholder="admin" className="h-8 text-sm bg-background" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-muted-foreground">Heslo {isEdit && <span className="text-muted-foreground/50">(prázdné = beze změny)</span>}</Label>
                    <Input type="text" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} placeholder={isEdit ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : 'heslo'} className="h-8 text-sm bg-background" />
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">E-mail</Label>
                    <Input type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} placeholder="email@doména.cz" className="h-8 text-sm bg-background" />
                </div>
            </div>
            <div>
                <Label className="text-xs text-muted-foreground">Poznámka</Label>
                <Input value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} placeholder="volitelné" className="h-8 text-sm bg-background" />
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">Zrušit</button>
                <button type="submit" disabled={form.processing} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/80 disabled:opacity-50">
                    {form.processing ? 'Ukládám...' : isEdit ? 'Uložit' : 'Přidat'}
                </button>
            </div>
        </form>
    );
}

/* ─────── Email Accounts Section ─────── */

function getMailServer(hostingServer: string | null): string {
    if (!hostingServer) return '';
    if (hostingServer.includes('sss06')) return 'webje.cz';
    // For other servers, use the server hostname directly
    return hostingServer.replace(/\.vas-server\.cz$/, '.vas-server.cz');
}

function CopyEmailButton({ email, hostingServer }: { email: EmailAccount; hostingServer: string | null }) {
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        const lines: string[] = [];
        lines.push(`E-mail: ${email.email}`);
        if (email.password) lines.push(`Heslo: ${email.password}`);
        const mailServer = getMailServer(hostingServer);
        if (mailServer) {
            lines.push(`IMAP/SMTP server: ${mailServer}`);
        }
        if (email.notes) lines.push(`Poznámka: ${email.notes}`);

        navigator.clipboard.writeText(lines.join('\n'));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <button
            onClick={handleCopy}
            className={`rounded p-1.5 transition-colors ${copied ? 'text-emerald-500' : 'text-muted-foreground hover:bg-background hover:text-foreground'}`}
            title={copied ? 'Zkopírováno!' : 'Kopírovat e-mail a heslo'}
        >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
    );
}

function EmailAccountsSection({ hostingId, hostingName, hostingServer, emailAccounts }: { hostingId: number; hostingName: string; hostingServer: string | null; emailAccounts: EmailAccount[] }) {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold text-foreground">E-mailové schránky</h2>
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
                        Přidat
                    </button>
                )}
            </div>

            <div className="px-5 py-4">
                {showForm && (
                    <EmailAccountForm
                        hostingId={hostingId}
                        hostingName={hostingName}
                        onCancel={() => setShowForm(false)}
                        onSuccess={() => setShowForm(false)}
                    />
                )}

                {emailAccounts.length === 0 && !showForm && (
                    <p className="text-sm text-muted-foreground py-2">Žádné e-mailové schránky</p>
                )}

                <div className="space-y-2">
                    {emailAccounts.map((ea) =>
                        editingId === ea.id ? (
                            <EmailAccountForm
                                key={ea.id}
                                hostingId={hostingId}
                                hostingName={hostingName}
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
                                        <span>{ea.quota_mb === 0 ? 'Neomezeně' : ea.quota_mb >= 1024 ? `${(ea.quota_mb / 1024).toFixed(0)} GB` : `${ea.quota_mb} MB`}</span>
                                        {ea.notes && <span>&middot; {ea.notes}</span>}
                                    </div>
                                </div>
                                {ea.password && <PasswordField password={ea.password} />}
                                <div className="flex shrink-0 gap-0.5">
                                    <CopyEmailButton email={ea} hostingServer={hostingServer} />
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
                message="Opravdu chcete smazat tento e-mailový účet z evidence?"
            />
        </div>
    );
}

function EmailAccountForm({
    hostingId,
    hostingName,
    emailAccount,
    onCancel,
    onSuccess,
}: {
    hostingId: number;
    hostingName: string;
    emailAccount?: EmailAccount;
    onCancel: () => void;
    onSuccess: () => void;
}) {
    const isEdit = !!emailAccount;
    const domain = hostingName;
    const existingUsername = emailAccount?.email?.split('@')[0] ?? '';

    const form = useForm({
        email: emailAccount?.email ?? '',
        password: '',
        quota_mb: emailAccount?.quota_mb ?? 3072,
        notes: emailAccount?.notes ?? '',
    });

    // Helper: set full email from username
    const setUsername = (username: string) => {
        form.setData('email', username ? `${username}@${domain}` : '');
    };

    const currentUsername = form.data.email.includes('@') ? form.data.email.split('@')[0] : form.data.email;

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            form.put(`/emaily/${emailAccount!.id}`, { preserveScroll: true, onSuccess });
        } else {
            form.post(`/hostingy/${hostingId}/emaily`, { preserveScroll: true, onSuccess: () => { form.reset(); onSuccess(); } });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-accent p-3 mb-2 space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-muted-foreground">E-mail *</Label>
                    <div className="flex items-center gap-0">
                        <Input type="text" value={currentUsername} onChange={(e) => setUsername(e.target.value.trim())} placeholder="info" className="h-8 text-sm bg-background rounded-r-none flex-1 min-w-0" />
                        <span className="inline-flex items-center rounded-r-md border border-l-0 border-border bg-muted px-2 h-8 text-xs text-muted-foreground whitespace-nowrap shrink-0">@{domain}</span>
                    </div>
                    {form.errors.email && <p className="text-xs text-red-400 mt-0.5">{form.errors.email}</p>}
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">Heslo {isEdit && <span className="text-muted-foreground/50">(prázdné = beze změny)</span>}</Label>
                    <Input type="text" value={form.data.password} onChange={(e) => form.setData('password', e.target.value)} placeholder={isEdit ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : 'heslo'} className="h-8 text-sm bg-background" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <Label className="text-xs text-muted-foreground">Kvóta (MB) <span className="text-muted-foreground/50">— 0 = neomezeně</span></Label>
                    <Input type="number" value={form.data.quota_mb} onChange={(e) => form.setData('quota_mb', parseInt(e.target.value) || 0)} min={0} className="h-8 text-sm bg-background" />
                </div>
                <div>
                    <Label className="text-xs text-muted-foreground">Poznámka</Label>
                    <Input type="text" value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} placeholder="např. hlavní schránka" className="h-8 text-sm bg-background" />
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground">Zrušit</button>
                <button type="submit" disabled={form.processing} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/80 disabled:opacity-50">
                    {form.processing ? 'Ukládám...' : isEdit ? 'Uložit' : 'Přidat'}
                </button>
            </div>
        </form>
    );
}

/* ─────── Tab: Platby & Faktury ─────── */

function TabPlatby({ hosting, paymentStats, onShowPaymentModal }: {
    hosting: Hosting;
    paymentStats: Props['paymentStats'];
    onShowPaymentModal: () => void;
}) {
    const handleMarkPaid = (paymentId: number) => {
        router.put(`/hostingy/${hosting.id}/platby/${paymentId}/zaplaceno`, {});
    };

    return (
        <div className="space-y-4">
            {/* Platební historie */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
                <SectionHeader
                    icon={ReceiptText}
                    title="Platební historie"
                    count={paymentStats.payments_count}
                    action={
                        <Button size="sm" onClick={onShowPaymentModal} className="bg-primary hover:bg-primary/80 text-white h-7 px-3 text-xs">
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Nová platba
                        </Button>
                    }
                />
                {hosting.payments.length === 0 ? (
                    <div className="px-5 py-8 text-center text-sm text-muted-foreground">Žádné platby</div>
                ) : (
                    <div className="divide-y divide-border">
                        {hosting.payments.map((payment) => (
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
            {hosting.invoices && hosting.invoices.length > 0 && (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <SectionHeader icon={FileText} title="Faktury" count={hosting.invoices.length} />
                    <div className="divide-y divide-border">
                        {hosting.invoices.map((inv) => {
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
    );
}

/* ─────── Main Component ─────── */

export default function HostingsShow({ hosting, paymentStats }: Props) {
    const [activeTab, setActiveTab] = useState<TabId>('prehled');
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [blacklistOnDelete, setBlacklistOnDelete] = useState(false);

    const statusInfo = statusMap[hosting.status];
    const isRedirect = !!hosting.redirect_of_id;
    const visibleTabs = isRedirect
        ? tabs.filter(t => t.id === 'prehled')
        : tabs;

    return (
        <AuthenticatedLayout
            title={hosting.name}
            breadcrumbs={[
                { label: 'Hostingy', href: '/hostingy' },
                { label: hosting.name },
            ]}
        >
            <div className="p-6 space-y-6 max-w-6xl mx-auto">
                {/* HEADER */}
                <div className="space-y-2">
                    {/* Row 1: Actions top-right */}
                    <div className="flex items-center justify-end gap-2">
                        {!hosting.is_free && !isRedirect && hosting.customer && (
                            <Button onClick={() => router.post(`/hostingy/${hosting.id}/faktura`)} className="bg-amber-600 text-white hover:bg-amber-700 border-0" size="sm">
                                <FileText className="h-3.5 w-3.5 mr-1.5" />
                                Vystavit fakturu
                            </Button>
                        )}
                        <Button onClick={() => router.visit(`/hostingy/${hosting.id}/edit`)} className="bg-[#ad9d8e]/15 text-[#ad9d8e] hover:bg-[#ad9d8e]/25 border border-[#ad9d8e]/25" size="sm">
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            Upravit
                        </Button>
                        <Button onClick={() => setShowDeleteConfirm(true)} className="bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/25" size="sm">
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Smazat
                        </Button>
                    </div>

                    {/* Row 2: Back + Name + Badges */}
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => router.visit('/hostingy')}
                            className="text-muted-foreground hover:text-foreground shrink-0 -ml-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <HardDrive className="h-6 w-6 text-sky-400 shrink-0" />
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{hosting.name}</h1>
                        {statusInfo && <StatusBadge status={statusInfo.variant}>{statusInfo.label}</StatusBadge>}
                        {hosting.redirect_of && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 border border-violet-500/25 px-2 py-0.5 text-[10px] font-semibold text-violet-400">
                                ↪ REDIRECT
                            </span>
                        )}
                        {hosting.is_free && !hosting.redirect_of_id && (
                            <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">ZDARMA</span>
                        )}
                    </div>

                    {/* Redirect info */}
                    {hosting.redirect_of && (
                        <div className="pl-10 flex items-center gap-2 text-sm text-violet-400">
                            <span>Redirect na</span>
                            <a href={`/hostingy/${hosting.redirect_of.id}`} className="font-medium hover:text-violet-300 transition-colors underline underline-offset-2">
                                {hosting.redirect_of.name}
                            </a>
                        </div>
                    )}

                    {/* Row 3: Customer */}
                    {hosting.customer && (
                        <div className="pl-10">
                            <a href={`/zakaznici/${hosting.customer.id}`} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                                {hosting.customer.company || hosting.customer.name}
                            </a>
                        </div>
                    )}
                </div>

                {/* TABS */}
                <div className="border-b border-border">
                    <nav className="flex gap-0 -mb-px">
                        {visibleTabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                        isActive
                                            ? 'border-primary text-foreground'
                                            : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* TAB CONTENT */}
                {activeTab === 'prehled' && <TabPrehled hosting={hosting} />}
                {activeTab === 'sprava' && <TabSprava hosting={hosting} />}
                {activeTab === 'pristupy' && <TabPristupy hosting={hosting} />}
                {activeTab === 'platby' && (
                    <TabPlatby
                        hosting={hosting}
                        paymentStats={paymentStats}
                        onShowPaymentModal={() => setShowPaymentModal(true)}
                    />
                )}
            </div>

            <GlassModal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Nová platba" maxWidth="max-w-lg">
                <PaymentForm hosting={hosting} onClose={() => setShowPaymentModal(false)} />
            </GlassModal>

            <ConfirmDialog
                open={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setBlacklistOnDelete(false); }}
                onConfirm={() => router.delete(`/hostingy/${hosting.id}`, { data: { blacklist: blacklistOnDelete } })}
                title="Smazat hosting"
                message={`Opravdu chcete smazat "${hosting.name}"?`}
            >
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={blacklistOnDelete}
                        onChange={(e) => setBlacklistOnDelete(e.target.checked)}
                        className="rounded border-border bg-background text-primary focus:ring-primary/50 h-4 w-4"
                    />
                    <span className="text-xs text-muted-foreground">
                        Přidat do výjimek syncu (nebude se znovu objevovat při synchronizaci)
                    </span>
                </label>
            </ConfirmDialog>
        </AuthenticatedLayout>
    );
}
