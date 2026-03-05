import { cn } from '@/lib/utils';

const DIVISION_LABELS: Record<string, string> = {
    tisk: 'Tisk',
    reklama: 'Reklama',
    polepy: 'Polepy',
    montaze: 'Montáže',
    weby: 'Weby',
};

const DIVISION_COLORS: Record<string, string> = {
    weby: 'var(--chart-1)',
    tisk: 'var(--chart-2)',
    polepy: '#65A30D',
    reklama: '#D4A574',
    montaze: 'var(--muted-foreground)',
};

interface DivisionData {
    division: string;
    count: number;
    total: number;
}

interface Props {
    data?: DivisionData[];
}

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('cs-CZ', { style: 'currency', currency: 'CZK', maximumFractionDigits: 0 }).format(v);

export default function DivisionChart({ data }: Props) {
    const chartData = data && data.length > 0 ? data : [];
    const maxTotal = chartData.length > 0 ? Math.max(...chartData.map(d => d.total)) : 0;
    const grandTotal = chartData.reduce((sum, d) => sum + d.total, 0);

    return (
        <div className="flex h-full flex-col rounded-xl border border-border bg-card p-5">
            <div className="mb-1">
                <h3 className="text-sm font-semibold text-foreground/90">Příjmy dle divize</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Rozložení obratu · celkem {formatCurrency(grandTotal)}</p>
            </div>

            {/* Division bars */}
            <div className="mt-4 flex-1 space-y-3">
                {chartData.length === 0 && (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-muted-foreground">Zatím žádné fakturované zakázky</p>
                    </div>
                )}
                {chartData.map((item) => {
                    const pct = maxTotal > 0 ? (item.total / maxTotal) * 100 : 0;
                    const color = DIVISION_COLORS[item.division] || 'var(--muted-foreground)';
                    return (
                        <div key={item.division}>
                            <div className="flex items-center justify-between text-xs mb-1.5">
                                <div className="flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                                    <span className="text-foreground/70">{DIVISION_LABELS[item.division] || item.division}</span>
                                    <span className="text-muted-foreground">{item.count} zakázek</span>
                                </div>
                                <span className="font-medium text-foreground/90">{formatCurrency(item.total)}</span>
                            </div>
                            <div className="h-2 w-full overflow-hidden rounded-full bg-accent">
                                <div
                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                    style={{ width: `${pct}%`, backgroundColor: color }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>

        </div>
    );
}
