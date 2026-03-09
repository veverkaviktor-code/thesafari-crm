import { useState } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';

type Period = '3M' | '6M' | '1Y';

const periods: { value: Period; label: string }[] = [
    { value: '3M', label: '3M' },
    { value: '6M', label: '6M' },
    { value: '1Y', label: 'Rok' },
];

interface RevenueDataPoint {
    month: string;
    revenue: number;
    costs: number;
}

interface Props {
    data?: RevenueDataPoint[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: RevenueDataPoint }[]; label?: string }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const profit = d.revenue - d.costs;
    return (
        <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
            <p className="text-xs text-muted-foreground mb-2">{label}</p>
            <div className="space-y-1">
                <div className="flex items-center justify-between gap-6">
                    <span className="text-xs text-primary flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-primary" />Příjmy
                    </span>
                    <span className="text-xs font-medium text-foreground">{formatCurrency(d.revenue)}</span>
                </div>
                <div className="flex items-center justify-between gap-6">
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-muted-foreground" />Náklady
                    </span>
                    <span className="text-xs font-medium text-foreground">{formatCurrency(d.costs)}</span>
                </div>
                <div className="border-t border-border pt-1 mt-1 flex items-center justify-between gap-6">
                    <span className="text-xs text-muted-foreground">Zisk</span>
                    <span className={`text-xs font-semibold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(profit)}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function RevenueChart({ data }: Props) {
    const [period, setPeriod] = useState<Period>('6M');

    if (!data || data.length === 0) {
        return (
            <div className="h-full flex flex-col rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-muted-foreground">
                    Zakázky — Příjmy vs Náklady
                </h3>
                <div className="flex-1 flex items-center justify-center min-h-[256px]">
                    <p className="text-sm text-muted-foreground">Zatím žádná data o příjmech</p>
                </div>
            </div>
        );
    }

    const sliceCount = period === '3M' ? 3 : period === '6M' ? 6 : data.length;
    const chartData = data.slice(-sliceCount);

    return (
        <div className="h-full flex flex-col rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-muted-foreground">
                        Zakázky — Příjmy vs Náklady
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        Přehled financí za období
                    </p>
                </div>
                <div className="flex gap-1 rounded-lg bg-accent p-1">
                    {periods.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={cn(
                                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                                period === p.value
                                    ? 'bg-primary text-white'
                                    : 'text-muted-foreground hover:text-foreground',
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="mb-3 flex gap-4">
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-xs text-muted-foreground">Příjmy</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Náklady</span>
                </div>
            </div>

            <div className="flex-1 min-h-[256px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient
                                id="revenueGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="var(--primary)"
                                    stopOpacity={0.25}
                                />
                                <stop
                                    offset="100%"
                                    stopColor="var(--primary)"
                                    stopOpacity={0}
                                />
                            </linearGradient>
                            <linearGradient
                                id="costsGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="var(--muted-foreground)"
                                    stopOpacity={0.15}
                                />
                                <stop
                                    offset="100%"
                                    stopColor="var(--muted-foreground)"
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            stroke="var(--border)"
                            strokeDasharray="3 3"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            padding={{ left: 10 }}
                        />
                        <YAxis
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) =>
                                `${Math.round(v / 1000)}k`
                            }
                            width={50}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="var(--primary)"
                            strokeWidth={2}
                            fill="url(#revenueGradient)"
                        />
                        <Area
                            type="monotone"
                            dataKey="costs"
                            stroke="var(--muted-foreground)"
                            strokeWidth={2}
                            fill="url(#costsGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
