import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const DIVISION_LABELS: Record<string, string> = {
    tisk: 'Tisk',
    reklama: 'Reklama',
    polepy: 'Polepy',
    montaze: 'Montáže',
    weby: 'Weby',
};

const COLORS = ['#D97706', '#B45309', '#65A30D', '#D4A574', '#9C9585'];

interface DivisionData {
    division: string;
    count: number;
    total: number;
}

interface Props {
    data?: DivisionData[];
    mrr?: { total: number; hosting: number; domain: number; count: number };
}

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(v);

export default function DivisionChart({ data, mrr }: Props) {
    const chartData = data && data.length > 0 ? data : [
        { division: 'weby', count: 15, total: 285000 },
        { division: 'tisk', count: 8, total: 124000 },
        { division: 'polepy', count: 6, total: 98000 },
        { division: 'reklama', count: 4, total: 62000 },
        { division: 'montaze', count: 3, total: 21000 },
    ];

    const mrrData = mrr ?? { total: 8500, hosting: 6200, domain: 2300, count: 12 };

    return (
        <div className="rounded-xl border border-[#F5F0E8]/[0.06] bg-gradient-to-br from-[#16140f] to-[#141414] p-5">
            <h3 className="text-sm font-semibold text-[#9C9585]">Příjmy dle divize</h3>
            <p className="mt-0.5 text-xs text-[#6B6560]">Rozložení obratu</p>

            <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="total"
                            nameKey="division"
                            stroke="none"
                        >
                            {chartData.map((_, index) => (
                                <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#16140f',
                                border: '1px solid rgba(245,240,232,0.08)',
                                borderRadius: '10px',
                                color: '#F5F0E8',
                                fontSize: '13px',
                            }}
                            formatter={(value: number, name: string) => [
                                formatCurrency(value),
                                DIVISION_LABELS[name] || name,
                            ]}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="mt-2 space-y-1.5">
                {chartData.map((item, i) => (
                    <div key={item.division} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-[#9C9585]">{DIVISION_LABELS[item.division] || item.division}</span>
                        </div>
                        <span className="font-medium text-[#F5F0E8]/80">{formatCurrency(item.total)}</span>
                    </div>
                ))}
            </div>

            {/* MRR Section */}
            <div className="mt-5 border-t border-[#F5F0E8]/[0.06] pt-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#9C9585]">MRR</span>
                    <span className="text-lg font-bold text-[#D97706]">{formatCurrency(mrrData.total)}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-[#6B6560]">Monthly Recurring Revenue</p>
                <div className="mt-2 flex gap-3">
                    <div className="flex-1 rounded-lg bg-[#F5F0E8]/[0.03] px-2.5 py-1.5">
                        <p className="text-[10px] text-[#6B6560]">Hostingy</p>
                        <p className="text-xs font-semibold text-[#F5F0E8]">{formatCurrency(mrrData.hosting)}</p>
                    </div>
                    <div className="flex-1 rounded-lg bg-[#F5F0E8]/[0.03] px-2.5 py-1.5">
                        <p className="text-[10px] text-[#6B6560]">Domény</p>
                        <p className="text-xs font-semibold text-[#F5F0E8]">{formatCurrency(mrrData.domain)}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
