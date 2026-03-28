import { router } from '@inertiajs/react';
import {
    Banknote,
    CreditCard,
    FileText,
    Globe,
    Hammer,
    Receipt,
    TrendingDown,
    TrendingUp,
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import StatCard from '@/components/dashboard/StatCard';
import ProfitChart from '@/components/finance/ProfitChart';
import RevenueBreakdown from '@/components/finance/RevenueBreakdown';
import InvoiceAging from '@/components/finance/InvoiceAging';
import CashflowChart from '@/components/finance/CashflowChart';
import MrrDetail from '@/components/finance/MrrDetail';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

interface Metrics {
    total_revenue: number;
    total_costs: number;
    profit: number;
    unpaid_total: number;
    unpaid_invoices: number;
    unpaid_sub_payments: number;
    mrr: number;
    arr: number;
}

interface ProfitDataPoint {
    month: string;
    revenue: number;
    costs: number;
    profit: number;
}

interface BreakdownItem {
    label: string;
    value: number;
    color: string;
}

interface AgingBucket {
    label: string;
    count: number;
    total: number;
}

interface CashflowPoint {
    month: string;
    income: number;
    expenses: number;
    net: number;
    cumulative: number;
}

interface ReceivableItem {
    id: number;
    customer_name: string;
    type: 'invoice' | 'order' | 'website';
    label: string;
    amount: number;
    status: string;
    due_date: string | null;
    days_overdue: number | null;
    link: string;
}

interface MrrDetailData {
    detail: {
        type: string;
        label: string;
        count: number;
        mrr: number;
        arr: number;
        costs_monthly: number;
        costs_annual: number;
        margin_monthly: number;
        margin_annual: number;
    }[];
    expiring_soon: {
        id: number;
        name: string;
        type: string;
        expires_at: string;
        days: number;
        customer_name: string;
        mrr: number;
        link: string;
    }[];
    totals: {
        mrr: number;
        arr: number;
        costs_monthly: number;
        margin_monthly: number;
    };
}

interface Props {
    metrics?: Metrics;
    period?: string;
    profitabilityTrend?: ProfitDataPoint[];
    revenueBreakdown?: BreakdownItem[];
    invoiceAging?: AgingBucket[];
    cashflow?: CashflowPoint[];
    receivables?: ReceivableItem[];
    mrrDetail?: MrrDetailData;
}

const PERIODS = [
    { value: '1m', label: '1M' },
    { value: '3m', label: '3M' },
    { value: '6m', label: '6M' },
    { value: '1y', label: 'Rok' },
    { value: 'all', label: 'Vše' },
] as const;

const statusLabels: Record<string, string> = {
    vystavena: 'Vystavena',
    odeslana: 'Odeslaná',
    po_splatnosti: 'Po splatnosti',
    bez_faktury: 'Bez faktury',
    nezaplaceno: 'Nezaplaceno',
};

const statusColors: Record<string, string> = {
    vystavena: 'text-amber-400 bg-amber-500/10',
    odeslana: 'text-blue-400 bg-blue-500/10',
    po_splatnosti: 'text-red-400 bg-red-500/10',
    bez_faktury: 'text-muted-foreground bg-accent',
    nezaplaceno: 'text-orange-400 bg-orange-500/10',
};

const typeIcons: Record<string, React.ElementType> = {
    invoice: FileText,
    order: Hammer,
    website: Globe,
};

export default function Finance({
    metrics,
    period: currentPeriod = '1m',
    profitabilityTrend,
    revenueBreakdown,
    invoiceAging,
    cashflow,
    receivables,
    mrrDetail,
}: Props) {
    const m = metrics ?? {
        total_revenue: 0, total_costs: 0, profit: 0,
        unpaid_total: 0, unpaid_invoices: 0, unpaid_sub_payments: 0,
        mrr: 0, arr: 0,
    };

    const setPeriod = (value: string) => {
        router.get('/finance', { period: value }, { preserveState: true, preserveScroll: true });
    };

    return (
        <AuthenticatedLayout
            title="Finance"
            breadcrumbs={[{ label: 'Finance' }]}
        >
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-foreground">Finance</h1>
                    <div className="inline-flex items-center rounded-lg border border-border bg-card p-0.5">
                        {PERIODS.map((p) => (
                            <button
                                key={p.value}
                                onClick={() => setPeriod(p.value)}
                                className={cn(
                                    'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                                    currentPeriod === p.value
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                            >
                                {p.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Row 1: Summary stat cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <StatCard
                        label="Celkové příjmy"
                        value={formatCurrency(m.total_revenue)}
                        icon={Banknote}
                        iconColor="text-emerald-500"
                        iconBg="bg-emerald-500/10"
                    />
                    <StatCard
                        label="Celkové náklady"
                        value={formatCurrency(m.total_costs)}
                        icon={Receipt}
                        iconColor="text-orange-500"
                        iconBg="bg-orange-500/10"
                    />
                    <StatCard
                        label="Čistý zisk"
                        value={formatCurrency(m.profit)}
                        icon={m.profit >= 0 ? TrendingUp : TrendingDown}
                        iconColor={m.profit >= 0 ? 'text-emerald-500' : 'text-red-500'}
                        iconBg={m.profit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}
                    />
                    <StatCard
                        label="Nezaplaceno"
                        value={formatCurrency(m.unpaid_total)}
                        icon={CreditCard}
                        iconColor="text-red-500"
                        iconBg="bg-red-500/10"
                        subtitle={`Faktury ${formatCurrency(m.unpaid_invoices)} · Služby ${formatCurrency(m.unpaid_sub_payments)}`}
                    />
                    <StatCard
                        label="MRR / ARR"
                        value={formatCurrency(m.mrr)}
                        icon={TrendingUp}
                        iconColor="text-primary"
                        iconBg="bg-primary/10"
                        subtitle={`ARR ${formatCurrency(m.arr)}`}
                    />
                </div>

                {/* Row 2: Profitability chart + Revenue breakdown */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <ProfitChart data={profitabilityTrend} />
                    <RevenueBreakdown data={revenueBreakdown} />
                </div>

                {/* Row 3: Invoice aging + Cashflow */}
                <div className="grid gap-6 lg:grid-cols-2 items-start">
                    <InvoiceAging data={invoiceAging} />
                    <CashflowChart data={cashflow} />
                </div>

                {/* Row 4: Pohledávky + MRR Detail (side by side, scrollable) */}
                <div className="grid gap-6 lg:grid-cols-2 items-start">
                    {/* Pohledávky */}
                    <div className="rounded-xl border border-border bg-card p-5">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground">Pohledávky</h3>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {receivables?.length ?? 0} nezaplacených položek
                                </p>
                            </div>
                            {receivables && receivables.length > 0 && (
                                <span className="text-lg font-bold text-foreground">
                                    {formatCurrency(receivables.reduce((s, r) => s + r.amount, 0))}
                                </span>
                            )}
                        </div>

                        {(!receivables || receivables.length === 0) ? (
                            <p className="py-8 text-center text-sm text-muted-foreground">
                                Žádné nezaplacené pohledávky
                            </p>
                        ) : (
                            <div className="max-h-[420px] overflow-y-auto">
                                <div className="space-y-1">
                                    {receivables.map((item, i) => {
                                        const Icon = typeIcons[item.type] ?? FileText;
                                        return (
                                            <button
                                                key={`${item.type}-${item.id}-${i}`}
                                                onClick={() => router.visit(item.link)}
                                                className="w-full flex items-center gap-3 rounded-lg border border-border/50 p-3 text-left transition-colors hover:bg-accent"
                                            >
                                                <div className={cn(
                                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                                    item.type === 'invoice' ? 'bg-red-500/10' : item.type === 'order' ? 'bg-amber-500/10' : 'bg-primary/10',
                                                )}>
                                                    <Icon className={cn(
                                                        'h-4 w-4',
                                                        item.type === 'invoice' ? 'text-red-400' : item.type === 'order' ? 'text-amber-400' : 'text-primary',
                                                    )} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-foreground truncate">
                                                            {item.customer_name}
                                                        </span>
                                                        <span className={cn(
                                                            'inline-flex shrink-0 items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                                                            statusColors[item.status] ?? 'text-muted-foreground bg-accent',
                                                        )}>
                                                            {statusLabels[item.status] ?? item.status}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground truncate">{item.label}</p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className="text-sm font-semibold text-foreground">
                                                        {formatCurrency(item.amount)}
                                                    </p>
                                                    {item.days_overdue ? (
                                                        <p className="text-xs text-red-400">{item.days_overdue} dní</p>
                                                    ) : item.due_date ? (
                                                        <p className="text-xs text-muted-foreground">{formatDate(item.due_date)}</p>
                                                    ) : null}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* MRR Detail */}
                    <MrrDetail data={mrrDetail} />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
