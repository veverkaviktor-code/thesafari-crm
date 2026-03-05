import { ClipboardList, Coins, TrendingDown, TrendingUp, Server, Monitor, FileText, CheckCircle } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface Stats {
    orders_count: number;
    total_revenue: number;
    total_costs: number;
    profit: number;
    invoiced?: number;
    paid?: number;
    uninvoiced?: number;
    active_subscriptions?: number;
    vps_yearly?: number;
}

interface Props {
    stats: Stats;
}

export default function CustomerMiniDashboard({ stats }: Props) {
    const items = [
        {
            label: 'Zakázky',
            value: String(stats.orders_count),
            icon: ClipboardList,
            color: 'text-blue-400',
            bg: 'bg-blue-500/10',
        },
        {
            label: 'Obrat ze zakázek',
            value: formatCurrency(stats.total_revenue),
            icon: Coins,
            color: 'text-emerald-400',
            bg: 'bg-emerald-500/10',
        },
        {
            label: 'Náklady',
            value: formatCurrency(stats.total_costs),
            icon: TrendingDown,
            color: 'text-rose-400',
            bg: 'bg-rose-500/10',
        },
        {
            label: 'Zisk',
            value: formatCurrency(stats.profit),
            icon: TrendingUp,
            color: stats.profit >= 0 ? 'text-emerald-400' : 'text-rose-400',
            bg: stats.profit >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
        },
        ...(stats.vps_yearly && stats.vps_yearly > 0
            ? [
                  {
                      label: 'VPS / rok',
                      value: formatCurrency(stats.vps_yearly),
                      icon: Server,
                      color: 'text-amber-400',
                      bg: 'bg-amber-500/10',
                  },
              ]
            : []),
        ...(stats.active_subscriptions && stats.active_subscriptions > 0
            ? [
                  {
                      label: 'Aktivní služby',
                      value: String(stats.active_subscriptions),
                      icon: Monitor,
                      color: 'text-violet-400',
                      bg: 'bg-violet-500/10',
                  },
              ]
            : []),
    ];

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground/70">
                Přehled
            </h3>
            <div className="grid grid-cols-2 gap-3">
                {items.map((item) => (
                    <div
                        key={item.label}
                        className="rounded-lg bg-accent p-3"
                    >
                        <div className="flex items-center gap-2">
                            <div
                                className={cn(
                                    'flex h-7 w-7 items-center justify-center rounded-lg',
                                    item.bg,
                                )}
                            >
                                <item.icon
                                    className={cn('h-3.5 w-3.5', item.color)}
                                />
                            </div>
                        </div>
                        <p className="mt-2 text-lg font-semibold text-foreground">
                            {item.value}
                        </p>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                ))}
            </div>

            {stats.total_revenue > 0 && (
                <div className="mt-4 space-y-2 border-t border-border pt-4">
                    <h4 className="text-xs font-semibold text-foreground/50 uppercase tracking-wider">Fakturace</h4>
                    <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <FileText className="h-3.5 w-3.5" />
                            Vyfakturováno
                        </span>
                        <span className="font-medium text-foreground">{formatCurrency(stats.invoiced ?? 0)}</span>
                    </div>
                    {(stats.uninvoiced ?? 0) > 0 && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1.5 text-muted-foreground">
                                <FileText className="h-3.5 w-3.5 text-amber-400" />
                                Nevyfakturováno
                            </span>
                            <span className="font-medium text-amber-400">{formatCurrency(stats.uninvoiced ?? 0)}</span>
                        </div>
                    )}
                    <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                            <CheckCircle className="h-3.5 w-3.5 text-emerald-400" />
                            Zaplaceno
                        </span>
                        <span className="font-medium text-emerald-400">{formatCurrency(stats.paid ?? 0)}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
