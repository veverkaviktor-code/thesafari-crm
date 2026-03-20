import { type FormEvent, useState, useCallback } from 'react';
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
import GlassModal from '@/components/ui/GlassModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
    CheckCircle,
    Globe,
    Server,
    Plus,
    RefreshCw,
    AlertCircle,
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

interface Website {
    id: number;
    customer_id: number | null;
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
    hosting_server_id: number | null;
    alias_of_id: number | null;
    alias_of: { id: number; name: string } | null;
    management_plan_id: number | null;
    management_plan: ManagementPlan | null;
    management_cycle: string | null;
    storage_quota_mb: number;
    storage_used_mb: number;
    synced_at: string | null;
    ip_address: string | null;
    alerts_ignored_at: string | null;
    customer: { id: number; name: string; company: string | null } | null;
    hosting_server: { id: number; name: string } | null;
    credentials: { id: number; label: string }[];
    email_accounts: { id: number; email: string }[];
    // Computed
    days_until_expiry: number | null;
    urgency: string;
    has_unpaid: boolean;
    yearly_margin: number;
}

interface VpsServer {
    id: number;
    name: string;
    customer: { id: number; name: string; company: string | null } | null;
    customer_id: number | null;
    price_yearly: number;
    api_hostname: string | null;
    ip_address: string | null;
    storage_total_gb: number;
    storage_used_mb: number;
    hostings_count: number;
    notes: string | null;
    status: string;
}

interface Payment {
    id: number;
    website_id: number;
    website: {
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
    websites: PaginatedData<Website>;
    payments: PaginatedData<Payment>;
    vpsServers: VpsServer[];
    stats: {
        total_websites: number;
        total_aliases: number;
        expired_count: number;
        total_vps: number;
        unpaid_count: number;
        unpaid_amount: number;
        arr_hosting: number;
        external_count: number;
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
    aktivni: { icon: Play, className: 'text-emerald-400', title: 'Aktivni' },
    pozastaveno: { icon: Pause, className: 'text-amber-400', title: 'Pozastaveno' },
    zruseno: { icon: CircleStop, className: 'text-red-400', title: 'Zruseno' },
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

interface VpsFormData {
    name: string;
    customer_id: string;
    price_yearly: string;
    ip_address: string;
    storage_total_gb: string;
    notes: string;
    status: string;
}

/* ─────── Column visibility ─────── */

const STORAGE_KEY = 'neniweb-col-config';

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
                <p className="text-xs font-medium text-muted-foreground px-2 pb-2">Zobrazene sloupce</p>
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

export default function NeniwebIndex({
    websites,
    payments,
    vpsServers,
    stats,
    managementPlans,
    customers,
    filterOptions,
    filters,
}: Props) {
    const [activeTab, setActiveTab] = useState(filters.tab || 'weby');
    const [syncing, setSyncing] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [deleteTarget, setDeleteTarget] = useState<Website | null>(null);
    const [deleting, setDeleting] = useState(false);

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

    // VPS state
    const [showVpsCreate, setShowVpsCreate] = useState(false);
    const [editVps, setEditVps] = useState<VpsServer | null>(null);
    const [deleteVpsTarget, setDeleteVpsTarget] = useState<VpsServer | null>(null);
    const [deletingVps, setDeletingVps] = useState(false);
    const [syncingVps, setSyncingVps] = useState(false);

    const vpsForm = useForm<VpsFormData>({
        name: '',
        customer_id: '',
        price_yearly: '',
        ip_address: '',
        storage_total_gb: '',
        notes: '',
        status: 'aktivni',
    });

    const handleSync = () => {
        setSyncing(true);
        router.post('/webove-sluzby/sync', {}, { onFinish: () => setSyncing(false) });
    };

    const handleSyncVps = () => {
        setSyncingVps(true);
        router.post('/webove-sluzby/vps/sync', {}, { onFinish: () => setSyncingVps(false) });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(`/webove-sluzby/${deleteTarget.id}`, {
            onSuccess: () => { setDeleteTarget(null); setDeleting(false); },
            onError: () => setDeleting(false),
        });
    };

    const handleDeleteVps = () => {
        if (!deleteVpsTarget) return;
        setDeletingVps(true);
        router.delete(`/webove-sluzby/vps/${deleteVpsTarget.id}`, {
            onSuccess: () => { setDeleteVpsTarget(null); setDeletingVps(false); },
            onError: () => setDeletingVps(false),
        });
    };

    const handleVpsSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (editVps) {
            vpsForm.put(`/webove-sluzby/vps/${editVps.id}`, {
                onSuccess: () => { setEditVps(null); vpsForm.reset(); },
            });
        } else {
            vpsForm.post('/webove-sluzby/vps', {
                onSuccess: () => { setShowVpsCreate(false); vpsForm.reset(); },
            });
        }
    };

    const openVpsEdit = (vps: VpsServer) => {
        vpsForm.setData({
            name: vps.name,
            customer_id: vps.customer_id ? String(vps.customer_id) : '',
            price_yearly: String(vps.price_yearly),
            ip_address: vps.ip_address ?? '',
            storage_total_gb: String(vps.storage_total_gb),
            notes: vps.notes ?? '',
            status: vps.status,
        });
        setEditVps(vps);
    };

    const handleMarkPaid = (payment: Payment) => {
        router.put(`/webove-sluzby/${payment.website_id}/platby/${payment.id}/zaplaceno`, {});
    };

    const handleBulkAction = (action: string, value?: string) => {
        router.post('/webove-sluzby/bulk-update', {
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
        router.get('/webove-sluzby', merged, { preserveState: true });
    }

    const handleColumnFilter = (filterKey: string, value: string) => {
        navigate({ [filterKey]: value });
    };

    const expiryFilters = [
        { value: '', label: 'Vse' },
        { value: 'active', label: 'Aktivni' },
        { value: 'expiring_soon', label: 'Brzy expiruje' },
        { value: 'expired', label: 'Po expiraci' },
        { value: 'no_expiry', label: 'Bez expirace' },
        { value: 'free', label: 'Zdarma' },
    ];

    // Column filter options
    const customerFilterOpts = customers.map((c) => ({ value: String(c.id), label: c.company || c.name }));
    const statusFilterOpts = [
        { value: 'aktivni', label: 'Aktivni' },
        { value: 'pozastaveno', label: 'Pozastaveno' },
        { value: 'zruseno', label: 'Zruseno' },
    ];
    const registrarFilterOpts = [
        { value: '1', label: 'Vlastni' },
        { value: '0', label: 'Externi' },
    ];
    const serverFilterOpts = (filterOptions?.servers ?? []).map((s) => ({ value: s, label: s }));
    const managementFilterOpts = managementPlans.map((p) => ({ value: String(p.id), label: p.name }));

    const columnFilters: Record<string, string> = {};
    for (const [k, v] of Object.entries(filters)) {
        if (k.startsWith('filter_') && v) columnFilters[k] = v;
    }

    // MRR calculation
    const mrr = stats.arr_hosting / 12;

    /* ─────── Website columns ─────── */

    const websiteColumns = [
        {
            key: 'name' as const,
            label: 'Nazev',
            sortable: true,
            render: (w: Website) => (
                <div className={`flex items-center gap-2 ${w.alias_of_id ? 'pl-5' : ''}`}>
                    {w.has_unpaid && <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />}
                    {w.alias_of_id ? (
                        <span className="text-muted-foreground/40 text-xs shrink-0">&lsub;</span>
                    ) : (
                        <Globe className="h-4 w-4 text-amber-500 shrink-0" />
                    )}
                    <span className={`font-medium ${w.alias_of_id ? 'text-muted-foreground' : 'text-foreground'}`}>{w.name}</span>
                    {w.alias_of_id && (
                        <span className="inline-flex items-center rounded-full bg-violet-500/15 border border-violet-500/25 px-1.5 py-0 text-[10px] font-semibold text-violet-400">
                            ALIAS
                        </span>
                    )}
                    {w.is_free && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0 text-[10px] font-semibold text-emerald-400">
                            ZDARMA
                        </span>
                    )}
                    {w.is_external && (
                        <span className="ml-1 inline-flex items-center rounded-full bg-zinc-500/15 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-500/25">
                            Externi
                        </span>
                    )}
                </div>
            ),
        },
        {
            key: 'customer' as const,
            label: 'Zakaznik',
            filterKey: 'filter_customer',
            filterOptions: customerFilterOpts,
            render: (w: Website) => (
                <span className="text-muted-foreground">
                    {w.customer ? w.customer.company || w.customer.name : '\u2014'}
                </span>
            ),
        },
        {
            key: 'registered' as const,
            label: 'Registrator',
            filterKey: 'filter_registered',
            filterOptions: registrarFilterOpts,
            render: (w: Website) => w.is_registered_by_us ? (
                <span className="inline-flex items-center gap-1.5 text-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-emerald-400 font-medium">Vlastni</span>
                </span>
            ) : (
                <span className="text-muted-foreground/60 text-xs">Externi</span>
            ),
        },
        {
            key: 'domain_expires_at' as const,
            label: 'Domena exp.',
            sortable: true,
            render: (w: Website) => w.domain_expires_at ? (
                <span className={`text-xs font-medium ${expirationStyle(w.domain_expires_at)}`}>
                    {format(new Date(w.domain_expires_at), 'd. M. yyyy', { locale: cs })}
                </span>
            ) : (
                <span className="text-xs text-muted-foreground/50">\u2014</span>
            ),
        },
        {
            key: 'server' as const,
            label: 'Server',
            filterKey: 'filter_server',
            filterOptions: serverFilterOpts,
            render: (w: Website) => {
                const serverName = w.hosting_server?.name || w.server;
                return serverName ? (
                    <span className="text-muted-foreground text-xs font-mono">{serverName}</span>
                ) : (
                    <span className="text-xs text-muted-foreground/50">\u2014</span>
                );
            },
        },
        {
            key: 'hosting_expires_at' as const,
            label: 'Hosting exp.',
            sortable: true,
            render: (w: Website) => w.hosting_expires_at ? (
                <span className={`text-xs font-medium ${expirationStyle(w.hosting_expires_at)}`}>
                    {format(new Date(w.hosting_expires_at), 'd. M. yyyy', { locale: cs })}
                </span>
            ) : (
                <span className="text-xs text-muted-foreground/50">\u2014</span>
            ),
        },
        {
            key: 'storage_used_mb' as const,
            label: 'Uloziste',
            sortable: true,
            render: (w: Website) => {
                if (!w.storage_quota_mb && !w.storage_used_mb) return <span className="text-muted-foreground/50 text-xs">\u2014</span>;
                if (!w.storage_quota_mb && w.storage_used_mb) {
                    const usedGb = w.storage_used_mb >= 1024;
                    const label = usedGb ? `${(w.storage_used_mb / 1024).toFixed(1)} GB` : `${w.storage_used_mb} MB`;
                    return <span className="text-xs text-muted-foreground font-medium">{label}</span>;
                }
                const pct = Math.min(100, Math.round((w.storage_used_mb / w.storage_quota_mb) * 100));
                const color = pct > 90 ? 'bg-red-400' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-400';
                return (
                    <div className="min-w-[80px]">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span>{w.storage_used_mb} MB</span>
                            <span>{w.storage_quota_mb} MB</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'sell_yearly' as const,
            label: 'Cena/rok',
            sortable: true,
            render: (w: Website) => (
                <span className="text-sm text-muted-foreground">
                    {w.sell_yearly ? formatCurrency(w.sell_yearly) : '\u2014'}
                </span>
            ),
        },
        {
            key: 'management_plan' as const,
            label: 'Sprava',
            filterKey: 'filter_management_plan',
            filterOptions: managementFilterOpts,
            render: (w: Website) => w.management_plan ? (
                <span className="text-xs text-foreground">{w.management_plan.name}</span>
            ) : (
                <span className="text-xs text-muted-foreground/50">\u2014</span>
            ),
        },
        {
            key: 'status' as const,
            label: 'Stav',
            filterKey: 'filter_status',
            filterOptions: statusFilterOpts,
            render: (w: Website) => {
                const si = statusIconMap[w.status];
                if (!si) return <span>{w.status}</span>;
                const Icon = si.icon;
                return <Icon className={`h-4 w-4 ${si.className}`} title={si.title} />;
            },
        },
        {
            key: 'actions' as const,
            label: '',
            className: 'w-[120px] text-right',
            render: (w: Website) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {!w.is_free && w.customer && (
                        <button
                            onClick={() => router.post(`/webove-sluzby/${w.id}/faktura`)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                            title="Vystavit fakturu"
                        >
                            <FileText className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        onClick={() => router.visit(`/webove-sluzby/${w.id}/edit`)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Upravit"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(w)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Smazat"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    /* ─────── VPS columns ─────── */

    const vpsColumns = [
        {
            key: 'name' as const,
            label: 'Nazev',
            sortable: true,
            render: (vps: VpsServer) => (
                <div className="flex items-center gap-2">
                    <HardDrive className="h-4 w-4 text-sky-400 shrink-0" />
                    <div>
                        <span className="font-medium text-foreground">{vps.name}</span>
                        {vps.ip_address && (
                            <p className="text-[10px] font-mono text-muted-foreground/60 leading-none mt-0.5">{vps.ip_address}</p>
                        )}
                    </div>
                </div>
            ),
        },
        {
            key: 'customer' as const,
            label: 'Zakaznik',
            render: (vps: VpsServer) => (
                <span className="text-muted-foreground">{vps.customer ? vps.customer.company || vps.customer.name : '\u2014'}</span>
            ),
        },
        {
            key: 'price_yearly' as const,
            label: 'Cena/rok',
            render: (vps: VpsServer) => (
                <span className="text-sm text-muted-foreground">{vps.price_yearly ? formatCurrency(vps.price_yearly) : '\u2014'}</span>
            ),
        },
        {
            key: 'hostings_count' as const,
            label: 'Webu',
            render: (vps: VpsServer) => <span className="text-sm text-foreground font-medium">{vps.hostings_count}</span>,
        },
        {
            key: 'storage_used_mb' as const,
            label: 'Uloziste',
            render: (vps: VpsServer) => {
                if (!vps.storage_total_gb) return <span className="text-muted-foreground/50 text-sm">\u2014</span>;
                const totalMb = vps.storage_total_gb * 1024;
                const usedMb = vps.storage_used_mb;
                const pct = totalMb > 0 ? Math.min(100, Math.round((usedMb / totalMb) * 100)) : 0;
                const color = pct > 90 ? 'bg-red-400' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-400';
                const usedLabel = usedMb >= 1024 ? `${(usedMb / 1024).toFixed(1)} GB` : `${usedMb} MB`;
                return (
                    <div className="min-w-[90px]">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span>{usedLabel}</span>
                            <span>{vps.storage_total_gb} GB</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'status' as const,
            label: 'Stav',
            render: (vps: VpsServer) => {
                const si = statusIconMap[vps.status];
                if (!si) return <span>{vps.status}</span>;
                const Icon = si.icon;
                return <Icon className={`h-4 w-4 ${si.className}`} title={si.title} />;
            },
        },
        {
            key: 'actions' as const,
            label: '',
            className: 'w-[100px] text-right',
            render: (vps: VpsServer) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => openVpsEdit(vps)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Upravit">
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteVpsTarget(vps)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500" title="Smazat">
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    /* ─────── Payment columns ─────── */

    const paymentColumns = [
        {
            key: 'website' as const,
            label: 'Web',
            render: (p: Payment) => (
                <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="font-medium text-foreground">{p.website.name}</span>
                </div>
            ),
        },
        {
            key: 'customer' as const,
            label: 'Zakaznik',
            render: (p: Payment) => (
                <span className="text-muted-foreground">{p.website.customer ? p.website.customer.company || p.website.customer.name : '\u2014'}</span>
            ),
        },
        {
            key: 'period_start' as const,
            label: 'Obdobi',
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
            label: 'Castka',
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
                        {p.paid_at ? format(new Date(p.paid_at), 'd. M. yyyy', { locale: cs }) : '\u2014'}
                    </span>
                ),
        },
    ];

    return (
        <AuthenticatedLayout
            title="Webove sluzby"
            breadcrumbs={[{ label: 'Webove sluzby' }]}
        >
            <div className="p-6 space-y-6">
                {/* Stats bar — 4 key stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <button
                        onClick={() => { setActiveTab('weby'); navigate({ tab: 'weby', expiry_filter: '' }); }}
                        className="bg-card border border-border rounded-xl px-4 py-3 text-left transition-colors hover:border-primary/40"
                    >
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            Celkem webu
                        </p>
                        <p className="text-2xl font-semibold text-foreground">
                            {stats.total_websites}
                            {stats.total_aliases > 0 && (
                                <span className="text-sm font-normal text-muted-foreground ml-1.5">
                                    + {stats.total_aliases} aliasu
                                </span>
                            )}
                        </p>
                    </button>

                    <button
                        onClick={() => { setActiveTab('weby'); navigate({ tab: 'weby', expiry_filter: 'expiring_soon' }); }}
                        className="bg-card border border-border rounded-xl px-4 py-3 text-left transition-colors hover:border-amber-500/40"
                    >
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expiruje do 30 dni
                        </p>
                        <p className="text-2xl font-semibold text-amber-400">
                            {websites.data.filter((w) =>
                                w.hosting_expires_at &&
                                differenceInDays(new Date(w.hosting_expires_at), new Date()) >= 0 &&
                                differenceInDays(new Date(w.hosting_expires_at), new Date()) <= 30
                            ).length}
                        </p>
                    </button>

                    <button
                        onClick={() => { setActiveTab('weby'); navigate({ tab: 'weby', expiry_filter: 'expired' }); }}
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
                            <TabsTrigger value="weby" className="data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground">
                                <Globe className="h-4 w-4 mr-2" />
                                Weby ({websites.total})
                            </TabsTrigger>
                            <TabsTrigger value="vps" className="data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground">
                                <HardDrive className="h-4 w-4 mr-2" />
                                VPS ({stats.total_vps})
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
                            {activeTab === 'vps' ? (
                                <>
                                    <Button variant="ghost" onClick={handleSyncVps} disabled={syncingVps} className="text-muted-foreground hover:text-foreground border border-border">
                                        <RefreshCw className={`h-4 w-4 mr-2 ${syncingVps ? 'animate-spin' : ''}`} />
                                        Sync VPS
                                    </Button>
                                    <Button onClick={() => setShowVpsCreate(true)} className="bg-primary hover:bg-primary/80 text-white">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Novy VPS
                                    </Button>
                                </>
                            ) : activeTab === 'weby' ? (
                                <>
                                    <Button variant="ghost" onClick={handleSync} disabled={syncing} className="text-muted-foreground hover:text-foreground border border-border">
                                        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                        Sync z API
                                    </Button>
                                    {stats.pending_count > 0 && (
                                        <Button
                                            variant="ghost"
                                            onClick={() => router.visit('/webove-sluzby/pending')}
                                            className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/25"
                                        >
                                            <Bell className="h-4 w-4 mr-2" />
                                            Ke schvaleni ({stats.pending_count})
                                        </Button>
                                    )}
                                    <Button onClick={() => router.visit('/webove-sluzby/create')} className="bg-primary hover:bg-primary/80 text-white">
                                        <Plus className="h-4 w-4 mr-2" />
                                        Novy web
                                    </Button>
                                </>
                            ) : null}
                        </div>
                    </div>

                    {/* TAB: Weby */}
                    <TabsContent value="weby">
                        {selectedIds.size > 0 && (
                            <div className="flex items-center gap-3 mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
                                <span className="text-sm font-medium text-foreground">{selectedIds.size} vybrano</span>
                                <div className="flex items-center gap-1.5 ml-auto">
                                    <Select onValueChange={(v) => handleBulkAction('set_customer', v)}>
                                        <SelectTrigger className="h-7 w-auto gap-1 px-2.5 text-xs border-0 bg-transparent text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                                            <UserPlus className="h-3.5 w-3.5" />
                                            Zakaznik
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
                                                Sprava
                                            </SelectTrigger>
                                            <SelectContent position="popper" align="end" sideOffset={4}>
                                                <SelectItem value="none">Bez spravy</SelectItem>
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
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_status', 'aktivni')} className="h-7 px-2.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                                        <CheckCircle className="h-3.5 w-3.5 mr-1" />Aktivni
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_status', 'pozastaveno')} className="h-7 px-2.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                                        <Clock className="h-3.5 w-3.5 mr-1" />Pozastavit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_status', 'zruseno')} className="h-7 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                        <Ban className="h-3.5 w-3.5 mr-1" />Zrusit
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
                                    onClick={() => navigate({ tab: 'weby', expiry_filter: opt.value })}
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
                            data={websites.data}
                            columns={applyColumnConfig(websiteColumns, getConfig('weby'))}
                            pagination={{
                                current_page: websites.current_page,
                                last_page: websites.last_page,
                                per_page: websites.per_page,
                                total: websites.total,
                                from: null,
                                to: null,
                            }}
                            searchValue={filters.search}
                            onSearchChange={(search) => navigate({ search, tab: 'weby' })}
                            sortField={filters.sort_by}
                            sortDirection={filters.sort_dir as 'asc' | 'desc'}
                            onSort={(field) =>
                                navigate({
                                    sort_by: field,
                                    sort_dir: filters.sort_by === field && filters.sort_dir === 'asc' ? 'desc' : 'asc',
                                    tab: 'weby',
                                })
                            }
                            onPageChange={(page) => navigate({ page: String(page), tab: 'weby' })}
                            perPageOptions={[30, 50, 100]}
                            onPerPageChange={(n) => navigate({ per_page: String(n), tab: 'weby', page: '1' })}
                            onRowClick={(w) => router.visit(`/webove-sluzby/${w.id}`)}
                            emptyMessage="Zadne weby"
                            selectable
                            selectedIds={selectedIds}
                            onSelectionChange={setSelectedIds}
                            getItemId={(w) => w.id}
                            columnFilters={columnFilters}
                            onColumnFilterChange={handleColumnFilter}
                            toolbar={
                                <ColumnConfigDropdown
                                    columns={websiteColumns}
                                    config={getConfig('weby')}
                                    onToggle={(key) => toggleColumn('weby', key)}
                                    onMove={(key, dir) => moveColumn('weby', key, dir, websiteColumns)}
                                />
                            }
                        />
                    </TabsContent>

                    {/* TAB: VPS */}
                    <TabsContent value="vps">
                        <DataTable data={vpsServers} columns={vpsColumns} emptyMessage="Zadne VPS servery" />
                    </TabsContent>

                    {/* TAB: Platby */}
                    <TabsContent value="platby">
                        <div className="flex items-center gap-2 mb-4">
                            {[
                                { value: '', label: 'Vse' },
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
                            onRowClick={(p) => router.visit(`/webove-sluzby/${p.website_id}`)}
                            emptyMessage="Zadne platby"
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modal: VPS create/edit */}
            <GlassModal
                open={showVpsCreate || !!editVps}
                onClose={() => { setShowVpsCreate(false); setEditVps(null); vpsForm.reset(); }}
                title={editVps ? `Upravit VPS \u2014 ${editVps.name}` : 'Novy VPS server'}
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleVpsSubmit} className="space-y-5">
                    <div>
                        <Label className="text-muted-foreground">Nazev serveru</Label>
                        <Input value={vpsForm.data.name} onChange={(e) => vpsForm.setData('name', e.target.value)} placeholder="sss06.vas-server.cz" className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground" />
                        {vpsForm.errors.name && <p className="mt-1 text-xs text-red-400">{vpsForm.errors.name}</p>}
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Zakaznik</Label>
                        <Select value={vpsForm.data.customer_id} onValueChange={(v) => vpsForm.setData('customer_id', v === 'none' ? '' : v)}>
                            <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground"><SelectValue placeholder="Vyberte zakaznika (volitelne)" /></SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="none">Bez zakaznika</SelectItem>
                                {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.company || c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground">Cena / rok (Kc)</Label>
                            <Input type="number" value={vpsForm.data.price_yearly} onChange={(e) => vpsForm.setData('price_yearly', e.target.value)} placeholder="2500" className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground" />
                        </div>
                        <div>
                            <Label className="text-muted-foreground">IP adresa</Label>
                            <Input value={vpsForm.data.ip_address} onChange={(e) => vpsForm.setData('ip_address', e.target.value)} placeholder="37.235.108.29" className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground font-mono" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground">Uloziste celkem (GB)</Label>
                            <Input type="number" value={vpsForm.data.storage_total_gb} onChange={(e) => vpsForm.setData('storage_total_gb', e.target.value)} placeholder="500" className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground" />
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Stav</Label>
                            <Select value={vpsForm.data.status} onValueChange={(v) => vpsForm.setData('status', v)}>
                                <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    <SelectItem value="aktivni">Aktivni</SelectItem>
                                    <SelectItem value="neaktivni">Neaktivni</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        <Label className="text-muted-foreground">Poznamky</Label>
                        <Textarea value={vpsForm.data.notes} onChange={(e) => vpsForm.setData('notes', e.target.value)} rows={3} className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none" />
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={() => { setShowVpsCreate(false); setEditVps(null); vpsForm.reset(); }} className="text-muted-foreground hover:text-foreground">Zrusit</Button>
                        <Button type="submit" disabled={vpsForm.processing} className="bg-primary hover:bg-primary/80 text-white">
                            {vpsForm.processing ? 'Ukladam...' : editVps ? 'Ulozit zmeny' : 'Vytvorit VPS'}
                        </Button>
                    </div>
                </form>
            </GlassModal>

            {/* Modal: Delete website */}
            <GlassModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Smazat web" maxWidth="max-w-md">
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Opravdu chcete smazat <span className="font-semibold text-foreground">{deleteTarget?.name}</span>? Tato akce se neda vratit.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setDeleteTarget(null)}>Zrusit</Button>
                        <Button variant="destructive" disabled={deleting} onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            <Trash2 className="h-4 w-4" />{deleting ? 'Mazu...' : 'Smazat'}
                        </Button>
                    </div>
                </div>
            </GlassModal>

            {/* Modal: Delete VPS */}
            <GlassModal open={!!deleteVpsTarget} onClose={() => setDeleteVpsTarget(null)} title="Smazat VPS server" maxWidth="max-w-md">
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Opravdu chcete smazat VPS <span className="font-semibold text-foreground">{deleteVpsTarget?.name}</span>?
                        {deleteVpsTarget && deleteVpsTarget.hostings_count > 0 && (
                            <span className="block mt-2 text-amber-400">
                                Upozorneni: Tento VPS obsahuje {deleteVpsTarget.hostings_count} prirazenych webu.
                            </span>
                        )}
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setDeleteVpsTarget(null)}>Zrusit</Button>
                        <Button variant="destructive" disabled={deletingVps} onClick={handleDeleteVps} className="bg-red-600 hover:bg-red-700">
                            <Trash2 className="h-4 w-4" />{deletingVps ? 'Mazu...' : 'Smazat'}
                        </Button>
                    </div>
                </div>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
