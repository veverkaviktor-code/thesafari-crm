import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
    }).format(v);

interface BreakdownItem {
    label: string;
    value: number;
    color: string;
}

interface Props {
    data?: BreakdownItem[];
}

const COLORS = ['#D97706', '#D4A574', '#65A30D', '#6366f1', '#64748b'];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: BreakdownItem }[] }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
            <p className="text-xs font-medium text-foreground">{d.label}</p>
            <p className="text-sm font-semibold text-foreground mt-1">{formatCurrency(d.value)}</p>
        </div>
    );
}

export default function RevenueBreakdown({ data }: Props) {
    if (!data || data.length === 0) {
        return (
            <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-muted-foreground">Struktura příjmů</h3>
                <div className="flex items-center justify-center min-h-[200px]">
                    <p className="text-sm text-muted-foreground">Zatím žádná data</p>
                </div>
            </div>
        );
    }

    const total = data.reduce((s, d) => s + d.value, 0);

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Struktura příjmů</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Celkem: {formatCurrency(total)}</p>
            </div>

            <div className="h-[200px] mb-4">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" barSize={20}>
                        <XAxis
                            type="number"
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                        />
                        <YAxis
                            type="category"
                            dataKey="label"
                            tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            width={70}
                        />
                        <Tooltip content={<CustomTooltip />} cursor={false} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                            {data.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="space-y-2">
                {data.map((item, i) => {
                    const pct = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                    return (
                        <div key={i} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-2.5 w-2.5 rounded-full"
                                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                />
                                <span className="text-muted-foreground">{item.label}</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xs text-muted-foreground">{pct}%</span>
                                <span className="font-medium text-foreground">{formatCurrency(item.value)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
