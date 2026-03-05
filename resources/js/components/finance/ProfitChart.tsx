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

interface DataPoint {
    month: string;
    revenue: number;
    costs: number;
    profit: number;
}

interface Props {
    data?: DataPoint[];
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { payload: DataPoint }[]; label?: string }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
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
                    <span className="text-xs flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />Zisk
                    </span>
                    <span className={`text-xs font-semibold ${d.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(d.profit)}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function ProfitChart({ data }: Props) {
    const [period, setPeriod] = useState<Period>('6M');

    if (!data || data.length === 0) {
        return (
            <div className="h-full flex flex-col rounded-xl border border-border bg-card p-5 lg:col-span-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Profitabilita</h3>
                <div className="flex-1 flex items-center justify-center min-h-[300px]">
                    <p className="text-sm text-muted-foreground">Zatím žádná data</p>
                </div>
            </div>
        );
    }

    const sliceCount = period === '3M' ? 3 : period === '6M' ? 6 : data.length;
    const chartData = data.slice(-sliceCount);

    return (
        <div className="h-full flex flex-col rounded-xl border border-border bg-card p-5 lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-muted-foreground">Profitabilita</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">Příjmy, náklady a zisk</p>
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

            <div className="mb-3 flex gap-4">
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                    <span className="text-xs text-muted-foreground">Příjmy</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Náklady</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-xs text-muted-foreground">Zisk</span>
                </div>
            </div>

            <div className="flex-1 min-h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="profitRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.25} />
                                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="profitCostsGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="var(--muted-foreground)" stopOpacity={0.15} />
                                <stop offset="100%" stopColor="var(--muted-foreground)" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="profitProfitGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.2} />
                                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
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
                            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                            width={50}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} fill="url(#profitRevenueGrad)" />
                        <Area type="monotone" dataKey="costs" stroke="var(--muted-foreground)" strokeWidth={2} fill="url(#profitCostsGrad)" />
                        <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fill="url(#profitProfitGrad)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
