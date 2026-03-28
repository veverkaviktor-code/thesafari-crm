import { type FormEvent, useState, useCallback, useMemo } from 'react';
import { router, useForm } from '@inertiajs/react';
import { formatCurrency } from '@/lib/utils';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import DataTable from '@/components/ui/DataTable';
import { differenceInDays } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import GlassModal from '@/components/ui/GlassModal';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
    CheckCircle,
    Globe,
    Server,
    Plus,
    RefreshCw,
    Clock,
    DollarSign,
    X,
    Gift,
    Ban,
    Pencil,
    Trash2,
    CalendarX2,
    FileText,
    HardDrive,
    UserPlus,
    SlidersHorizontal,
    Play,
    Pause,
    CircleStop,
    Bell,
    TrendingUp,
} from 'lucide-react';

/* ─────── Interfaces ─────── */

interface ManagementPlan {
    id: number;
    name: string;
    price_monthly: number | string;
    is_active: boolean;
    sort_order: number;
}

interface Hosting {
    id: number;
    customer_id: number | null;
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
    vps_server_id: number | null;
    management_plan_id: number | null;
    management_plan: ManagementPlan | null;
    management_cycle: string | null;
    storage_quota_mb: number;
    storage_used_mb: number;
    synced_at: string | null;
    ip_address: string | null;
    alerts_ignored_at: string | null;
    customer: { id: number; name: string; company: string | null } | null;
    vps_server: { id: number; name: string } | null;
    credentials: { id: number; label: string }[];
    email_accounts: { id: number; email: string }[];
    domains_count: number;
    // Computed
    days_until_expiry: number | null;
    urgency: string;
    has_unpaid: boolean;
    yearly_margin: number;
}

interface Payment {
    id: number;
    hosting_id: number;
    hosting: {
        id: number;
        name: string;
        customer_id: number;
        customer: { id: number; name: string; company: string | null } | null;
    };
    amount: number;
    period_start: string;
    period_end: string;
    status: string;
    paid_at: string | null;
    payment_method: string | null;
    notes: string | null;
}

interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface Props {
    hostings: PaginatedData<Hosting>;
    payments: PaginatedData<Payment>;
    stats: {
        total_hostings: number;
        total_domains: number;
        expiring_soon_count: number;
        expired_count: number;
        unpaid_count: number;
        unpaid_amount: number;
        arr_hosting: number;
        to_invoice_count: number;
        to_invoice_amount: number;
        pending_count: number;
    };
    managementPlans: ManagementPlan[];
    customers: Customer[];
    filterOptions: {
        servers: string[];
    };
    filters: Record<string, string | undefined>;
}

/* ─────── Helpers ─────── */

const statusIconMap: Record<string, { icon: typeof Play; className: string; title: string }> = {
    aktivni: { icon: Play, className: 'text-emerald-400', title: 'Aktivní' },
    pozastaveno: { icon: Pause, className: 'text-amber-400', title: 'Pozastaveno' },
    zruseno: { icon: CircleStop, className: 'text-red-400', title: 'Zrušeno' },
};

function expirationStyle(expiresAt: string | null): string {
    if (!expiresAt) return 'text-muted-foreground/50';
    const days = differenceInDays(new Date(expiresAt), new Date());
    if (days < 0) return 'text-red-400 bg-red-500/10 rounded px-1.5 py-0.5';
    if (days <= 30) return 'text-amber-400 bg-amber-500/10 rounded px-1.5 py-0.5';
    return 'text-emerald-400 bg-emerald-500/10 rounded px-1.5 py-0.5';
}

const paymentStatusConfig: Record<string, { label: string; className: string }> = {
    zaplaceno: { label: 'Zaplaceno', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    nezaplaceno: { label: 'Nezaplaceno', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    po_splatnosti: { label: 'Po splatnosti', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

function PaymentStatusBadge({ status }: { status: string }) {
    const config = paymentStatusConfig[status] ?? paymentStatusConfig.nezaplaceno;
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${config.className}`}>
            {config.label}
        </span>
    );
}

/* ─────── Column visibility ─────── */

const STORAGE_KEY = 'hostings-col-config';

interface ColConfig {
    hidden: string[];
    order: string[];
}

function loadColConfig(): Record<string, ColConfig> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return {};
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function saveColConfig(data: Record<string, ColConfig>) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

const LOCKED_COLUMNS = new Set(['name', 'actions']);

function applyColumnConfig<T extends { key: string }>(
    columns: T[],
    config: ColConfig | undefined,
): T[] {
    if (!config) return columns;
    let result = columns.filter((c) => LOCKED_COLUMNS.has(c.key) || !config.hidden.includes(c.key));
    if (config.order.length > 0) {
        const nameCol = result.find((c) => c.key === 'name');
        const actionsCol = result.find((c) => c.key === 'actions');
        const middle = result.filter((c) => !LOCKED_COLUMNS.has(c.key));
        middle.sort((a, b) => {
            const ai = config.order.indexOf(a.key);
            const bi = config.order.indexOf(b.key);
            if (ai === -1 && bi === -1) return 0;
            if (ai === -1) return 1;
            if (bi === -1) return -1;
            return ai - bi;
        });
        result = [...(nameCol ? [nameCol] : []), ...middle, ...(actionsCol ? [actionsCol] : [])];
    }
    return result;
}

function ColumnConfigDropdown({
    columns,
    config,
    onToggle,
    onMove,
}: {
    columns: { key: string; label: string }[];
    config: ColConfig;
    onToggle: (key: string) => void;
    onMove: (key: string, direction: 'up' | 'down') => void;
}) {
    const ordered = applyColumnConfig(
        columns.filter((c) => !LOCKED_COLUMNS.has(c.key) && c.label),
        { hidden: [], order: config.order },
    );
    if (ordered.length === 0) return null;

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground border border-border"
                >
                    <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
                    Sloupce
                </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 p-2 border-border bg-card">
                <p className="text-xs font-medium text-muted-foreground px-2 pb-2">Zobrazené sloupce</p>
                {ordered.map((col, idx) => {
                    const isHidden = config.hidden.includes(col.key);
                    return (
                        <div key={col.key} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-foreground hover:bg-accent">
                            <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                <Checkbox checked={!isHidden} onCheckedChange={() => onToggle(col.key)} />
                                <span className={isHidden ? 'text-muted-foreground/50' : ''}>{col.label}</span>
                            </label>
                            <div className="flex items-center gap-0.5">
                                <button onClick={() => onMove(col.key, 'up')} disabled={idx === 0} className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-20 disabled:pointer-events-none">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V3M3.5 5.5L6 3l2.5 2.5" /></svg>
                                </button>
                                <button onClick={() => onMove(col.key, 'down')} disabled={idx === ordered.length - 1} className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-20 disabled:pointer-events-none">
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3v6M3.5 6.5L6 9l2.5-2.5" /></svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </PopoverContent>
        </Popover>
    );
}

/* ─────── Main Component ─────── */

export default function HostingsIndex({
    hostings,
    payments,
    stats,
    managementPlans,
    customers,
    filterOptions,
    filters,
}: Props) {
    const [activeTab, setActiveTab] = useState(filters.tab || 'hostingy');
    const [syncingSss06, setSyncingSss06] = useState(false);
    const [syncingOnd08, setSyncingOnd08] = useState(false);
    const [syncingThaimassage, setSyncingThaimassage] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [deleteTarget, setDeleteTarget] = useState<Hosting | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [blacklistOnDelete, setBlacklistOnDelete] = useState(false);

    // Column config
    const [colConfigMap, setColConfigMap] = useState<Record<string, ColConfig>>(loadColConfig);
    const getConfig = useCallback((tab: string): ColConfig => colConfigMap[tab] ?? { hidden: [], order: [] }, [colConfigMap]);
    const toggleColumn = useCallback((tab: string, key: string) => {
        setColConfigMap((prev) => {
            const cfg = prev[tab] ?? { hidden: [], order: [] };
            const hidden = cfg.hidden.includes(key) ? cfg.hidden.filter((k) => k !== key) : [...cfg.hidden, key];
            const updated = { ...prev, [tab]: { ...cfg, hidden } };
            saveColConfig(updated);
            return updated;
        });
    }, []);
    const moveColumn = useCallback((tab: string, key: string, direction: 'up' | 'down', allColumns: { key: string }[]) => {
        setColConfigMap((prev) => {
            const cfg = prev[tab] ?? { hidden: [], order: [] };
            const nonLocked = allColumns.filter((c) => !LOCKED_COLUMNS.has(c.key)).map((c) => c.key);
            const currentOrder = cfg.order.length > 0 ? [...cfg.order, ...nonLocked.filter((k) => !cfg.order.includes(k))] : [...nonLocked];
            const idx = currentOrder.indexOf(key);
            if (idx === -1) return prev;
            const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
            if (swapIdx < 0 || swapIdx >= currentOrder.length) return prev;
            const newOrder = [...currentOrder];
            [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
            const updated = { ...prev, [tab]: { ...cfg, order: newOrder } };
            saveColConfig(updated);
            return updated;
        });
    }, []);

    const handleSyncSss06 = () => {
        setSyncingSss06(true);
        router.post('/hostingy/sync-sss06', {}, { onFinish: () => setSyncingSss06(false) });
    };

    const handleSyncOnd08 = () => {
        setSyncingOnd08(true);
        router.post('/hostingy/sync-ond08', {}, { onFinish: () => setSyncingOnd08(false) });
    };

    const handleSyncThaimassage = () => {
        setSyncingThaimassage(true);
        router.post('/hostingy/sync-thaimassage', {}, { onFinish: () => setSyncingThaimassage(false) });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(`/hostingy/${deleteTarget.id}`, {
            data: { blacklist: blacklistOnDelete },
            onSuccess: () => { setDeleteTarget(null); setDeleting(false); setBlacklistOnDelete(false); },
            onError: () => setDeleting(false),
        });
    };

    const handleMarkPaid = (payment: Payment) => {
        router.put(`/hostingy/${payment.hosting_id}/platby/${payment.id}/zaplaceno`, {});
    };

    const handleBulkAction = (action: string, value?: string) => {
        router.post('/hostingy/bulk-update', {
            ids: Array.from(selectedIds),
            action,
            value: value ?? null,
        }, { onSuccess: () => setSelectedIds(new Set()) });
    };

    function navigate(params: Record<string, string>) {
        const current: Record<string, string> = { tab: activeTab };
        for (const [k, v] of Object.entries(filters)) {
            if (v) current[k] = v;
        }
        const merged = { ...current, ...params };
        Object.keys(merged).forEach((k) => {
            if (!merged[k] || merged[k] === '') delete merged[k];
        });
        router.get('/hostingy', merged, { preserveState: true });
    }

    const handleColumnFilter = (filterKey: string, value: string) => {
        navigate({ [filterKey]: value });
    };

    const expiryFilters = [
        { value: '', label: 'Vše' },
        { value: 'active', label: 'Aktivní' },
        { value: 'expiring_soon', label: 'Brzy expiruje' },
        { value: 'expired', label: 'Po expiraci' },
        { value: 'no_expiry', label: 'Bez expirace' },
        { value: 'free', label: 'Zdarma' },
    ];

    // Column filter options
    const customerFilterOpts = customers.map((c) => ({ value: String(c.id), label: c.company || c.name }));
    const statusFilterOpts = [
        { value: 'aktivni', label: 'Aktivní' },
        { value: 'pozastaveno', label: 'Pozastaveno' },
        { value: 'zruseno', label: 'Zrušeno' },
    ];
    const serverFilterOpts = (filterOptions?.servers ?? []).map((s) => ({ value: s, label: s }));
    const managementFilterOpts = managementPlans.map((p) => ({ value: String(p.id), label: p.name }));
    const autoInvoiceFilterOpts = [
        { value: '1', label: 'Ano' },
        { value: '0', label: 'Ne' },
    ];

    const columnFilters: Record<string, string> = {};
    for (const [k, v] of Object.entries(filters)) {
        if (k.startsWith('filter_') && v) columnFilters[k] = v;
    }

    // MRR calculation
    const mrr = stats.arr_hosting / 12;

    /* ─────── Hosting columns ─────── */

    const hostingColumns = [
        {
            key: 'name' as const,
            label: 'Název',
            sortable: true,
            render: (h: Hosting) => (
                <div className="flex items-center gap-2">
                    {h.has_unpaid && <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />}
                    <HardDrive className="h-4 w-4 text-sky-400 shrink-0" />
                    <span className="font-medium text-foreground">{h.name}</span>
                    {h.is_free && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0 text-[10px] font-semibold text-emerald-400">
                            ZDARMA
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'customer' as const,
            label: 'Zákazník',
            filterKey: 'filter_customer',
            filterOptions: customerFilterOpts,
            render: (h: Hosting) => (
                <span className="text-muted-foreground">
                    {h.customer ? h.customer.company || h.customer.name : '—'}
                </span>
            ),
        },
        {
            key: 'server' as const,
            label: 'Server',
            filterKey: 'filter_server',
            filterOptions: serverFilterOpts,
            render: (h: Hosting) => {
                const serverName = h.vps_server?.name || h.server;
                return serverName ? (
                    <span className="text-muted-foreground text-xs font-mono">{serverName}</span>
                ) : (
                    <span className="text-xs text-muted-foreground/50">—</span>
                );
            },
        },
        {
            key: 'expires_at' as const,
            label: 'Expirace',
            sortable: true,
            render: (h: Hosting) => h.expires_at ? (
                <span className={`text-xs font-medium ${expirationStyle(h.expires_at)}`}>
                    {format(new Date(h.expires_at), 'd. M. yyyy', { locale: cs })}
                </span>
            ) : (
                <span className="text-xs text-muted-foreground/50">—</span>
            ),
        },
        {
            key: 'storage_used_mb' as const,
            label: 'Úložiště',
            sortable: true,
            render: (h: Hosting) => {
                if (!h.storage_quota_mb && !h.storage_used_mb) return <span className="text-muted-foreground/50 text-xs">—</span>;
                if (!h.storage_quota_mb && h.storage_used_mb) {
                    const usedGb = h.storage_used_mb >= 1024;
                    const label = usedGb ? `${(h.storage_used_mb / 1024).toFixed(1)} GB` : `${h.storage_used_mb} MB`;
                    return <span className="text-xs text-muted-foreground font-medium">{label}</span>;
                }
                const pct = Math.min(100, Math.round((h.storage_used_mb / h.storage_quota_mb) * 100));
                const color = pct > 90 ? 'bg-red-400' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-400';
                return (
                    <div className="min-w-[80px]">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span>{h.storage_used_mb} MB</span>
                            <span>{h.storage_quota_mb} MB</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'domains_count' as const,
            label: 'Domény',
            render: (h: Hosting) => h.domains_count > 0 ? (
                <span className="inline-flex items-center rounded-full bg-amber-500/15 border border-amber-500/25 px-1.5 py-0 text-[10px] font-semibold text-amber-400">
                    {h.domains_count}
                </span>
            ) : (
                <span className="text-xs text-muted-foreground/50">—</span>
            ),
        },
        {
            key: 'sell_yearly' as const,
            label: 'Cena/rok',
            sortable: true,
            render: (h: Hosting) => {
                const sell = parseFloat(String(h.sell_yearly)) || 0;
                const cost = parseFloat(String(h.cost_yearly)) || 0;
                if (sell > 0) return <span className="text-sm text-muted-foreground">{formatCurrency(sell)}</span>;
                if (cost > 0) return <span className="text-sm text-red-400/70" title="Pouze náklad (nefakturujeme)">−{formatCurrency(cost)}</span>;
                return <span className="text-sm text-muted-foreground/50">—</span>;
            },
        },
        {
            key: 'management_plan' as const,
            label: 'Správa',
            filterKey: 'filter_management_plan',
            filterOptions: managementFilterOpts,
            render: (h: Hosting) => h.management_plan ? (
                <span className="text-xs text-foreground">{h.management_plan.name}</span>
            ) : (
                <span className="text-xs text-muted-foreground/50">—</span>
            ),
        },
        {
            key: 'auto_invoice' as const,
            label: 'FA',
            filterKey: 'filter_auto_invoice',
            filterOptions: autoInvoiceFilterOpts,
            render: (h: Hosting) => h.auto_invoice
                ? <span className="text-emerald-400 text-xs font-medium" title="Auto-fakturace zapnuta">Ano</span>
                : <span className="text-muted-foreground/40 text-xs" title="Auto-fakturace vypnuta">Ne</span>,
        },
        {
            key: 'status' as const,
            label: 'Stav',
            filterKey: 'filter_status',
            filterOptions: statusFilterOpts,
            render: (h: Hosting) => {
                const si = statusIconMap[h.status];
                if (!si) return <span>{h.status}</span>;
                const Icon = si.icon;
                return <Icon className={`h-4 w-4 ${si.className}`} title={si.title} />;
            },
        },
        {
            key: 'actions' as const,
            label: '',
            className: 'w-[120px] text-right',
            render: (h: Hosting) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {!h.is_free && h.customer && (
                        <button
                            onClick={() => router.post(`/hostingy/${h.id}/faktura`)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                            title="Vystavit fakturu"
                        >
                            <FileText className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        onClick={() => router.visit(`/hostingy/${h.id}/edit`)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Upravit"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(h)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Smazat"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    /* ─────── Payment columns ─────── */

    const paymentColumns = [
        {
            key: 'hosting' as const,
            label: 'Hosting',
            render: (p: Payment) => (
                <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-sky-400 shrink-0" />
                    <span className="font-medium text-foreground">{p.hosting.name}</span>
                </div>
            ),
        },
        {
            key: 'customer' as const,
            label: 'Zákazník',
            render: (p: Payment) => (
                <span className="text-muted-foreground">{p.hosting.customer ? p.hosting.customer.company || p.hosting.customer.name : '—'}</span>
            ),
        },
        {
            key: 'period_start' as const,
            label: 'Období',
            render: (p: Payment) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(p.period_start), 'd. M. yyyy', { locale: cs })}
                    {' \u2013 '}
                    {format(new Date(p.period_end), 'd. M. yyyy', { locale: cs })}
                </span>
            ),
        },
        {
            key: 'amount' as const,
            label: 'Částka',
            render: (p: Payment) => <span className="text-sm font-medium text-foreground">{formatCurrency(p.amount)}</span>,
        },
        {
            key: 'status' as const,
            label: 'Stav',
            render: (p: Payment) => <PaymentStatusBadge status={p.status} />,
        },
        {
            key: 'actions' as const,
            label: 'Akce',
            render: (p: Payment) =>
                p.status !== 'zaplaceno' ? (
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => { e.stopPropagation(); handleMarkPaid(p); }}
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 px-2 text-xs"
                    >
                        Zaplatit
                    </Button>
                ) : (
                    <span className="text-xs text-muted-foreground">
                        {p.paid_at ? format(new Date(p.paid_at), 'd. M. yyyy', { locale: cs }) : '—'}
                    </span>
                ),
        },
    ];

    return (
        <AuthenticatedLayout
            title="Hostingy"
            breadcrumbs={[{ label: 'Hostingy' }]}
        >
            <div className="p-6 space-y-6">
                {/* Stats bar — 4 key stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <button
                        onClick={() => { setActiveTab('hostingy'); navigate({ tab: 'hostingy', expiry_filter: '' }); }}
                        className="bg-card border border-border rounded-xl px-4 py-3 text-left transition-colors hover:border-primary/40"
                    >
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <HardDrive className="h-3 w-3" />
                            Celkem hostingů
                        </p>
                        <p className="text-2xl font-semibold text-foreground">
                            {stats.total_hostings}
                        </p>
                    </button>

                    <button
                        onClick={() => { setActiveTab('hostingy'); navigate({ tab: 'hostingy', expiry_filter: 'expiring_soon' }); }}
                        className="bg-card border border-border rounded-xl px-4 py-3 text-left transition-colors hover:border-amber-500/40"
                    >
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expiruje do 30 dní
                        </p>
                        <p className="text-2xl font-semibold text-amber-400">
                            {stats.expiring_soon_count}
                        </p>
                    </button>

                    <button
                        onClick={() => { setActiveTab('hostingy'); navigate({ tab: 'hostingy', expiry_filter: 'expired' }); }}
                        className="bg-card border border-border rounded-xl px-4 py-3 text-left transition-colors hover:border-red-500/40"
                    >
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <CalendarX2 className="h-3 w-3" />
                            Po expiraci
                        </p>
                        <p className="text-2xl font-semibold text-red-400">{stats.expired_count}</p>
                    </button>

                    <div className="bg-card border border-border rounded-xl px-4 py-3 text-left">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            MRR
                        </p>
                        <p className="text-2xl font-semibold text-emerald-400">{formatCurrency(mrr)}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            ARR {formatCurrency(stats.arr_hosting)}
                        </p>
                    </div>
                </div>

                <Tabs
                    value={activeTab}
                    onValueChange={(v) => { setActiveTab(v); navigate({ tab: v }); }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <TabsList className="bg-muted border border-border">
                            <TabsTrigger value="hostingy" className="data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground">
                                <HardDrive className="h-4 w-4 mr-2" />
                                Hostingy ({hostings.total})
                            </TabsTrigger>
                            <TabsTrigger value="platby" className="data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground">
                                <DollarSign className="h-4 w-4 mr-2" />
                                Platby ({payments.total})
                                {stats.unpaid_count > 0 && (
                                    <span className="ml-1.5 inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-semibold">
                                        {stats.unpaid_count}
                                    </span>
                                )}
                            </TabsTrigger>
                        </TabsList>

                        <div className="flex items-center gap-2">
                            {activeTab === 'hostingy' && (
                                <>
                                    <Button variant="ghost" onClick={handleSyncSss06} disabled={syncingSss06} className="text-muted-foreground hover:text-foreground border border-border">
                                        <RefreshCw className={`h-4 w-4 mr-2 ${syncingSss06 ? 'animate-spin' : ''}`} />
                                        Sync sss06
                                    </Button>
                                    <Button variant="ghost" onClick={handleSyncOnd08} disabled={syncingOnd08} className="text-muted-foreground hover:text-foreground border border-border">
                                        <RefreshCw className={`h-4 w-4 mr-2 ${syncingOnd08 ? 'animate-spin' : ''}`} />
                                        Sync ond08
                                    </Button>
                                    <Button variant="ghost" onClick={handleSyncThaimassage} disabled={syncingThaimassage} className="text-muted-foreground hover:text-foreground border border-border">
                                        <RefreshCw className={`h-4 w-4 mr-2 ${syncingThaimassage ? 'animate-spin' : ''}`} />
                                        Sync thaimassage
                                    </Button>
                                    {stats.pending_count > 0 && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => router.visit('/hostingy/ke-schvaleni')}
                                            className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/25"
                                        >
                                            <Bell className="h-4 w-4 mr-2" />
                                            Ke schválení ({stats.pending_count})
                                        </Button>
                                    )}
                                    <Button onClick={() => router.visit('/hostingy/create')} className="bg-primary hover:bg-primary/80 text-white">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Nový hosting
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* TAB: Hostingy */}
                    <TabsContent value="hostingy">
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-3 mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
                                <span className="text-sm font-medium text-foreground">{selectedIds.size} vybráno</span>
                                <div className="flex items-center gap-1.5 ml-auto">
                                    <Select onValueChange={(v) => handleBulkAction('set_customer', v)}>
                                        <SelectTrigger className="h-7 w-auto gap-1 px-2.5 text-xs border-0 bg-transparent text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                                            <UserPlus className="h-3.5 w-3.5" />
                                            Zákazník
                                        </SelectTrigger>
                                        <SelectContent position="popper" align="end" sideOffset={4}>
                                            {customers.map((c) => (
                                                <SelectItem key={c.id} value={String(c.id)}>
                                                    {c.company ? `${c.company} (${c.name})` : c.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {managementPlans.length > 0 && (
                                        <Select onValueChange={(v) => handleBulkAction('set_management_plan', v)}>
                                            <SelectTrigger className="h-7 w-auto gap-1 px-2.5 text-xs border-0 bg-transparent text-violet-400 hover:text-violet-300 hover:bg-violet-500/10">
                                                Správa
                                            </SelectTrigger>
                                            <SelectContent position="popper" align="end" sideOffset={4}>
                                                <SelectItem value="none">Bez správy</SelectItem>
                                                {managementPlans.map((p) => (
                                                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_free')} className="h-7 px-2.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                                        <Gift className="h-3.5 w-3.5 mr-1" />Zdarma
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('unset_free')} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground">
                                        <Ban className="h-3.5 w-3.5 mr-1" />Zpoplatnit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_auto_invoice')} className="h-7 px-2.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                                        <FileText className="h-3.5 w-3.5 mr-1" />FA Ano
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('unset_auto_invoice')} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground">
                                        <FileText className="h-3.5 w-3.5 mr-1" />FA Ne
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_status', 'aktivni')} className="h-7 px-2.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                                        <CheckCircle className="h-3.5 w-3.5 mr-1" />Aktivní
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_status', 'pozastaveno')} className="h-7 px-2.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                                        <Clock className="h-3.5 w-3.5 mr-1" />Pozastavit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_status', 'zruseno')} className="h-7 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                        <Ban className="h-3.5 w-3.5 mr-1" />Zrušit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground">
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-2 mb-4">
                            {expiryFilters.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => navigate({ tab: 'hostingy', expiry_filter: opt.value })}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        (filters.expiry_filter || '') === opt.value
                                            ? 'bg-primary text-white'
                                            : 'bg-muted text-muted-foreground hover:text-foreground border border-border'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <DataTable
                            data={hostings.data}
                            columns={applyColumnConfig(hostingColumns, getConfig('hostingy'))}
                            pagination={{
                                current_page: hostings.current_page,
                                last_page: hostings.last_page,
                                per_page: hostings.per_page,
                                total: hostings.total,
                                from: null,
                                to: null,
                            }}
                            searchValue={filters.search}
                            onSearchChange={(search) => navigate({ search, tab: 'hostingy' })}
                            sortField={filters.sort_by}
                            sortDirection={filters.sort_dir as 'asc' | 'desc'}
                            onSort={(field) =>
                                navigate({
                                    sort_by: field,
                                    sort_dir: filters.sort_by === field && filters.sort_dir === 'asc' ? 'desc' : 'asc',
                                    tab: 'hostingy',
                                })
                            }
                            onPageChange={(page) => navigate({ page: String(page), tab: 'hostingy' })}
                            perPageOptions={[30, 50, 100]}
                            onPerPageChange={(n) => navigate({ per_page: String(n), tab: 'hostingy', page: '1' })}
                            onRowClick={(h) => router.visit(`/hostingy/${h.id}`)}
                            emptyMessage="Žádné hostingy"
                            selectable
                            selectedIds={selectedIds}
                            onSelectionChange={(ids) => setSelectedIds(ids)}
                            getItemId={(h) => h.id}
                            columnFilters={columnFilters}
                            onColumnFilterChange={handleColumnFilter}
                            toolbar={
                                <div className="flex items-center gap-1.5">
                                    <ColumnConfigDropdown
                                        columns={hostingColumns}
                                        config={getConfig('hostingy')}
                                        onToggle={(key) => toggleColumn('hostingy', key)}
                                        onMove={(key, dir) => moveColumn('hostingy', key, dir, hostingColumns)}
                                    />
                                </div>
                            }
                        />
                    </TabsContent>

                    {/* TAB: Platby */}
                    <TabsContent value="platby">
                        <div className="flex items-center gap-2 mb-4">
                            {[
                                { value: '', label: 'Vše' },
                                { value: 'nezaplaceno', label: 'Nezaplaceno' },
                                { value: 'po_splatnosti', label: 'Po splatnosti' },
                                { value: 'zaplaceno', label: 'Zaplaceno' },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => navigate({ tab: 'platby', payment_status: opt.value })}
                                    className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                        (filters.payment_status || '') === opt.value
                                            ? 'bg-primary text-white'
                                            : 'bg-muted text-muted-foreground hover:text-foreground border border-border'
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <DataTable
                            data={payments.data}
                            columns={paymentColumns}
                            pagination={{
                                current_page: payments.current_page,
                                last_page: payments.last_page,
                                per_page: payments.per_page,
                                total: payments.total,
                                from: null,
                                to: null,
                            }}
                            searchValue={filters.search}
                            onSearchChange={(search) => navigate({ search, tab: 'platby' })}
                            sortField={filters.sort_by}
                            sortDirection={filters.sort_dir as 'asc' | 'desc'}
                            onSort={(field) =>
                                navigate({
                                    sort_by: field,
                                    sort_dir: filters.sort_by === field && filters.sort_dir === 'asc' ? 'desc' : 'asc',
                                    tab: 'platby',
                                })
                            }
                            onPageChange={(page) => navigate({ payments_page: String(page), tab: 'platby' })}
                            perPageOptions={[30, 50, 100]}
                            onPerPageChange={(n) => navigate({ per_page: String(n), tab: 'platby', payments_page: '1' })}
                            onRowClick={(p) => router.visit(`/hostingy/${p.hosting_id}`)}
                            emptyMessage="Žádné platby"
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modal: Delete hosting */}
            <GlassModal open={!!deleteTarget} onClose={() => { setDeleteTarget(null); setBlacklistOnDelete(false); }} title="Smazat hosting" maxWidth="max-w-md">
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Opravdu chcete smazat <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? Tato akce se nedá vrátit.
                    </p>
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
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => { setDeleteTarget(null); setBlacklistOnDelete(false); }}>Zrušit</Button>
                        <Button variant="destructive" disabled={deleting} onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            <Trash2 className="h-4 w-4" />{deleting ? 'Mažu...' : 'Smazat'}
                        </Button>
                    </div>
                </div>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
