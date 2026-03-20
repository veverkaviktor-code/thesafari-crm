import { useState } from 'react';
import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    FileText,
    Globe,
    Hammer,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReceivableItem {
    id: number;
    customer_id: number;
    customer_name: string;
    type: 'invoice' | 'order' | 'website';
    label: string;
    amount: number;
    status: string;
    due_date: string | null;
    days_overdue: number | null;
    link: string;
}

interface FinancialSummary {
    total_revenue: number;
    total_costs: number;
    total_profit: number;
    paid: number;
    unpaid_invoices: number;
    unpaid_websites: number;
    not_invoiced: number;
}

const fmt = (v: number) =>
    new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
    }).format(v);

function StatusBadge({ item }: { item: ReceivableItem }) {
    if (item.type === 'website') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                {item.days_overdue ? `${item.days_overdue} dní po expiraci` : 'Nezaplaceno'}
            </span>
        );
    }
    if (item.type === 'order') {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500">
                Bez faktury
            </span>
        );
    }
    if (item.days_overdue && item.days_overdue > 0) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-400">
                <AlertTriangle className="h-2.5 w-2.5" />
                {item.days_overdue} dní po splatnosti
            </span>
        );
    }
    return (
        <span className="inline-flex rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            Nezaplaceno
        </span>
    );
}

export default function Receivables({
    items,
    summary,
    defaultVisible = 3,
}: {
    items?: ReceivableItem[];
    summary?: FinancialSummary;
    defaultVisible?: number;
}) {
    const list = items ?? [];
    const [expanded, setExpanded] = useState(false);
    const s = summary ?? {
        total_revenue: 0,
        total_costs: 0,
        total_profit: 0,
        paid: 0,
        unpaid_invoices: 0,
        unpaid_websites: 0,
        not_invoiced: 0,
    };

    const totalOwed = s.unpaid_invoices + s.unpaid_websites + s.not_invoiced;
    const visibleItems = expanded ? list : list.slice(0, defaultVisible);
    const hasMore = list.length > defaultVisible;

    return (
        <div className="h-full flex flex-col rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-muted-foreground">
                Finanční přehled — Zakázky
            </h3>

            {/* Summary grid */}
            <div className="mt-3 grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-accent/50 p-3">
                    <p className="text-[10px] text-muted-foreground">Příjmy</p>
                    <p className="text-lg font-bold text-foreground">{fmt(s.total_revenue)}</p>
                </div>
                <div className="rounded-lg bg-accent/50 p-3">
                    <p className="text-[10px] text-muted-foreground">Náklady</p>
                    <p className="text-lg font-bold text-foreground">{fmt(s.total_costs)}</p>
                </div>
                <div className="rounded-lg bg-accent/50 p-3">
                    <p className="text-[10px] text-muted-foreground">Zisk</p>
                    <p className={cn('text-lg font-bold', s.total_profit >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                        {fmt(s.total_profit)}
                    </p>
                </div>
            </div>

            {/* Payment status bar */}
            <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Zaplaceno</span>
                    <span className="font-medium text-emerald-400">{fmt(s.paid)}</span>
                </div>
                {s.unpaid_invoices > 0 && (
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Nezaplacené faktury</span>
                        <span className="font-medium text-red-400">{fmt(s.unpaid_invoices)}</span>
                    </div>
                )}
                {s.unpaid_websites > 0 && (
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Nezaplacené služby</span>
                        <span className="font-medium text-red-400">{fmt(s.unpaid_websites)}</span>
                    </div>
                )}
                {s.not_invoiced > 0 && (
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Nevyfakturováno</span>
                        <span className="font-medium text-amber-400">{fmt(s.not_invoiced)}</span>
                    </div>
                )}
            </div>

            {/* Receivables list */}
            {list.length > 0 && (
                <div className="mt-4 flex flex-1 flex-col min-h-0">
                    <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-muted-foreground">
                            Pohledávky ({list.length})
                        </h4>
                        <span className="text-xs font-bold text-red-400">{fmt(totalOwed)}</span>
                    </div>
                    <div className={cn('space-y-1 overflow-y-auto overflow-x-hidden min-h-0', expanded && 'max-h-[360px]')}>
                        {visibleItems.map((item) => (
                            <Link
                                key={`${item.type}-${item.id}`}
                                href={item.link}
                                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent group"
                            >
                                <div className={cn(
                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                    item.type === 'invoice' ? 'bg-red-500/10' : item.type === 'website' ? 'bg-primary/10' : 'bg-amber-500/10',
                                )}>
                                    {item.type === 'invoice'
                                        ? <FileText className="h-4 w-4 text-red-400" />
                                        : item.type === 'website'
                                        ? <Globe className="h-4 w-4 text-primary" />
                                        : <Hammer className="h-4 w-4 text-amber-500" />
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-foreground truncate">
                                            {item.customer_name}
                                        </span>
                                        <StatusBadge item={item} />
                                    </div>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                        {item.label}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <span className="text-sm font-bold text-foreground">
                                        {fmt(item.amount)}
                                    </span>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30 group-hover:text-muted-foreground" />
                            </Link>
                        ))}
                    </div>

                    {/* Expand/collapse + link to Finance */}
                    {hasMore && (
                        <div className="mt-2 flex items-center gap-2">
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            >
                                {expanded ? (
                                    <>
                                        <ChevronUp className="h-3.5 w-3.5" />
                                        Zobrazit méně
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-3.5 w-3.5" />
                                        Zobrazit vše ({list.length})
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    <Link
                        href="/finance"
                        className="mt-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/5"
                    >
                        Finanční přehled
                        <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            )}

            {list.length === 0 && (
                <div className="mt-4 flex flex-1 items-center justify-center">
                    <p className="text-sm text-muted-foreground">Žádné pohledávky</p>
                </div>
            )}
        </div>
    );
}
