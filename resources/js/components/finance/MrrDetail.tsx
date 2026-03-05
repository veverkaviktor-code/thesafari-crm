import { router } from '@inertiajs/react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
    }).format(v);

interface MrrItem {
    type: string;
    label: string;
    count: number;
    mrr: number;
    arr: number;
    costs_monthly: number;
    costs_annual: number;
    margin_monthly: number;
    margin_annual: number;
}

interface ExpiringSub {
    id: number;
    name: string;
    type: string;
    expires_at: string;
    days: number;
    customer_name: string;
    mrr: number;
}

interface MrrTotals {
    mrr: number;
    arr: number;
    costs_monthly: number;
    margin_monthly: number;
}

interface Props {
    data?: {
        detail: MrrItem[];
        expiring_soon: ExpiringSub[];
        totals: MrrTotals;
    };
}

export default function MrrDetail({ data }: Props) {
    if (!data) return null;

    const { detail, expiring_soon, totals } = data;

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground">MRR Detail</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                    Měsíční recurring revenue breakdown
                </p>
            </div>

            {/* MRR Table */}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border">
                            <th className="py-2 text-left text-xs font-medium text-muted-foreground">Typ</th>
                            <th className="py-2 text-right text-xs font-medium text-muted-foreground">Počet</th>
                            <th className="py-2 text-right text-xs font-medium text-muted-foreground">MRR</th>
                            <th className="py-2 text-right text-xs font-medium text-muted-foreground">ARR</th>
                            <th className="py-2 text-right text-xs font-medium text-muted-foreground">Náklady/m</th>
                            <th className="py-2 text-right text-xs font-medium text-muted-foreground">Marže/m</th>
                        </tr>
                    </thead>
                    <tbody>
                        {detail.map((item) => (
                            <tr key={item.type} className="border-b border-border/50">
                                <td className="py-2.5 font-medium text-foreground">{item.label}</td>
                                <td className="py-2.5 text-right text-muted-foreground">{item.count}</td>
                                <td className="py-2.5 text-right font-medium text-foreground">
                                    {formatCurrency(item.mrr)}
                                </td>
                                <td className="py-2.5 text-right text-muted-foreground">
                                    {formatCurrency(item.arr)}
                                </td>
                                <td className="py-2.5 text-right text-muted-foreground">
                                    {formatCurrency(item.costs_monthly)}
                                </td>
                                <td className={cn(
                                    'py-2.5 text-right font-medium',
                                    item.margin_monthly >= 0 ? 'text-emerald-400' : 'text-red-400',
                                )}>
                                    {formatCurrency(item.margin_monthly)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t border-border">
                            <td className="py-2.5 font-semibold text-foreground">Celkem</td>
                            <td className="py-2.5 text-right font-medium text-muted-foreground">
                                {detail.reduce((s, d) => s + d.count, 0)}
                            </td>
                            <td className="py-2.5 text-right font-bold text-foreground">
                                {formatCurrency(totals.mrr)}
                            </td>
                            <td className="py-2.5 text-right font-medium text-muted-foreground">
                                {formatCurrency(totals.arr)}
                            </td>
                            <td className="py-2.5 text-right font-medium text-muted-foreground">
                                {formatCurrency(totals.costs_monthly)}
                            </td>
                            <td className={cn(
                                'py-2.5 text-right font-bold',
                                totals.margin_monthly >= 0 ? 'text-emerald-400' : 'text-red-400',
                            )}>
                                {formatCurrency(totals.margin_monthly)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>

            {/* Expiring soon */}
            {expiring_soon.length > 0 && (
                <div className="mt-5 pt-4 border-t border-border">
                    <div className="flex items-center gap-2 mb-3">
                        <AlertTriangle className="h-4 w-4 text-amber-400" />
                        <h4 className="text-sm font-medium text-foreground">
                            Expirují do 30 dní ({expiring_soon.length})
                        </h4>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {expiring_soon.map((sub) => (
                            <button
                                key={sub.id}
                                onClick={() => router.visit(`/neniweb/${sub.id}`)}
                                className="w-full flex items-center justify-between rounded-lg border border-border p-2.5 text-left transition-colors hover:bg-accent"
                            >
                                <div>
                                    <p className="text-sm font-medium text-foreground">{sub.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {sub.customer_name} · {sub.type === 'hosting' ? 'Hosting' : sub.type === 'domena' ? 'Doména' : 'Služba'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={cn(
                                        'text-sm font-medium',
                                        sub.days <= 7 ? 'text-red-400' : 'text-amber-400',
                                    )}>
                                        {sub.days} dní
                                    </p>
                                    <p className="text-xs text-muted-foreground">{formatCurrency(sub.mrr)}/m</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
