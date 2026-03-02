import { ClipboardList, Coins, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stats {
    orders_count: number;
    total_revenue: number;
    total_costs: number;
    profit: number;
}

interface Props {
    stats: Stats;
}

const formatCurrency = (value: number) =>
    new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
    }).format(value);

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
            label: 'Útrata',
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
    ];

    return (
        <div className="rounded-xl border border-white/5 bg-[#1a1a22] p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-300">
                Přehled
            </h3>
            <div className="grid grid-cols-2 gap-3">
                {items.map((item) => (
                    <div
                        key={item.label}
                        className="rounded-lg bg-white/[0.03] p-3"
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
                        <p className="mt-2 text-lg font-semibold text-white">
                            {item.value}
                        </p>
                        <p className="text-xs text-gray-500">{item.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
