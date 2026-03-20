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
import NeniwebForm, {
    defaultNeniwebData,
    type NeniwebFormData,
} from '@/components/neniweb/NeniwebForm';
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
    Archive,
    Gift,
    Ban,
    Pencil,
    Trash2,
    CalendarX2,
    FileText,
    Wrench,
    HardDrive,
    UserPlus,
    SlidersHorizontal,
    Play,
    Pause,
    CircleStop,
    ChevronRight,
    ChevronDown,
    FolderOpen,
    FolderClosed,
} from 'lucide-react';

interface Subscription {
    id: number;
    type: 'hosting' | 'domena' | 'sluzba';
    name: string;
    customer: { id: number; name: string; company: string | null } | null;
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
    auto_renew: boolean;
    status: string;
    has_unpaid: boolean;
    yearly_margin: number;
    is_registered_by_us: boolean;
    ip_address: string | null;
    storage_quota_mb: number;
    storage_used_mb: number;
    tariff: string | null;
    portal_domain_id: number | null;
    vas_hosting_id: number | null;
    synced_at: string | null;
    is_free: boolean;
    is_external: boolean;
    has_linked_hosting?: boolean;
    has_linked_domain?: boolean;
    folder_id: number | null;
    parent_subscription_id: number | null;
}

interface Folder {
    id: number;
    name: string;
    color: string | null;
    is_collapsed: boolean;
    sort_order: number;
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
    subscription_id: number;
    subscription: {
        id: number;
        name: string;
        type: string;
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
    domains: PaginatedData<Subscription>;
    hostings: PaginatedData<Subscription>;
    services: PaginatedData<Subscription>;
    payments: PaginatedData<Payment>;
    vpsServers: VpsServer[];
    folders: Folder[];
    stats: {
        total_domains: number;
        total_hostings: number;
        total_services: number;
        expired_count: number;
        total_vps: number;
        unpaid_count: number;
        unpaid_amount: number;
        arr_domains: number;
        arr_hostings: number;
        mrr_services: number;
        external_count: number;
        to_invoice_count: number;
        to_invoice_amount: number;
    };
    customers: Customer[];
    filterOptions: {
        servers: string[];
    };
    filters: Record<string, string | undefined>;
}

const statusMap: Record<string, { label: string; variant: string }> = {
    aktivni: { label: 'Aktivní', variant: 'active' },
    pozastaveno: { label: 'Pozastaveno', variant: 'inactive' },
    zruseno: { label: 'Zrušeno', variant: 'cancelled' },
};

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

const planLabelMap: Record<string, string> = {
    spravuji_sam: 'Spravuji sám',
    zaklad: 'Základ',
    klidny_spanek: 'Klidný spánek',
    aktivni_rozvoj: 'Aktivní rozvoj',
    vip_pece: 'VIP péče',
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

// --- Column visibility & reorder helpers ---
const STORAGE_KEY = 'neniweb-col-config';

interface ColConfig {
    hidden: string[];
    order: string[];
}

function loadColConfig(): Record<string, ColConfig> {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            // Migrate from old format
            const oldRaw = localStorage.getItem('neniweb-hidden-columns');
            if (oldRaw) {
                const old = JSON.parse(oldRaw) as Record<string, string[]>;
                const migrated: Record<string, ColConfig> = {};
                for (const [k, v] of Object.entries(old)) {
                    migrated[k] = { hidden: v, order: [] };
                }
                localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
                localStorage.removeItem('neniweb-hidden-columns');
                return migrated;
            }
            return {};
        }
        return JSON.parse(raw);
    } catch {
        return {};
    }
}

function saveColConfig(data: Record<string, ColConfig>) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Columns that cannot be hidden or moved (always first/last)
const LOCKED_COLUMNS = new Set(['name', 'actions']);

function applyColumnConfig<T extends { key: string }>(
    columns: T[],
    config: ColConfig | undefined,
): T[] {
    if (!config) return columns;

    // Filter hidden
    let result = columns.filter((c) => LOCKED_COLUMNS.has(c.key) || !config.hidden.includes(c.key));

    // Apply order (only for non-locked columns)
    if (config.order.length > 0) {
        const nameCol = result.find((c) => c.key === 'name');
        const actionsCol = result.find((c) => c.key === 'actions');
        const middle = result.filter((c) => !LOCKED_COLUMNS.has(c.key));

        // Sort middle columns by order array
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
    // Get the current ordered list of toggleable columns (respecting current order)
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
                <p className="text-xs font-medium text-muted-foreground px-2 pb-2">
                    Zobrazené sloupce
                </p>
                {ordered.map((col, idx) => {
                    const isHidden = config.hidden.includes(col.key);
                    return (
                        <div
                            key={col.key}
                            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-foreground hover:bg-accent"
                        >
                            <label className="flex items-center gap-2 flex-1 cursor-pointer">
                                <Checkbox
                                    checked={!isHidden}
                                    onCheckedChange={() => onToggle(col.key)}
                                />
                                <span className={isHidden ? 'text-muted-foreground/50' : ''}>
                                    {col.label}
                                </span>
                            </label>
                            <div className="flex items-center gap-0.5">
                                <button
                                    onClick={() => onMove(col.key, 'up')}
                                    disabled={idx === 0}
                                    className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-20 disabled:pointer-events-none"
                                >
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 9V3M3.5 5.5L6 3l2.5 2.5" />
                                    </svg>
                                </button>
                                <button
                                    onClick={() => onMove(col.key, 'down')}
                                    disabled={idx === ordered.length - 1}
                                    className="rounded p-0.5 text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-20 disabled:pointer-events-none"
                                >
                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M6 3v6M3.5 6.5L6 9l2.5-2.5" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </PopoverContent>
        </Popover>
    );
}

export default function NeniwebIndex({
    domains,
    hostings,
    services,
    payments,
    vpsServers,
    folders,
    stats,
    customers,
    filterOptions,
    filters,
}: Props) {
    const [activeTab, setActiveTab] = useState(filters.tab || 'domeny');
    const [showCreate, setShowCreate] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [selectedDomainIds, setSelectedDomainIds] = useState<Set<number>>(new Set());
    const [selectedHostingIds, setSelectedHostingIds] = useState<Set<number>>(new Set());
    const [selectedServiceIds, setSelectedServiceIds] = useState<Set<number>>(new Set());
    const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [showFolderForm, setShowFolderForm] = useState(false);
    const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
    const [deleteFolderId, setDeleteFolderId] = useState<number | null>(null);

    // Folder collapsed IDs — derived from server state
    const collapsedFolderIds = new Set(folders.filter(f => f.is_collapsed).map(f => f.id));

    // Filter out subscriptions in collapsed folders
    const filterByFolders = (items: Subscription[]) =>
        items.filter(s => !s.folder_id || !collapsedFolderIds.has(s.folder_id));

    // Column config state (visibility + order, persisted to localStorage)
    const [colConfigMap, setColConfigMap] = useState<Record<string, ColConfig>>(loadColConfig);

    const getConfig = useCallback((tab: string): ColConfig => {
        return colConfigMap[tab] ?? { hidden: [], order: [] };
    }, [colConfigMap]);

    const toggleColumn = useCallback((tab: string, key: string) => {
        setColConfigMap((prev) => {
            const cfg = prev[tab] ?? { hidden: [], order: [] };
            const hidden = cfg.hidden.includes(key)
                ? cfg.hidden.filter((k) => k !== key)
                : [...cfg.hidden, key];
            const updated = { ...prev, [tab]: { ...cfg, hidden } };
            saveColConfig(updated);
            return updated;
        });
    }, []);

    const moveColumn = useCallback((tab: string, key: string, direction: 'up' | 'down', allColumns: { key: string }[]) => {
        setColConfigMap((prev) => {
            const cfg = prev[tab] ?? { hidden: [], order: [] };
            // Build current order (non-locked columns)
            const nonLocked = allColumns.filter((c) => !LOCKED_COLUMNS.has(c.key)).map((c) => c.key);
            const currentOrder = cfg.order.length > 0
                ? [...cfg.order, ...nonLocked.filter((k) => !cfg.order.includes(k))]
                : [...nonLocked];

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

    const form = useForm<NeniwebFormData>({
        ...defaultNeniwebData,
        type: activeTab === 'domeny' ? 'domena' : activeTab === 'hostingy' ? 'hosting' : 'sluzba',
    });

    const vpsForm = useForm<VpsFormData>({
        name: '',
        customer_id: '',
        price_yearly: '',
        ip_address: '',
        storage_total_gb: '',
        notes: '',
        status: 'aktivni',
    });

    const handleCreateSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/neniweb', {
            onSuccess: () => {
                setShowCreate(false);
                form.reset();
            },
        });
    };

    const handleOpenCreate = () => {
        const typeMap: Record<string, string> = {
            domeny: 'domena',
            hostingy: 'hosting',
            sluzby: 'sluzba',
        };
        const newType = typeMap[activeTab] ?? 'domena';
        form.setData('type', newType);
        if (newType === 'sluzba') {
            form.setData('billing_cycle', 'monthly');
        }
        setShowCreate(true);
    };

    const handleSync = () => {
        setSyncing(true);
        router.post('/neniweb/sync', {}, {
            onFinish: () => setSyncing(false),
        });
    };

    const handleSyncVps = () => {
        setSyncingVps(true);
        router.post('/neniweb/vps/sync', {}, {
            onFinish: () => setSyncingVps(false),
        });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(`/neniweb/${deleteTarget.id}`, {
            onSuccess: () => { setDeleteTarget(null); setDeleting(false); },
            onError: () => setDeleting(false),
        });
    };

    const handleDeleteVps = () => {
        if (!deleteVpsTarget) return;
        setDeletingVps(true);
        router.delete(`/neniweb/vps/${deleteVpsTarget.id}`, {
            onSuccess: () => { setDeleteVpsTarget(null); setDeletingVps(false); },
            onError: () => setDeletingVps(false),
        });
    };

    const handleVpsSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (editVps) {
            vpsForm.put(`/neniweb/vps/${editVps.id}`, {
                onSuccess: () => {
                    setEditVps(null);
                    vpsForm.reset();
                },
            });
        } else {
            vpsForm.post('/neniweb/vps', {
                onSuccess: () => {
                    setShowVpsCreate(false);
                    vpsForm.reset();
                },
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
        router.put(`/neniweb/${payment.subscription_id}/platby/${payment.id}/zaplaceno`, {});
    };

    const handleBulkAction = (action: string, value?: string) => {
        const ids = activeTab === 'domeny'
            ? selectedDomainIds
            : activeTab === 'hostingy'
            ? selectedHostingIds
            : selectedServiceIds;

        router.post('/neniweb/bulk-update', {
            ids: Array.from(ids),
            action,
            value: value ?? null,
        }, {
            onSuccess: () => {
                setSelectedDomainIds(new Set());
                setSelectedHostingIds(new Set());
                setSelectedServiceIds(new Set());
            },
        });
    };

    function navigate(params: Record<string, string>) {
        const current: Record<string, string> = { tab: activeTab };
        // Preserve all current filter params
        for (const [k, v] of Object.entries(filters)) {
            if (v) current[k] = v;
        }
        const merged: Record<string, string> = { ...current, ...params };
        Object.keys(merged).forEach((k) => {
            if (!merged[k] || merged[k] === '') delete merged[k];
        });
        router.get('/neniweb', merged, { preserveState: true });
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
    const customerFilterOpts = customers.map((c) => ({
        value: String(c.id),
        label: c.company || c.name,
    }));
    const statusFilterOpts = [
        { value: 'aktivni', label: 'Aktivní' },
        { value: 'pozastaveno', label: 'Pozastaveno' },
        { value: 'zruseno', label: 'Zrušeno' },
    ];
    const boolYesNo = [
        { value: '1', label: 'Ano' },
        { value: '0', label: 'Ne' },
    ];
    const registrarFilterOpts = [
        { value: '1', label: 'VH (Naše)' },
        { value: '0', label: 'Externí' },
    ];
    const serverFilterOpts = (filterOptions?.servers ?? []).map((s) => ({
        value: s,
        label: s,
    }));
    // Build columnFilters record from URL params
    const columnFilters: Record<string, string> = {};
    for (const [k, v] of Object.entries(filters)) {
        if (k.startsWith('filter_') && v) columnFilters[k] = v;
    }

    const domainColumns = [
        {
            key: 'name' as const,
            label: 'Doména',
            sortable: true,
            render: (sub: Subscription) => (
                <div className="flex items-center gap-2">
                    {sub.has_unpaid && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    )}
                    <Globe className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="font-medium text-foreground">{sub.name}</span>
                    {sub.is_free && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0 text-[10px] font-semibold text-emerald-400">
                            ZDARMA
                        </span>
                    )}
                    {sub.is_external && <span className="ml-2 inline-flex items-center rounded-full bg-zinc-500/15 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-500/25">Externí</span>}
                </div>
            ),
        },
        {
            key: 'customer' as const,
            label: 'Zákazník',
            filterKey: 'filter_customer',
            filterOptions: customerFilterOpts,
            render: (sub: Subscription) => (
                <span className="text-muted-foreground">
                    {sub.customer
                        ? sub.customer.company || sub.customer.name
                        : '—'}
                </span>
            ),
        },
        {
            key: 'provider' as const,
            label: 'Registrár',
            filterKey: 'filter_registered',
            filterOptions: registrarFilterOpts,
            render: (sub: Subscription) => sub.is_registered_by_us ? (
                <span className="inline-flex items-center gap-1.5 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-emerald-400 font-medium">VH</span>
                </span>
            ) : (
                <span className="text-muted-foreground/60 text-sm">Externí</span>
            ),
        },
        {
            key: 'has_linked_hosting' as const,
            label: 'Hosting',
            filterKey: 'filter_has_hosting',
            filterOptions: boolYesNo,
            render: (sub: Subscription) => sub.has_linked_hosting ? (
                <span className="inline-flex items-center gap-1.5 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-emerald-400 font-medium">Ano</span>
                </span>
            ) : (
                <span className="inline-flex items-center gap-1.5 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                    <span className="text-muted-foreground/60">Ne</span>
                </span>
            ),
        },
        {
            key: 'expires_at' as const,
            label: 'Expirace',
            sortable: true,
            render: (sub: Subscription) => sub.expires_at ? (
                <span className={`text-sm font-medium ${expirationStyle(sub.expires_at)}`}>
                    {format(new Date(sub.expires_at), 'd. M. yyyy', { locale: cs })}
                </span>
            ) : (
                <span className="text-sm text-muted-foreground/50">—</span>
            ),
        },
        {
            key: 'auto_renew' as const,
            label: 'Auto-renew',
            filterKey: 'filter_auto_renew',
            filterOptions: boolYesNo,
            render: (sub: Subscription) => (
                <span
                    className={`text-sm ${sub.auto_renew ? 'text-green-400' : 'text-muted-foreground'}`}
                >
                    {sub.auto_renew ? 'Ano' : 'Ne'}
                </span>
            ),
        },
        {
            key: 'sell_yearly' as const,
            label: 'Prodejní cena',
            sortable: true,
            render: (sub: Subscription) => (
                <span className="text-sm text-muted-foreground">
                    {formatCurrency(sub.sell_yearly || sub.price_yearly)}
                </span>
            ),
        },
        {
            key: 'status' as const,
            label: 'Stav',
            filterKey: 'filter_status',
            filterOptions: statusFilterOpts,
            render: (sub: Subscription) => {
                const si = statusIconMap[sub.status];
                if (!si) return <span>{sub.status}</span>;
                const Icon = si.icon;
                return <Icon className={`h-4 w-4 ${si.className}`} title={si.title} />;
            },
        },
        {
            key: 'actions' as const,
            label: '',
            className: 'w-[120px] text-right',
            render: (sub: Subscription) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {!sub.is_free && sub.customer && (
                        <button
                            onClick={() => router.post(`/neniweb/${sub.id}/faktura`)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                            title="Vystavit fakturu"
                        >
                            <FileText className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        onClick={() => router.visit(`/neniweb/${sub.id}/edit`)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Upravit"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(sub)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Smazat"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    const hostingColumns = [
        {
            key: 'name' as const,
            label: 'Hosting',
            sortable: true,
            render: (sub: Subscription) => (
                <div className="flex items-center gap-2">
                    {sub.has_unpaid && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    )}
                    <Server className="h-4 w-4 text-blue-400 shrink-0" />
                    <span className="font-medium text-foreground">{sub.name}</span>
                    {sub.is_free && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0 text-[10px] font-semibold text-emerald-400">
                            ZDARMA
                        </span>
                    )}
                    {sub.is_external && <span className="ml-2 inline-flex items-center rounded-full bg-zinc-500/15 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-500/25">Externí</span>}
                </div>
            ),
        },
        {
            key: 'customer' as const,
            label: 'Zákazník',
            filterKey: 'filter_customer',
            filterOptions: customerFilterOpts,
            render: (sub: Subscription) => (
                <span className="text-muted-foreground">
                    {sub.customer
                        ? sub.customer.company || sub.customer.name
                        : '—'}
                </span>
            ),
        },
        {
            key: 'server' as const,
            label: 'Server',
            filterKey: 'filter_server',
            filterOptions: serverFilterOpts,
            render: (sub: Subscription) => (
                <span className="text-muted-foreground text-sm font-mono text-xs">{sub.server || '—'}</span>
            ),
        },
        {
            key: 'has_linked_domain' as const,
            label: 'Doména',
            filterKey: 'filter_has_domain',
            filterOptions: boolYesNo,
            render: (sub: Subscription) => sub.has_linked_domain ? (
                <span className="inline-flex items-center gap-1.5 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-emerald-400 font-medium">Ano</span>
                </span>
            ) : (
                <span className="inline-flex items-center gap-1.5 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 shrink-0" />
                    <span className="text-muted-foreground/60">Ne</span>
                </span>
            ),
        },
        {
            key: 'storage_used_mb' as const,
            label: 'Úložiště',
            sortable: true,
            render: (sub: Subscription) => {
                if (!sub.storage_quota_mb && !sub.storage_used_mb) return <span className="text-muted-foreground/50 text-sm">—</span>;
                if (!sub.storage_quota_mb && sub.storage_used_mb) {
                    const usedGb = sub.storage_used_mb >= 1024;
                    const label = usedGb ? `${(sub.storage_used_mb / 1024).toFixed(1)} GB` : `${sub.storage_used_mb} MB`;
                    return <span className="text-xs text-muted-foreground font-medium">{label}</span>;
                }
                const pct = Math.min(100, Math.round((sub.storage_used_mb / sub.storage_quota_mb) * 100));
                const color = pct > 90 ? 'bg-red-400' : pct > 70 ? 'bg-amber-400' : 'bg-emerald-400';
                return (
                    <div className="min-w-[80px]">
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span>{sub.storage_used_mb} MB</span>
                            <span>{sub.storage_quota_mb} MB</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'expires_at' as const,
            label: 'Expirace',
            sortable: true,
            render: (sub: Subscription) => sub.expires_at ? (
                <span className={`text-sm font-medium ${expirationStyle(sub.expires_at)}`}>
                    {format(new Date(sub.expires_at), 'd. M. yyyy', { locale: cs })}
                </span>
            ) : (
                <span className="text-sm text-muted-foreground/50">—</span>
            ),
        },
        {
            key: 'auto_renew' as const,
            label: 'Auto-renew',
            filterKey: 'filter_auto_renew',
            filterOptions: boolYesNo,
            render: (sub: Subscription) => (
                <span
                    className={`text-sm ${sub.auto_renew ? 'text-green-400' : 'text-muted-foreground'}`}
                >
                    {sub.auto_renew ? 'Ano' : 'Ne'}
                </span>
            ),
        },
        {
            key: 'sell_yearly' as const,
            label: 'Prodejní cena',
            sortable: true,
            render: (sub: Subscription) => (
                <span className="text-sm text-muted-foreground">
                    {formatCurrency(sub.sell_yearly || sub.price_yearly)}
                </span>
            ),
        },
        {
            key: 'status' as const,
            label: 'Stav',
            filterKey: 'filter_status',
            filterOptions: statusFilterOpts,
            render: (sub: Subscription) => {
                const si = statusIconMap[sub.status];
                if (!si) return <span>{sub.status}</span>;
                const Icon = si.icon;
                return <Icon className={`h-4 w-4 ${si.className}`} title={si.title} />;
            },
        },
        {
            key: 'actions' as const,
            label: '',
            className: 'w-[120px] text-right',
            render: (sub: Subscription) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {!sub.is_free && sub.customer && (
                        <button
                            onClick={() => router.post(`/neniweb/${sub.id}/faktura`)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                            title="Vystavit fakturu"
                        >
                            <FileText className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        onClick={() => router.visit(`/neniweb/${sub.id}/edit`)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Upravit"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(sub)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Smazat"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    const serviceColumns = [
        {
            key: 'name' as const,
            label: 'Název služby',
            sortable: true,
            render: (sub: Subscription) => (
                <div className="flex items-center gap-2">
                    {sub.has_unpaid && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                    )}
                    <Wrench className="h-4 w-4 text-violet-400 shrink-0" />
                    <span className="font-medium text-foreground">{sub.name}</span>
                    {sub.is_free && (
                        <span className="inline-flex items-center rounded-full bg-emerald-500/15 border border-emerald-500/25 px-1.5 py-0 text-[10px] font-semibold text-emerald-400">
                            ZDARMA
                        </span>
                    )}
                    {sub.is_external && <span className="ml-2 inline-flex items-center rounded-full bg-zinc-500/15 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 border border-zinc-500/25">Externí</span>}
                </div>
            ),
        },
        {
            key: 'customer' as const,
            label: 'Zákazník',
            filterKey: 'filter_customer',
            filterOptions: customerFilterOpts,
            render: (sub: Subscription) => (
                <span className="text-muted-foreground">
                    {sub.customer
                        ? sub.customer.company || sub.customer.name
                        : '—'}
                </span>
            ),
        },
        {
            key: 'monthly_plan' as const,
            label: 'Plán',
            render: (sub: Subscription) => sub.monthly_plan ? (
                <span className="text-sm text-foreground">
                    {planLabelMap[sub.monthly_plan] ?? sub.monthly_plan}
                </span>
            ) : (
                <span className="text-sm text-muted-foreground/50">—</span>
            ),
        },
        {
            key: 'monthly_price' as const,
            label: 'Měsíční cena',
            sortable: true,
            render: (sub: Subscription) => (
                <span className="text-sm text-muted-foreground">
                    {sub.monthly_price ? formatCurrency(sub.monthly_price) + '/měs' : '—'}
                </span>
            ),
        },
        {
            key: 'status' as const,
            label: 'Stav',
            filterKey: 'filter_status',
            filterOptions: statusFilterOpts,
            render: (sub: Subscription) => {
                const si = statusIconMap[sub.status];
                if (!si) return <span>{sub.status}</span>;
                const Icon = si.icon;
                return <Icon className={`h-4 w-4 ${si.className}`} title={si.title} />;
            },
        },
        {
            key: 'actions' as const,
            label: '',
            className: 'w-[120px] text-right',
            render: (sub: Subscription) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {!sub.is_free && sub.customer && (
                        <button
                            onClick={() => router.post(`/neniweb/${sub.id}/faktura`)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                            title="Vystavit fakturu"
                        >
                            <FileText className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        onClick={() => router.visit(`/neniweb/${sub.id}/edit`)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Upravit"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(sub)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Smazat"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    const vpsColumns = [
        {
            key: 'name' as const,
            label: 'Název',
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
            label: 'Zákazník',
            render: (vps: VpsServer) => (
                <span className="text-muted-foreground">
                    {vps.customer
                        ? vps.customer.company || vps.customer.name
                        : '—'}
                </span>
            ),
        },
        {
            key: 'price_yearly' as const,
            label: 'Cena/rok',
            render: (vps: VpsServer) => (
                <span className="text-sm text-muted-foreground">
                    {vps.price_yearly ? formatCurrency(vps.price_yearly) : '—'}
                </span>
            ),
        },
        {
            key: 'hostings_count' as const,
            label: 'Hostingů',
            render: (vps: VpsServer) => (
                <span className="text-sm text-foreground font-medium">{vps.hostings_count}</span>
            ),
        },
        {
            key: 'storage_used_mb' as const,
            label: 'Úložiště',
            render: (vps: VpsServer) => {
                if (!vps.storage_total_gb) return <span className="text-muted-foreground/50 text-sm">—</span>;
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
                    <button
                        onClick={() => openVpsEdit(vps)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Upravit"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setDeleteVpsTarget(vps)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Smazat"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    const paymentColumns = [
        {
            key: 'subscription' as const,
            label: 'Služba',
            render: (p: Payment) => (
                <div className="flex items-center gap-2">
                    {p.subscription.type === 'domena' ? (
                        <Globe className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : p.subscription.type === 'sluzba' ? (
                        <Wrench className="h-4 w-4 text-violet-400 shrink-0" />
                    ) : (
                        <Server className="h-4 w-4 text-blue-400 shrink-0" />
                    )}
                    <span className="font-medium text-foreground">{p.subscription.name}</span>
                </div>
            ),
        },
        {
            key: 'customer' as const,
            label: 'Zákazník',
            render: (p: Payment) => (
                <span className="text-muted-foreground">
                    {p.subscription.customer
                        ? p.subscription.customer.company || p.subscription.customer.name
                        : '—'}
                </span>
            ),
        },
        {
            key: 'period_start' as const,
            label: 'Období',
            render: (p: Payment) => (
                <span className="text-sm text-muted-foreground">
                    {format(new Date(p.period_start), 'd. M. yyyy', { locale: cs })}
                    {' – '}
                    {format(new Date(p.period_end), 'd. M. yyyy', { locale: cs })}
                </span>
            ),
        },
        {
            key: 'amount' as const,
            label: 'Částka',
            render: (p: Payment) => (
                <span className="text-sm font-medium text-foreground">
                    {formatCurrency(p.amount)}
                </span>
            ),
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
                        onClick={(e) => {
                            e.stopPropagation();
                            handleMarkPaid(p);
                        }}
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-7 px-2 text-xs"
                    >
                        Zaplatit
                    </Button>
                ) : (
                    <span className="text-xs text-muted-foreground">
                        {p.paid_at
                            ? format(new Date(p.paid_at), 'd. M. yyyy', { locale: cs })
                            : '—'}
                    </span>
                ),
        },
    ];

    const createButtonLabel: Record<string, string> = {
        domeny: 'Nová doména',
        hostingy: 'Nový hosting',
        sluzby: 'Nová služba',
    };

    const showCreateButton = activeTab !== 'platby' && activeTab !== 'vps';

    return (
        <AuthenticatedLayout
            title="Webové služby"
            breadcrumbs={[{ label: 'Webové služby' }]}
        >
            <div className="p-6 space-y-6">
                {/* Stats bar */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <button
                        onClick={() => { setActiveTab('domeny'); navigate({ tab: 'domeny', expiry_filter: '' }); }}
                        className="bg-card border border-border rounded-xl px-4 py-3 text-left transition-colors hover:border-primary/40"
                    >
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            Domény
                        </p>
                        <div className="flex items-baseline justify-between">
                            <p className="text-2xl font-semibold text-foreground">{stats.total_domains}</p>
                            <p className="text-sm font-medium text-emerald-400"><span className="text-[10px] text-muted-foreground mr-0.5">ARR</span>{formatCurrency(stats.arr_domains)}<span className="text-xs text-muted-foreground">/rok</span></p>
                        </div>
                    </button>
                    <button
                        onClick={() => { setActiveTab('hostingy'); navigate({ tab: 'hostingy', expiry_filter: '' }); }}
                        className="bg-card border border-border rounded-xl px-4 py-3 text-left transition-colors hover:border-primary/40"
                    >
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Server className="h-3 w-3" />
                            Hostingy
                        </p>
                        <div className="flex items-baseline justify-between">
                            <p className="text-2xl font-semibold text-foreground">{stats.total_hostings}</p>
                            <p className="text-sm font-medium text-emerald-400"><span className="text-[10px] text-muted-foreground mr-0.5">ARR</span>{formatCurrency(stats.arr_hostings)}<span className="text-xs text-muted-foreground">/rok</span></p>
                        </div>
                    </button>
                    <button
                        onClick={() => { setActiveTab('sluzby'); navigate({ tab: 'sluzby', expiry_filter: '' }); }}
                        className="bg-card border border-border rounded-xl px-4 py-3 text-left transition-colors hover:border-primary/40"
                    >
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Wrench className="h-3 w-3" />
                            Služby
                        </p>
                        <div className="flex items-baseline justify-between">
                            <p className="text-2xl font-semibold text-foreground">{stats.total_services}</p>
                            <p className="text-sm font-medium text-emerald-400"><span className="text-[10px] text-muted-foreground mr-0.5">MRR</span>{formatCurrency(stats.mrr_services)}<span className="text-xs text-muted-foreground">/měs</span></p>
                        </div>
                    </button>
                    <button
                        onClick={() => { setActiveTab('domeny'); navigate({ tab: 'domeny', expiry_filter: 'expired' }); }}
                        className="bg-card border border-border rounded-xl px-4 py-3 text-left transition-colors hover:border-red-500/40"
                    >
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <CalendarX2 className="h-3 w-3" />
                            Expirované
                        </p>
                        <p className="text-2xl font-semibold text-red-400">{stats.expired_count}</p>
                    </button>
                    <button
                        onClick={() => { setActiveTab('platby'); navigate({ tab: 'platby' }); }}
                        className="bg-card border border-border rounded-xl px-4 py-3 text-left transition-colors hover:border-amber-500/40"
                    >
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Nezaplaceno
                        </p>
                        <div className="flex items-baseline justify-between">
                            <p className="text-2xl font-semibold text-amber-400">{stats.unpaid_count}</p>
                            {stats.unpaid_amount > 0 && (
                                <p className="text-sm font-medium text-amber-400">{formatCurrency(stats.unpaid_amount)}</p>
                            )}
                        </div>
                    </button>
                    {stats.to_invoice_count > 0 && (
                        <button
                            onClick={() => { setActiveTab('domeny'); navigate({ tab: 'domeny', expiry_filter: 'expired' }); }}
                            className="bg-card border border-border rounded-xl px-4 py-3 text-left transition-colors hover:border-primary/40"
                        >
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                K fakturaci
                            </p>
                            <div className="flex items-baseline justify-between">
                                <p className="text-2xl font-semibold text-primary">{stats.to_invoice_count}</p>
                                {stats.to_invoice_amount > 0 && (
                                    <p className="text-sm font-medium text-primary">{formatCurrency(stats.to_invoice_amount)}</p>
                                )}
                            </div>
                        </button>
                    )}
                    {stats.external_count > 0 && (
                        <div className="bg-card border border-border rounded-xl px-4 py-3 text-left">
                            <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                <UserPlus className="h-3 w-3" />
                                Externí
                            </p>
                            <p className="text-2xl font-semibold text-muted-foreground">{stats.external_count}</p>
                        </div>
                    )}
                </div>

                <Tabs
                    value={activeTab}
                    onValueChange={(v) => {
                        setActiveTab(v);
                        navigate({ tab: v });
                    }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <TabsList className="bg-muted border border-border">
                            <TabsTrigger
                                value="domeny"
                                className="data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground"
                            >
                                <Globe className="h-4 w-4 mr-2" />
                                Domény ({domains.total})
                            </TabsTrigger>
                            <TabsTrigger
                                value="hostingy"
                                className="data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground"
                            >
                                <Server className="h-4 w-4 mr-2" />
                                Hostingy ({hostings.total})
                            </TabsTrigger>
                            <TabsTrigger
                                value="sluzby"
                                className="data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground"
                            >
                                <Wrench className="h-4 w-4 mr-2" />
                                Služby ({stats.total_services})
                            </TabsTrigger>
                            <TabsTrigger
                                value="vps"
                                className="data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground"
                            >
                                <HardDrive className="h-4 w-4 mr-2" />
                                VPS ({stats.total_vps})
                            </TabsTrigger>
                            <TabsTrigger
                                value="platby"
                                className="data-[state=active]:bg-primary data-[state=active]:text-white text-muted-foreground"
                            >
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
                                    <Button
                                        variant="ghost"
                                        onClick={handleSyncVps}
                                        disabled={syncingVps}
                                        className="text-muted-foreground hover:text-foreground border border-border"
                                    >
                                        <RefreshCw className={`h-4 w-4 mr-2 ${syncingVps ? 'animate-spin' : ''}`} />
                                        Sync VPS
                                    </Button>
                                    <Button
                                        onClick={() => setShowVpsCreate(true)}
                                        className="bg-primary hover:bg-primary/80 text-white"
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Nový VPS
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button
                                        variant="ghost"
                                        onClick={handleSync}
                                        disabled={syncing}
                                        className="text-muted-foreground hover:text-foreground border border-border"
                                    >
                                        <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
                                        Sync z vas-hosting
                                    </Button>
                                    {showCreateButton && (
                                        <Button
                                            onClick={handleOpenCreate}
                                            className="bg-primary hover:bg-primary/80 text-white"
                                        >
                                            <Plus className="h-4 w-4 mr-2" />
                                            {createButtonLabel[activeTab] ?? 'Nový záznam'}
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* TAB: Domény */}
                    <TabsContent value="domeny">
                        {selectedDomainIds.size > 0 && (
                            <div className="flex items-center gap-3 mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
                                <span className="text-sm font-medium text-foreground">
                                    {selectedDomainIds.size} vybráno
                                </span>
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
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_free')} className="h-7 px-2.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                                        <Gift className="h-3.5 w-3.5 mr-1" />
                                        Zdarma
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('unset_free')} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground">
                                        <Ban className="h-3.5 w-3.5 mr-1" />
                                        Zpoplatnit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_status', 'aktivni')} className="h-7 px-2.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                        Aktivní
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_status', 'pozastaveno')} className="h-7 px-2.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                                        <Clock className="h-3.5 w-3.5 mr-1" />
                                        Pozastavit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_status', 'zruseno')} className="h-7 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                        <Ban className="h-3.5 w-3.5 mr-1" />
                                        Zrušit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_external')} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent">
                                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                                        Externí
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('unset_external')} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent">
                                        <Ban className="h-3.5 w-3.5 mr-1" />
                                        Naše
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setSelectedDomainIds(new Set())} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground">
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-2 mb-4">
                            {expiryFilters.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() =>
                                        navigate({
                                            tab: 'domeny',
                                            expiry_filter: opt.value,
                                        })
                                    }
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
                        <FolderBar folders={folders} subscriptions={domains.data} onNewFolder={() => setShowFolderForm(true)} onEditFolder={setEditingFolder} onDeleteFolder={setDeleteFolderId} />
                        <DataTable
                            data={filterByFolders(domains.data)}
                            columns={applyColumnConfig(domainColumns, getConfig('domeny'))}
                            pagination={{
                                current_page: domains.current_page,
                                last_page: domains.last_page,
                                per_page: domains.per_page,
                                total: domains.total,
                                from: null,
                                to: null,
                            }}
                            searchValue={filters.search}
                            onSearchChange={(search) =>
                                navigate({ search, tab: 'domeny' })
                            }
                            sortField={filters.sort_by}
                            sortDirection={filters.sort_dir as 'asc' | 'desc'}
                            onSort={(field) =>
                                navigate({
                                    sort_by: field,
                                    sort_dir: filters.sort_by === field && filters.sort_dir === 'asc' ? 'desc' : 'asc',
                                    tab: 'domeny',
                                })
                            }
                            onPageChange={(page) =>
                                navigate({
                                    domains_page: String(page),
                                    tab: 'domeny',
                                })
                            }
                            perPageOptions={[30, 50, 100]}
                            onPerPageChange={(n) =>
                                navigate({ per_page: String(n), tab: 'domeny', domains_page: '1' })
                            }
                            onRowClick={(sub) =>
                                router.visit(`/neniweb/${sub.id}`)
                            }
                            emptyMessage="Žádné domény"
                            selectable
                            selectedIds={selectedDomainIds}
                            onSelectionChange={setSelectedDomainIds}
                            getItemId={(sub) => sub.id}
                            columnFilters={columnFilters}
                            onColumnFilterChange={handleColumnFilter}
                            toolbar={
                                <ColumnConfigDropdown
                                    columns={domainColumns}
                                    config={getConfig('domeny')}
                                    onToggle={(key) => toggleColumn('domeny', key)}
                                    onMove={(key, dir) => moveColumn('domeny', key, dir, domainColumns)}
                                />
                            }
                        />
                    </TabsContent>

                    {/* TAB: Hostingy */}
                    <TabsContent value="hostingy">
                        {selectedHostingIds.size > 0 && (
                            <div className="flex items-center gap-3 mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
                                <span className="text-sm font-medium text-foreground">
                                    {selectedHostingIds.size} vybráno
                                </span>
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
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_free')} className="h-7 px-2.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                                        <Gift className="h-3.5 w-3.5 mr-1" />
                                        Zdarma
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('unset_free')} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground">
                                        <Ban className="h-3.5 w-3.5 mr-1" />
                                        Zpoplatnit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('clear_expiry')} className="h-7 px-2.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
                                        <CalendarX2 className="h-3.5 w-3.5 mr-1" />
                                        Bez expirace
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_status', 'aktivni')} className="h-7 px-2.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                        Aktivní
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_status', 'pozastaveno')} className="h-7 px-2.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                                        <Clock className="h-3.5 w-3.5 mr-1" />
                                        Pozastavit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_status', 'zruseno')} className="h-7 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                        <Ban className="h-3.5 w-3.5 mr-1" />
                                        Zrušit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_external')} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent">
                                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                                        Externí
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('unset_external')} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent">
                                        <Ban className="h-3.5 w-3.5 mr-1" />
                                        Naše
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setSelectedHostingIds(new Set())} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground">
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                        <div className="flex items-center gap-2 mb-4">
                            {expiryFilters.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() =>
                                        navigate({
                                            tab: 'hostingy',
                                            expiry_filter: opt.value,
                                        })
                                    }
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
                        <FolderBar folders={folders} subscriptions={hostings.data} onNewFolder={() => setShowFolderForm(true)} onEditFolder={setEditingFolder} onDeleteFolder={setDeleteFolderId} />
                        <DataTable
                            data={filterByFolders(hostings.data)}
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
                            onSearchChange={(search) =>
                                navigate({ search, tab: 'hostingy' })
                            }
                            sortField={filters.sort_by}
                            sortDirection={filters.sort_dir as 'asc' | 'desc'}
                            onSort={(field) =>
                                navigate({
                                    sort_by: field,
                                    sort_dir: filters.sort_by === field && filters.sort_dir === 'asc' ? 'desc' : 'asc',
                                    tab: 'hostingy',
                                })
                            }
                            onPageChange={(page) =>
                                navigate({
                                    hostings_page: String(page),
                                    tab: 'hostingy',
                                })
                            }
                            perPageOptions={[30, 50, 100]}
                            onPerPageChange={(n) =>
                                navigate({ per_page: String(n), tab: 'hostingy', hostings_page: '1' })
                            }
                            onRowClick={(sub) =>
                                router.visit(`/neniweb/${sub.id}`)
                            }
                            emptyMessage="Žádné hostingy"
                            selectable
                            selectedIds={selectedHostingIds}
                            onSelectionChange={setSelectedHostingIds}
                            getItemId={(sub) => sub.id}
                            columnFilters={columnFilters}
                            onColumnFilterChange={handleColumnFilter}
                            toolbar={
                                <ColumnConfigDropdown
                                    columns={hostingColumns}
                                    config={getConfig('hostingy')}
                                    onToggle={(key) => toggleColumn('hostingy', key)}
                                    onMove={(key, dir) => moveColumn('hostingy', key, dir, hostingColumns)}
                                />
                            }
                        />
                    </TabsContent>

                    {/* TAB: Služby */}
                    <TabsContent value="sluzby">
                        {selectedServiceIds.size > 0 && (
                            <div className="flex items-center gap-3 mb-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
                                <span className="text-sm font-medium text-foreground">
                                    {selectedServiceIds.size} vybráno
                                </span>
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
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_free')} className="h-7 px-2.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                                        <Gift className="h-3.5 w-3.5 mr-1" />
                                        Zdarma
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('unset_free')} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground">
                                        <Ban className="h-3.5 w-3.5 mr-1" />
                                        Zpoplatnit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_status', 'aktivni')} className="h-7 px-2.5 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10">
                                        <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                        Aktivní
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_status', 'pozastaveno')} className="h-7 px-2.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10">
                                        <Clock className="h-3.5 w-3.5 mr-1" />
                                        Pozastavit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_status', 'zruseno')} className="h-7 px-2.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10">
                                        <Ban className="h-3.5 w-3.5 mr-1" />
                                        Zrušit
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('set_external')} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent">
                                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                                        Externí
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => handleBulkAction('unset_external')} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent">
                                        <Ban className="h-3.5 w-3.5 mr-1" />
                                        Naše
                                    </Button>
                                    <Button size="sm" variant="ghost" onClick={() => setSelectedServiceIds(new Set())} className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground">
                                        <X className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        )}
                        <FolderBar folders={folders} subscriptions={services.data} onNewFolder={() => setShowFolderForm(true)} onEditFolder={setEditingFolder} onDeleteFolder={setDeleteFolderId} />
                        <DataTable
                            data={filterByFolders(services.data)}
                            columns={applyColumnConfig(serviceColumns, getConfig('sluzby'))}
                            pagination={{
                                current_page: services.current_page,
                                last_page: services.last_page,
                                per_page: services.per_page,
                                total: services.total,
                                from: null,
                                to: null,
                            }}
                            searchValue={filters.search}
                            onSearchChange={(search) =>
                                navigate({ search, tab: 'sluzby' })
                            }
                            sortField={filters.sort_by}
                            sortDirection={filters.sort_dir as 'asc' | 'desc'}
                            onSort={(field) =>
                                navigate({
                                    sort_by: field,
                                    sort_dir: filters.sort_by === field && filters.sort_dir === 'asc' ? 'desc' : 'asc',
                                    tab: 'sluzby',
                                })
                            }
                            onPageChange={(page) =>
                                navigate({
                                    services_page: String(page),
                                    tab: 'sluzby',
                                })
                            }
                            perPageOptions={[30, 50, 100]}
                            onPerPageChange={(n) =>
                                navigate({ per_page: String(n), tab: 'sluzby', services_page: '1' })
                            }
                            onRowClick={(sub) =>
                                router.visit(`/neniweb/${sub.id}`)
                            }
                            emptyMessage="Žádné správcovské služby"
                            selectable
                            selectedIds={selectedServiceIds}
                            onSelectionChange={setSelectedServiceIds}
                            getItemId={(sub) => sub.id}
                            columnFilters={columnFilters}
                            onColumnFilterChange={handleColumnFilter}
                            toolbar={
                                <ColumnConfigDropdown
                                    columns={serviceColumns}
                                    config={getConfig('sluzby')}
                                    onToggle={(key) => toggleColumn('sluzby', key)}
                                    onMove={(key, dir) => moveColumn('sluzby', key, dir, serviceColumns)}
                                />
                            }
                        />
                    </TabsContent>

                    {/* TAB: VPS */}
                    <TabsContent value="vps">
                        <DataTable
                            data={vpsServers}
                            columns={vpsColumns}
                            emptyMessage="Žádné VPS servery"
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
                                    onClick={() =>
                                        navigate({
                                            tab: 'platby',
                                            payment_status: opt.value,
                                        })
                                    }
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
                            onSearchChange={(search) =>
                                navigate({ search, tab: 'platby' })
                            }
                            sortField={filters.sort_by}
                            sortDirection={filters.sort_dir as 'asc' | 'desc'}
                            onSort={(field) =>
                                navigate({
                                    sort_by: field,
                                    sort_dir: filters.sort_by === field && filters.sort_dir === 'asc' ? 'desc' : 'asc',
                                    tab: 'platby',
                                })
                            }
                            onPageChange={(page) =>
                                navigate({
                                    payments_page: String(page),
                                    tab: 'platby',
                                })
                            }
                            perPageOptions={[30, 50, 100]}
                            onPerPageChange={(n) =>
                                navigate({ per_page: String(n), tab: 'platby', payments_page: '1' })
                            }
                            onRowClick={(p) =>
                                router.visit(`/neniweb/${p.subscription_id}`)
                            }
                            emptyMessage="Žádné platby"
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Modal: Nová doména / hosting / služba */}
            <GlassModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title={
                    activeTab === 'domeny'
                        ? 'Nová doména'
                        : activeTab === 'sluzby'
                        ? 'Nová služba'
                        : 'Nový hosting'
                }
                maxWidth="max-w-2xl"
            >
                <NeniwebForm
                    form={form}
                    onSubmit={handleCreateSubmit}
                    submitLabel="Uložit"
                    customers={customers}
                    folders={folders}
                    parentOptions={[...domains.data, ...hostings.data].map(s => ({ id: s.id, name: s.name, type: s.type }))}
                    onCancel={() => setShowCreate(false)}
                />
            </GlassModal>

            {/* Modal: Nový / upravit VPS */}
            <GlassModal
                open={showVpsCreate || !!editVps}
                onClose={() => {
                    setShowVpsCreate(false);
                    setEditVps(null);
                    vpsForm.reset();
                }}
                title={editVps ? `Upravit VPS — ${editVps.name}` : 'Nový VPS server'}
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleVpsSubmit} className="space-y-5">
                    <div>
                        <Label className="text-muted-foreground">Název serveru</Label>
                        <Input
                            value={vpsForm.data.name}
                            onChange={(e) => vpsForm.setData('name', e.target.value)}
                            placeholder="sss06.vas-server.cz"
                            className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                        />
                        {vpsForm.errors.name && (
                            <p className="mt-1 text-xs text-red-400">{vpsForm.errors.name}</p>
                        )}
                    </div>

                    <div>
                        <Label className="text-muted-foreground">Zákazník</Label>
                        <Select
                            value={vpsForm.data.customer_id}
                            onValueChange={(v) => vpsForm.setData('customer_id', v === 'none' ? '' : v)}
                        >
                            <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                                <SelectValue placeholder="Vyberte zákazníka (volitelné)" />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border">
                                <SelectItem value="none">Bez zákazníka</SelectItem>
                                {customers.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)}>
                                        {c.company || c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground">Cena / rok (Kč)</Label>
                            <Input
                                type="number"
                                value={vpsForm.data.price_yearly}
                                onChange={(e) => vpsForm.setData('price_yearly', e.target.value)}
                                placeholder="2500"
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                        <div>
                            <Label className="text-muted-foreground">IP adresa</Label>
                            <Input
                                value={vpsForm.data.ip_address}
                                onChange={(e) => vpsForm.setData('ip_address', e.target.value)}
                                placeholder="37.235.108.29"
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground font-mono"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground">Úložiště celkem (GB)</Label>
                            <Input
                                type="number"
                                value={vpsForm.data.storage_total_gb}
                                onChange={(e) => vpsForm.setData('storage_total_gb', e.target.value)}
                                placeholder="500"
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                        <div>
                            <Label className="text-muted-foreground">Stav</Label>
                            <Select
                                value={vpsForm.data.status}
                                onValueChange={(v) => vpsForm.setData('status', v)}
                            >
                                <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    <SelectItem value="aktivni">Aktivní</SelectItem>
                                    <SelectItem value="neaktivni">Neaktivní</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label className="text-muted-foreground">Poznámky</Label>
                        <Textarea
                            value={vpsForm.data.notes}
                            onChange={(e) => vpsForm.setData('notes', e.target.value)}
                            rows={3}
                            className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                                setShowVpsCreate(false);
                                setEditVps(null);
                                vpsForm.reset();
                            }}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Zrušit
                        </Button>
                        <Button
                            type="submit"
                            disabled={vpsForm.processing}
                            className="bg-primary hover:bg-primary/80 text-white"
                        >
                            {vpsForm.processing ? 'Ukládám...' : editVps ? 'Uložit změny' : 'Vytvořit VPS'}
                        </Button>
                    </div>
                </form>
            </GlassModal>

            {/* Modal: Smazat subscription */}
            <GlassModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Smazat službu"
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Opravdu chcete smazat{' '}
                        <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
                        Tato akce se nedá vrátit.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setDeleteTarget(null)}>
                            Zrušit
                        </Button>
                        <Button variant="destructive" disabled={deleting} onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            <Trash2 className="h-4 w-4" />
                            {deleting ? 'Mažu...' : 'Smazat'}
                        </Button>
                    </div>
                </div>
            </GlassModal>

            {/* Modal: Smazat VPS */}
            <GlassModal
                open={!!deleteVpsTarget}
                onClose={() => setDeleteVpsTarget(null)}
                title="Smazat VPS server"
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Opravdu chcete smazat VPS{' '}
                        <span className="font-semibold text-foreground">{deleteVpsTarget?.name}</span>?
                        {deleteVpsTarget && deleteVpsTarget.hostings_count > 0 && (
                            <span className="block mt-2 text-amber-400">
                                Upozornění: Tento VPS obsahuje {deleteVpsTarget.hostings_count} přiřazených hostingů.
                            </span>
                        )}
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setDeleteVpsTarget(null)}>
                            Zrušit
                        </Button>
                        <Button variant="destructive" disabled={deletingVps} onClick={handleDeleteVps} className="bg-red-600 hover:bg-red-700">
                            <Trash2 className="h-4 w-4" />
                            {deletingVps ? 'Mažu...' : 'Smazat'}
                        </Button>
                    </div>
                </div>
            </GlassModal>

            {/* Folder create/edit modal */}
            <GlassModal
                open={showFolderForm || !!editingFolder}
                onClose={() => { setShowFolderForm(false); setEditingFolder(null); }}
                title={editingFolder ? 'Upravit složku' : 'Nová složka'}
                maxWidth="max-w-sm"
            >
                <FolderForm
                    folder={editingFolder}
                    onSuccess={() => { setShowFolderForm(false); setEditingFolder(null); }}
                    onCancel={() => { setShowFolderForm(false); setEditingFolder(null); }}
                />
            </GlassModal>

            {/* Folder delete confirm */}
            <ConfirmDialog
                open={deleteFolderId !== null}
                onClose={() => setDeleteFolderId(null)}
                onConfirm={() => {
                    if (deleteFolderId !== null) {
                        router.delete(`/neniweb/slozky/${deleteFolderId}`, { preserveScroll: true });
                        setDeleteFolderId(null);
                    }
                }}
                title="Smazat složku"
                message="Opravdu chcete smazat tuto složku? Služby v ní zůstanou, jen budou bez složky."
                variant="warning"
            />
        </AuthenticatedLayout>
    );
}

/* ───── Folder Components ───── */

function FolderBar({
    folders,
    subscriptions,
    onNewFolder,
    onEditFolder,
    onDeleteFolder,
}: {
    folders: Folder[];
    subscriptions: Subscription[];
    onNewFolder: () => void;
    onEditFolder: (f: Folder) => void;
    onDeleteFolder: (id: number) => void;
}) {
    if (folders.length === 0 && subscriptions.length === 0) return null;

    const folderCounts = new Map<number, number>();
    subscriptions.forEach(s => {
        if (s.folder_id) folderCounts.set(s.folder_id, (folderCounts.get(s.folder_id) || 0) + 1);
    });

    // Only show folders that have items in this tab
    const relevantFolders = folders.filter(f => folderCounts.has(f.id));
    if (relevantFolders.length === 0) return null;

    return (
        <div className="flex flex-wrap items-center gap-2 mb-3">
            {relevantFolders.map(folder => {
                const count = folderCounts.get(folder.id) || 0;
                return (
                    <div key={folder.id} className="flex items-center gap-0.5 group">
                        <button
                            onClick={() => router.post(`/neniweb/slozky/${folder.id}/toggle`, {}, { preserveScroll: true })}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors border ${
                                folder.is_collapsed
                                    ? 'bg-muted/50 text-muted-foreground border-border'
                                    : 'bg-primary/10 text-primary border-primary/20'
                            }`}
                            title={folder.is_collapsed ? `Zobrazit ${count} položek` : `Skrýt ${count} položek`}
                        >
                            {folder.is_collapsed
                                ? <FolderClosed className="h-3 w-3" />
                                : <FolderOpen className="h-3 w-3" />
                            }
                            {folder.name}
                            <span className={`rounded-full px-1.5 text-[10px] ${
                                folder.is_collapsed ? 'bg-muted-foreground/20' : 'bg-primary/20'
                            }`}>
                                {count}
                            </span>
                        </button>
                        <button
                            onClick={() => onEditFolder(folder)}
                            className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-foreground transition-opacity"
                            title="Upravit"
                        >
                            <Pencil className="h-3 w-3" />
                        </button>
                        <button
                            onClick={() => onDeleteFolder(folder.id)}
                            className="opacity-0 group-hover:opacity-100 rounded p-1 text-muted-foreground hover:text-destructive transition-opacity"
                            title="Smazat složku"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                );
            })}
            <button
                onClick={onNewFolder}
                className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors border border-dashed border-border"
                title="Nová složka"
            >
                <Plus className="h-3 w-3" />
            </button>
        </div>
    );
}

function FolderForm({
    folder,
    onSuccess,
    onCancel,
}: {
    folder?: Folder | null;
    onSuccess: () => void;
    onCancel: () => void;
}) {
    const isEdit = !!folder;
    const form = useForm({
        name: folder?.name ?? '',
        color: folder?.color ?? '',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            form.put(`/neniweb/slozky/${folder!.id}`, {
                preserveScroll: true,
                onSuccess,
            });
        } else {
            form.post('/neniweb/slozky', {
                preserveScroll: true,
                onSuccess: () => { form.reset(); onSuccess(); },
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <Label>Název složky</Label>
                <Input
                    value={form.data.name}
                    onChange={(e) => form.setData('name', e.target.value)}
                    placeholder="např. Lukáš Klaška"
                    className="mt-1"
                    autoFocus
                />
                {form.errors.name && <p className="text-xs text-red-400 mt-1">{form.errors.name}</p>}
            </div>
            <div className="flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={onCancel}>Zrušit</Button>
                <Button type="submit" disabled={form.processing} className="bg-primary text-white hover:bg-primary/80">
                    {form.processing ? 'Ukládám...' : isEdit ? 'Uložit' : 'Vytvořit'}
                </Button>
            </div>
        </form>
    );
}
