import { cn } from '@/lib/utils';

const DIVISION_LABELS: Record<string, string> = {
    tisk: 'Tisk',
    reklama: 'Reklama',
    polepy: 'Polepy',
    montaze: 'Montáže',
    weby: 'Weby',
};

const DIVISION_COLORS: Record<string, string> = {
    weby: '#D97706',
    tisk: '#B45309',
    polepy: '#65A30D',
    reklama: '#D4A574',
    montaze: '#9C9585',
};

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

    const maxTotal = Math.max(...chartData.map(d => d.total));
    const grandTotal = chartData.reduce((sum, d) => sum + d.total, 0);
    const mrrData = mrr ?? { total: 8500, hosting: 6200, domain: 2300, count: 12 };

    return (
        <div className="flex h-full flex-col rounded-xl border border-[#F5F0E8]/[0.06] bg-gradient-to-br from-[#16140f] to-[#141414] p-5">
            <div className="mb-1">
                <h3 className="text-sm font-semibold text-[#F5F0E8]/90">Příjmy dle divize</h3>
                <p className="mt-0.5 text-xs text-[#6B6560]">Rozložení obratu · celkem {formatCurrency(grandTotal)}</p>
            </div>

            {/* Division bars */}
            <div className="mt-4 flex-1 space-y-3">
                {chartData.map((item) => {
                    const pct = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
                    const color = DIVISION_COLORS[item.division] || '#9C9585';
                    return (
                        <div key={item.division}>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="text-[#F5F0E8]/70">{DIVISION_LABELS[item.division] || item.division}</span>
                                    <span className="text-[#6B6560]">{item.count} zakázek</span>
                                </div>
                                <span className="font-medium text-[#F5F0E8]/90">{formatCurrency(item.total)}</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-[#F5F0E8]/[0.04]">
                                <div
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${pct}%`, backgroundColor: color }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* MRR Section */}
            <div className="mt-5 border-t border-[#F5F0E8]/[0.06] pt-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#F5F0E8]/70">MRR</span>
                    <span className="text-lg font-bold text-[#D97706]">{formatCurrency(mrrData.total)}</span>
                </div>
                <p className="mt-0.5 text-[10px] text-[#6B6560]">Monthly Recurring Revenue · {mrrData.count} subscriptions</p>
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
