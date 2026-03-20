import { Link } from '@inertiajs/react';
import { Globe, Server, AlertTriangle, Clock, HardDrive, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExpiringWebsite {
    id: number;
    name: string;
    type: string;
    expires_at: string;
    days: number;
    urgency: string;
    customer_name: string | null;
}

interface StorageByServer {
    server: string;
    count: number;
    total_mb: number;
}

interface WebsiteStats {
    active_domains: number;
    active_hostings: number;
    expiring_soon: number;
    expired: number;
    unpaid_payments: number;
    total_storage_mb: number;
    storage_by_server: StorageByServer[];
    expiring: ExpiringWebsite[];
}

interface Props {
    stats: WebsiteStats;
}

function formatStorage(mb: number): string {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    return `${mb} MB`;
}

const urgencyConfig: Record<string, { className: string }> = {
    critical: { className: 'bg-red-500/10 text-red-500 border-red-500/20' },
    warning: { className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    ok: { className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
};

export default function WebsiteOverview({ stats }: Props) {
    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-foreground/90">Webové služby — Domény & Hostingy</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {stats.active_domains + stats.active_hostings} aktivních služeb
                    </p>
                </div>
                <Link
                    href="/webove-sluzby"
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                    Správa
                    <ArrowRight className="h-3 w-3" />
                </Link>
            </div>

            {/* Mini stat pills */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <MiniStat icon={Globe} label="Domény" value={stats.active_domains} color="text-blue-400" />
                <MiniStat icon={Server} label="Hostingy" value={stats.active_hostings} color="text-emerald-400" />
                <MiniStat
                    icon={Clock}
                    label="Expiruje brzy"
                    value={stats.expiring_soon}
                    color={stats.expiring_soon > 0 ? 'text-amber-500' : 'text-muted-foreground'}
                />
                <MiniStat
                    icon={AlertTriangle}
                    label="Po expiraci"
                    value={stats.expired}
                    color={stats.expired > 0 ? 'text-red-500' : 'text-muted-foreground'}
                />
            </div>

            {/* Storage by server */}
            {stats.storage_by_server.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                    <div className="flex items-center gap-1.5 mb-2">
                        <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                            Storage · {formatStorage(stats.total_storage_mb)}
                        </span>
                    </div>
                    <div className="space-y-1.5">
                        {stats.storage_by_server.map((srv) => {
                            const pct = stats.total_storage_mb > 0
                                ? (srv.total_mb / stats.total_storage_mb) * 100
                                : 0;
                            return (
                                <div key={srv.server} className="flex items-center gap-2 text-xs">
                                    <span className="w-36 truncate text-foreground/70">{srv.server}</span>
                                    <div className="flex-1 h-1.5 rounded-full bg-accent overflow-hidden">
                                        <div
                                            className="h-full rounded-full bg-primary/60 transition-all duration-500"
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="w-16 text-right text-muted-foreground">
                                        {formatStorage(srv.total_mb)}
                                    </span>
                                    <span className="w-10 text-right text-muted-foreground/60">
                                        {srv.count}×
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Expiring subscriptions */}
            {stats.expiring.length > 0 && (
                <div className="mt-4 border-t border-border pt-3">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Blížící se expirace</p>
                    <div className="space-y-1.5">
                        {stats.expiring.map((sub) => {
                            const urgency = urgencyConfig[sub.urgency] ?? urgencyConfig.ok;
                            return (
                                <Link
                                    key={sub.id}
                                    href={`/webove-sluzby/${sub.id}`}
                                    className="flex items-center gap-2 rounded-lg bg-accent/40 px-3 py-2 transition-colors hover:bg-accent"
                                >
                                    {sub.type === 'domena' ? (
                                        <Globe className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                                    ) : (
                                        <Server className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-xs font-medium text-foreground/80">
                                            {sub.name}
                                        </p>
                                        {sub.customer_name && (
                                            <p className="text-[10px] text-muted-foreground truncate">
                                                {sub.customer_name}
                                            </p>
                                        )}
                                    </div>
                                    <span
                                        className={cn(
                                            'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                                            urgency.className,
                                        )}
                                    >
                                        {sub.days} dní
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function MiniStat({
    icon: Icon,
    label,
    value,
    color,
}: {
    icon: typeof Globe;
    label: string;
    value: number;
    color: string;
}) {
    return (
        <div className="rounded-lg bg-accent/50 px-3 py-2">
            <div className="flex items-center gap-1.5">
                <Icon className={cn('h-3.5 w-3.5', color)} />
                <span className="text-[10px] text-muted-foreground">{label}</span>
            </div>
            <p className="mt-0.5 text-lg font-bold text-foreground">{value}</p>
        </div>
    );
}
