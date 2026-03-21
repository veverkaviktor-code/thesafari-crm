import { router } from '@inertiajs/react';
import { AlertTriangle, Clock } from 'lucide-react';
import { cn, formatCurrency } from '@/lib/utils';

interface AgingBucket {
    label: string;
    count: number;
    total: number;
}

interface Props {
    data?: AgingBucket[];
}

const bucketColors = [
    'text-emerald-400',
    'text-amber-400',
    'text-orange-400',
    'text-red-400',
];

const bucketBgColors = [
    'bg-emerald-500/10',
    'bg-amber-500/10',
    'bg-orange-500/10',
    'bg-red-500/10',
];

export default function InvoiceAging({ data }: Props) {
    const totalUnpaid = data?.reduce((s, b) => s + b.total, 0) ?? 0;
    const totalCount = data?.reduce((s, b) => s + b.count, 0) ?? 0;

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-muted-foreground">Stárnutí faktur</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                        {totalCount} nezaplacených faktur
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-foreground">{formatCurrency(totalUnpaid)}</p>
                    <p className="text-xs text-muted-foreground">celkem</p>
                </div>
            </div>

            <div className="space-y-3">
                {data?.map((bucket, i) => {
                    const pct = totalUnpaid > 0 ? (bucket.total / totalUnpaid) * 100 : 0;
                    return (
                        <button
                            key={`aging-${i}`}
                            onClick={() => {
                                if (bucket.count > 0) {
                                    router.visit('/faktury?status=po_splatnosti');
                                }
                            }}
                            disabled={bucket.count === 0}
                            className={cn(
                                'w-full rounded-lg border border-border p-3 text-left transition-colors',
                                bucket.count > 0
                                    ? 'hover:bg-accent cursor-pointer'
                                    : 'opacity-50 cursor-default',
                            )}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className={cn('rounded-md p-1', bucketBgColors[i])}>
                                        {i < 2 ? (
                                            <Clock className={cn('h-3.5 w-3.5', bucketColors[i])} />
                                        ) : (
                                            <AlertTriangle className={cn('h-3.5 w-3.5', bucketColors[i])} />
                                        )}
                                    </div>
                                    <span className="text-sm text-foreground">{bucket.label}</span>
                                </div>
                                <span className={cn('text-sm font-semibold', bucketColors[i])}>
                                    {bucket.count > 0 ? formatCurrency(bucket.total) : '—'}
                                </span>
                            </div>
                            {bucket.count > 0 && (
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 rounded-full bg-accent overflow-hidden">
                                        <div
                                            className={cn('h-full rounded-full transition-all', {
                                                'bg-emerald-500': i === 0,
                                                'bg-amber-500': i === 1,
                                                'bg-orange-500': i === 2,
                                                'bg-red-500': i === 3,
                                            })}
                                            style={{ width: `${Math.max(pct, 2)}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                                        {bucket.count} {bucket.count === 1 ? 'faktura' : bucket.count < 5 ? 'faktury' : 'faktur'}
                                    </span>
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
