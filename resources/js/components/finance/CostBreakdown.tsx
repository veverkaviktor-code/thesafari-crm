import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatCurrency } from '@/lib/utils';

interface CostItem {
    category: string;
    label: string;
    count: number;
    total: number;
}

interface Props {
    data?: CostItem[];
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#64748b', '#6366f1', '#8b5cf6'];

function CustomTooltip({ active, payload }: { active?: boolean; payload?: { payload: CostItem }[] }) {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
        <div className="rounded-xl border border-border bg-card p-3 shadow-lg">
            <p className="text-xs font-medium text-foreground">{d.label}</p>
            <p className="text-sm font-semibold text-foreground mt-1">{formatCurrency(d.total)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{d.count} záznamů</p>
        </div>
    );
}

export default function CostBreakdown({ data }: Props) {
    if (!data || data.length === 0) {
        return (
            <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="text-sm font-semibold text-muted-foreground">Náklady dle kategorie</h3>
                <div className="flex items-center justify-center min-h-[200px]">
                    <p className="text-sm text-muted-foreground">Zatím žádné náklady</p>
                </div>
            </div>
        );
    }

    const total = data.reduce((s, d) => s + d.total, 0);

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground">Náklady dle kategorie</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Celkem: {formatCurrency(total)}</p>
            </div>

            {data.length > 1 && (
                <div className="h-[180px] mb-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} layout="vertical" barSize={16}>
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
                                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                                width={80}
                            />
                            <Tooltip content={<CustomTooltip />} cursor={false} />
                            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                                {data.map((_, i) => (
                                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="space-y-2">
                {data.map((item, i) => {
                    const pct = total > 0 ? ((item.total / total) * 100).toFixed(1) : '0';
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
                                <span className="font-medium text-foreground">{formatCurrency(item.total)}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
