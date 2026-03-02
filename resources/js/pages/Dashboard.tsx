import {
    ClipboardList,
    CreditCard,
    MessageSquare,
    TrendingUp,
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import StatCard from '@/components/dashboard/StatCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import RecentTickets from '@/components/dashboard/RecentTickets';
import DivisionChart from '@/components/dashboard/DivisionChart';
import { cn } from '@/lib/utils';

interface Props {
    stats?: {
        active_orders: number;
        unpaid_amount: number;
        open_tickets: number;
        upcoming_deadlines: number;
        orders_trend?: { value: string; positive: boolean };
        invoices_trend?: { value: string; positive: boolean };
        tickets_trend?: { value: string; positive: boolean };
    };
    mrr?: {
        total: number;
        hosting: number;
        domain: number;
        count: number;
    };
    financialSummary?: {
        revenue: number;
        costs: number;
        profit: number;
        margin: number;
    };
    revenueByDivision?: {
        division: string;
        count: number;
        total: number;
    }[];
    expiringSubscriptions?: unknown[];
}

const formatCurrency = (v: number | null | undefined) =>
    new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
    }).format(v ?? 0);

function FinancialMetric({ label, value, color }: { label: string; value: string; color: string }) {
    return (
        <div className="text-center">
            <p className="text-xs text-[#6B6560]">{label}</p>
            <p className={cn('mt-1 text-2xl font-bold tracking-tight', color)}>{value}</p>
        </div>
    );
}

export default function Dashboard({ stats, mrr, financialSummary, revenueByDivision }: Props) {
    const s = stats ?? {
        active_orders: 12,
        unpaid_amount: 45000,
        open_tickets: 3,
        upcoming_deadlines: 2,
        orders_trend: { value: '12%', positive: true },
        invoices_trend: { value: '8%', positive: false },
        tickets_trend: { value: '25%', positive: true },
    };

    const mrrData = mrr ?? { total: 8500, hosting: 6200, domain: 2300, count: 12 };

    const fin = financialSummary ?? {
        revenue: 590000,
        costs: 234000,
        profit: 356000,
        margin: 60,
    };

    return (
        <AuthenticatedLayout
            title="Dashboard"
            breadcrumbs={[{ label: 'Dashboard' }]}
        >
            <div className="space-y-6">
                {/* Row 1: Stat cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <StatCard
                        label="Aktivní zakázky"
                        value={String(s.active_orders)}
                        icon={ClipboardList}
                        iconColor="text-amber-500"
                        iconBg="bg-amber-500/10"
                        gradient="bg-gradient-to-br from-[#16140f] to-[#1a1508]"
                        trend={s.orders_trend}
                        subtitle="od minulého týdne"
                    />
                    <StatCard
                        label="Nezaplacené faktury"
                        value={formatCurrency(s.unpaid_amount)}
                        icon={CreditCard}
                        iconColor="text-red-500"
                        iconBg="bg-red-500/10"
                        gradient="bg-gradient-to-br from-[#16140f] to-[#1a0f0f]"
                        trend={s.invoices_trend}
                        subtitle="od minulého měsíce"
                    />
                    <StatCard
                        label="Otevřené požadavky"
                        value={String(s.open_tickets)}
                        icon={MessageSquare}
                        iconColor="text-emerald-500"
                        iconBg="bg-emerald-500/10"
                        gradient="bg-gradient-to-br from-[#16140f] to-[#14170f]"
                        trend={s.tickets_trend}
                        subtitle="vyřešeno tento týden"
                    />
                    <StatCard
                        label="Měsíční MRR"
                        value={formatCurrency(mrrData.total)}
                        icon={TrendingUp}
                        iconColor="text-[#D97706]"
                        iconBg="bg-[#D97706]/10"
                        gradient="bg-gradient-to-br from-[#16140f] to-[#1a1508]"
                        subtitle="z aktivních subscriptions"
                    />
                </div>

                {/* Row 2: Revenue chart + Division donut */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <RevenueChart />
                    </div>
                    <div>
                        <DivisionChart data={revenueByDivision} mrr={mrr} />
                    </div>
                </div>

                {/* Row 3: Financial Summary Bar */}
                <div className="rounded-xl border border-[#F5F0E8]/[0.06] bg-gradient-to-br from-[#16140f] to-[#1a1508] p-5">
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                        <FinancialMetric label="Celkové příjmy" value={formatCurrency(fin.revenue)} color="text-[#D97706]" />
                        <FinancialMetric label="Celkové náklady" value={formatCurrency(fin.costs)} color="text-[#9C9585]" />
                        <FinancialMetric label="Čistý zisk" value={formatCurrency(fin.profit)} color="text-[#65A30D]" />
                        <FinancialMetric label="Marže" value={`${fin.margin} %`} color={fin.margin >= 50 ? 'text-[#65A30D]' : 'text-amber-500'} />
                    </div>
                </div>

                {/* Row 4: Activity + Tickets */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <ActivityTimeline />
                    <RecentTickets />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
