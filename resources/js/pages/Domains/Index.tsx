import { useState } from 'react';
import { router } from '@inertiajs/react';
import { formatCurrency } from '@/lib/utils';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import DataTable from '@/components/ui/DataTable';
import ExpirationBadge from '@/components/shared/ExpirationBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import {
    Globe,
    Plus,
    RefreshCw,
    Clock,
    FileText,
    Pencil,
    Trash2,
    Play,
    Pause,
    CircleStop,
    Bell,
    HardDrive,
    Server,
} from 'lucide-react';

/* ─────── Interfaces ─────── */

interface Domain {
    id: number;
    customer_id: number | null;
    hosting_id: number | null;
    name: string;
    registrar: 'vas-hosting' | 'wedos' | 'external';
    expires_at: string | null;
    is_registered_by_us: boolean;
    sell_yearly: string;
    cost_yearly: string;
    auto_invoice: boolean;
    ip_address: string | null;
    dns_servers: any[] | null;
    owner_name: string | null;
    setup_date: string | null;
    synced_at: string | null;
    status: 'aktivni' | 'pozastaveno' | 'zruseno';
    notes: string | null;
    customer: { id: number; name: string; company: string | null } | null;
    hosting: { id: number; name: string } | null;
    invoices?: { id: number; invoice_number: string }[];
    days_until_expiry?: number | null;
    urgency?: string;
    yearly_margin?: number;
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
    domains: PaginatedData<Domain>;
    stats: {
        total_domains: number;
        vashosting_count: number;
        wedos_count: number;
        expiring_soon_count: number;
        pending_count: number;
    };
    customers: Customer[];
    filters: Record<string, string | undefined>;
}

/* ─────── Helpers ─────── */

const statusIconMap: Record<string, { icon: typeof Play; className: string; title: string }> = {
    aktivni: { icon: Play, className: 'text-emerald-400', title: 'Aktivní' },
    pozastaveno: { icon: Pause, className: 'text-amber-400', title: 'Pozastaveno' },
    zruseno: { icon: CircleStop, className: 'text-red-400', title: 'Zrušeno' },
};

const registrarBadgeConfig: Record<string, { label: string; className: string }> = {
    'vas-hosting': { label: 'vas-hosting', className: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
    wedos: { label: 'Wedos', className: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
    external: { label: 'Externí', className: 'bg-muted text-muted-foreground border-border' },
};

function RegistrarBadge({ registrar }: { registrar: string }) {
    const config = registrarBadgeConfig[registrar] ?? registrarBadgeConfig.external;
    return (
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.className}`}>
            {config.label}
        </span>
    );
}

/* ─────── Main Component ─────── */

export default function DomainsIndex({
    domains,
    stats,
    customers,
    filters,
}: Props) {
    const [syncingVashosting, setSyncingVashosting] = useState(false);
    const [syncingWedos, setSyncingWedos] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Domain | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleSyncVashosting = () => {
        setSyncingVashosting(true);
        router.post('/domeny/sync-vashosting', {}, { onFinish: () => setSyncingVashosting(false) });
    };

    const handleSyncWedos = () => {
        setSyncingWedos(true);
        router.post('/domeny/sync-wedos', {}, { onFinish: () => setSyncingWedos(false) });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(`/domeny/${deleteTarget.id}`, {
            onSuccess: () => { setDeleteTarget(null); setDeleting(false); },
            onError: () => setDeleting(false),
        });
    };

    function navigate(params: Record<string, string>) {
        const current: Record<string, string> = {};
        for (const [k, v] of Object.entries(filters)) {
            if (v) current[k] = v;
        }
        const merged = { ...current, ...params };
        Object.keys(merged).forEach((k) => {
            if (!merged[k] || merged[k] === '') delete merged[k];
        });
        router.get('/domeny', merged, { preserveState: true });
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
    ];

    // Column filter options
    const customerFilterOpts = customers.map((c) => ({ value: String(c.id), label: c.company || c.name }));
    const statusFilterOpts = [
        { value: 'aktivni', label: 'Aktivní' },
        { value: 'pozastaveno', label: 'Pozastaveno' },
        { value: 'zruseno', label: 'Zrušeno' },
    ];
    const registrarFilterOpts = [
        { value: 'vas-hosting', label: 'vas-hosting' },
        { value: 'wedos', label: 'Wedos' },
        { value: 'external', label: 'Externí' },
    ];
    const autoInvoiceFilterOpts = [
        { value: '1', label: 'Ano' },
        { value: '0', label: 'Ne' },
    ];
    const hasHostingFilterOpts = [
        { value: '1', label: 'S hostingem' },
        { value: '0', label: 'Bez hostingu' },
    ];

    const columnFilters: Record<string, string> = {};
    for (const [k, v] of Object.entries(filters)) {
        if (k.startsWith('filter_') && v) columnFilters[k] = v;
    }

    /* ─────── Columns ─────── */

    const domainColumns = [
        {
            key: 'name' as const,
            label: 'Název',
            sortable: true,
            render: (d: Domain) => (
                <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="font-medium text-foreground">{d.name}</span>
                </div>
            ),
        },
        {
            key: 'customer' as const,
            label: 'Zákazník',
            filterKey: 'filter_customer',
            filterOptions: customerFilterOpts,
            render: (d: Domain) => (
                <span className="text-muted-foreground">
                    {d.customer ? d.customer.company || d.customer.name : '—'}
                </span>
            ),
        },
        {
            key: 'registrar' as const,
            label: 'Registrátor',
            filterKey: 'filter_registrar',
            filterOptions: registrarFilterOpts,
            render: (d: Domain) => <RegistrarBadge registrar={d.registrar} />,
        },
        {
            key: 'expires_at' as const,
            label: 'Expirace',
            sortable: true,
            render: (d: Domain) => <ExpirationBadge expiresAt={d.expires_at} />,
        },
        {
            key: 'hosting' as const,
            label: 'Hosting',
            filterKey: 'filter_has_hosting',
            filterOptions: hasHostingFilterOpts,
            render: (d: Domain) => d.hosting ? (
                <a
                    href={`/hostingy/${d.hosting.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                    <HardDrive className="h-3 w-3" />
                    {d.hosting.name}
                </a>
            ) : (
                <span className="text-xs text-muted-foreground/50">—</span>
            ),
        },
        {
            key: 'sell_yearly' as const,
            label: 'Cena/rok',
            sortable: true,
            render: (d: Domain) => {
                const sell = parseFloat(d.sell_yearly) || 0;
                const cost = parseFloat(d.cost_yearly) || 0;
                if (sell > 0) {
                    return (
                        <span className="text-sm text-muted-foreground">
                            {formatCurrency(sell)}
                            {cost > 0 && (
                                <span className="text-red-400/70 text-xs ml-1" title={`Náklad: ${formatCurrency(cost)}`}>
                                    −{formatCurrency(cost)}
                                </span>
                            )}
                        </span>
                    );
                }
                if (cost > 0) return <span className="text-sm text-red-400/70" title="Pouze náklad (nefakturujeme)">−{formatCurrency(cost)}</span>;
                return <span className="text-sm text-muted-foreground/50">—</span>;
            },
        },
        {
            key: 'auto_invoice' as const,
            label: 'FA',
            filterKey: 'filter_auto_invoice',
            filterOptions: autoInvoiceFilterOpts,
            render: (d: Domain) =>
                d.auto_invoice
                    ? <span className="text-emerald-400 text-xs font-medium" title="Auto-fakturace zapnuta">Ano</span>
                    : <span className="text-muted-foreground/40 text-xs" title="Auto-fakturace vypnuta">Ne</span>,
        },
        {
            key: 'status' as const,
            label: 'Stav',
            filterKey: 'filter_status',
            filterOptions: statusFilterOpts,
            render: (d: Domain) => {
                const si = statusIconMap[d.status];
                if (!si) return <span>{d.status}</span>;
                const Icon = si.icon;
                return <span title={si.title}><Icon className={`h-4 w-4 ${si.className}`} /></span>;
            },
        },
        {
            key: 'actions' as const,
            label: '',
            className: 'w-[120px] text-right',
            render: (d: Domain) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    {d.is_registered_by_us && d.customer && !d.hosting_id && (
                        <button
                            onClick={() => router.post(`/domeny/${d.id}/faktura`)}
                            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-blue-500/10 hover:text-blue-400"
                            title="Vystavit fakturu"
                        >
                            <FileText className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        onClick={() => router.visit(`/domeny/${d.id}/edit`)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Upravit"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(d)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Smazat"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout
            title="Domény"
            breadcrumbs={[{ label: 'Domény' }]}
        >
            <div className="p-6 space-y-6">
                {/* Stats bar — 4 key stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <button
                        onClick={() => navigate({ expiry_filter: '' })}
                        className="bg-card border border-border rounded-xl px-4 py-3 text-left transition-colors hover:border-primary/40"
                    >
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Globe className="h-3 w-3" />
                            Celkem domén
                        </p>
                        <p className="text-2xl font-semibold text-foreground">
                            {stats.total_domains}
                        </p>
                    </button>

                    <div className="bg-card border border-border rounded-xl px-4 py-3 text-left">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Server className="h-3 w-3" />
                            vas-hosting
                        </p>
                        <p className="text-2xl font-semibold text-blue-400">
                            {stats.vashosting_count}
                        </p>
                    </div>

                    <div className="bg-card border border-border rounded-xl px-4 py-3 text-left">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Server className="h-3 w-3" />
                            Wedos
                        </p>
                        <p className="text-2xl font-semibold text-orange-400">
                            {stats.wedos_count}
                        </p>
                    </div>

                    <button
                        onClick={() => navigate({ expiry_filter: 'expiring_soon' })}
                        className="bg-card border border-border rounded-xl px-4 py-3 text-left transition-colors hover:border-amber-500/40"
                    >
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expiruje brzy
                        </p>
                        <p className="text-2xl font-semibold text-amber-400">
                            {stats.expiring_soon_count}
                        </p>
                    </button>
                </div>

                {/* Action bar */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {/* Expiry filter pills */}
                        {expiryFilters.map((opt) => (
                            <button
                                key={opt.value}
                                onClick={() => navigate({ expiry_filter: opt.value })}
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

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            onClick={handleSyncVashosting}
                            disabled={syncingVashosting}
                            className="text-muted-foreground hover:text-foreground border border-border"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${syncingVashosting ? 'animate-spin' : ''}`} />
                            Sync vas-hosting
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={handleSyncWedos}
                            disabled={syncingWedos}
                            className="text-muted-foreground hover:text-foreground border border-border"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${syncingWedos ? 'animate-spin' : ''}`} />
                            Sync Wedos
                        </Button>
                        {stats.pending_count > 0 && (
                            <Button
                                variant="ghost"
                                onClick={() => router.visit('/domeny/ke-schvaleni')}
                                className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/25"
                            >
                                <Bell className="h-4 w-4 mr-2" />
                                Ke schválení ({stats.pending_count})
                            </Button>
                        )}
                        <Button
                            onClick={() => router.visit('/domeny/vytvorit')}
                            className="bg-primary hover:bg-primary/80 text-white"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Nová doména
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <DataTable
                    data={domains.data}
                    columns={domainColumns}
                    pagination={{
                        current_page: domains.current_page,
                        last_page: domains.last_page,
                        per_page: domains.per_page,
                        total: domains.total,
                        from: null,
                        to: null,
                    }}
                    searchValue={filters.search}
                    onSearchChange={(search) => navigate({ search })}
                    searchPlaceholder="Hledat doménu..."
                    sortField={filters.sort_by}
                    sortDirection={filters.sort_dir as 'asc' | 'desc'}
                    onSort={(field) =>
                        navigate({
                            sort_by: field,
                            sort_dir: filters.sort_by === field && filters.sort_dir === 'asc' ? 'desc' : 'asc',
                        })
                    }
                    onPageChange={(page) => navigate({ page: String(page) })}
                    perPageOptions={[30, 50, 100]}
                    onPerPageChange={(n) => navigate({ per_page: String(n), page: '1' })}
                    onRowClick={(d) => router.visit(`/domeny/${d.id}`)}
                    emptyMessage="Žádné domény"
                    columnFilters={columnFilters}
                    onColumnFilterChange={handleColumnFilter}
                />
            </div>

            {/* Delete confirm */}
            <ConfirmDialog
                open={deleteTarget !== null}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Smazat doménu"
                message={deleteTarget ? `Opravdu chcete smazat doménu "${deleteTarget.name}"?` : ''}
            />
        </AuthenticatedLayout>
    );
}
