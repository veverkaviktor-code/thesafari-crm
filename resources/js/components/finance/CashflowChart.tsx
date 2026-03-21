import { Bar, BarChart, Line, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { cn, formatCurrency } from '@/lib/utils';

interface CashflowPoint {
    month: string;
    income: number;
    expenses: number;
    net: number;
    cumulative: number;
}

interface Props {
    data?: CashflowPoint[];
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { dataKey: string; value: number; color: string }[] }) {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload as CashflowPoint;
    return (
        <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
            <p className="text-xs font-medium text-foreground mb-2">{d.month}</p>
            <div className="space-y-1">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-emerald-400">Příjmy</span>
                    <span className="text-xs font-medium text-emerald-400">{formatCurrency(d.income)}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-xs text-red-400">Výdaje</span>
                    <span className="text-xs font-medium text-red-400">{formatCurrency(d.expenses)}</span>
                </div>
                <div className="border-t border-border pt-1 flex items-center justify-between gap-4">
                    <span className="text-xs text-muted-foreground">Čistý CF</span>
                    <span className={cn('text-xs font-bold', d.net >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatCurrency(d.net)}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default function CashflowChart({ data }: Props) {
    if (!data || data.length === 0) {
        return (
            <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-muted-foreground">Měsíční cashflow</h3>
                <div className="flex items-center justify-center min-h-[200px]">
                    <p className="text-sm text-muted-foreground">Zatím žádná data</p>
                </div>
            </div>
        );
    }

    const totalIncome = data.reduce((s, d) => s + d.income, 0);
    const totalExpenses = data.reduce((s, d) => s + d.expenses, 0);
    const totalNet = totalIncome - totalExpenses;

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Měsíční cashflow</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Příjmy vs výdaje za posledních 12 měsíců</p>
            </div>

            {/* Summary */}
            <div className="mb-4 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-emerald-500/10 p-2.5">
                    <p className="text-[10px] text-muted-foreground">Příjmy</p>
                    <p className="text-sm font-bold text-emerald-400">{formatCurrency(totalIncome)}</p>
                </div>
                <div className="rounded-lg bg-red-500/10 p-2.5">
                    <p className="text-[10px] text-muted-foreground">Výdaje</p>
                    <p className="text-sm font-bold text-red-400">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className={cn('rounded-lg p-2.5', totalNet >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10')}>
                    <p className="text-[10px] text-muted-foreground">Čistý CF</p>
                    <p className={cn('text-sm font-bold', totalNet >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {formatCurrency(totalNet)}
                    </p>
                </div>
            </div>

            {/* Chart */}
            <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data} barGap={2}>
                        <XAxis
                            dataKey="month"
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 10 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                            width={40}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={false} />
                        <Bar dataKey="income" fill="#CF995F" radius={[3, 3, 0, 0]} barSize={14} />
                        <Bar dataKey="expenses" fill="#e57373" radius={[3, 3, 0, 0]} barSize={14} />
                        <Line
                            type="monotone"
                            dataKey="cumulative"
                            stroke="#D97706"
                            strokeWidth={2}
                            dot={false}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-3 flex items-center justify-center gap-5 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    Příjmy
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
                    Výdaje
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-0.5 w-4 rounded bg-amber-500" />
                    Kumulativní CF
                </div>
            </div>
        </div>
    );
}
