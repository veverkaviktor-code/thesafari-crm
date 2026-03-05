import {
    CalendarCheck,
    ClipboardList,
    CreditCard,
    MessageSquare,
    TrendingUp,
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import StatCard from '@/components/dashboard/StatCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import ActivityTimeline, { type Activity } from '@/components/dashboard/ActivityTimeline';
import RecentTickets from '@/components/dashboard/RecentTickets';
import DivisionChart from '@/components/dashboard/DivisionChart';
import NeniwebOverview from '@/components/dashboard/NeniwebOverview';
import AttentionAlerts from '@/components/dashboard/AttentionAlerts';
import Receivables from '@/components/dashboard/Receivables';

interface TicketItem {
    id: number;
    subject: string;
    customer: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    created_at: string;
}

interface Props {
    stats?: {
        active_orders: number;
        unpaid_amount: number;
        open_tickets: number;
        upcoming_deadlines: number;
    };
    mrr?: {
        total: number;
        hosting: number;
        domain: number;
        service: number;
        vps: number;
        count: number;
        costs_monthly: number;
        margin_monthly: number;
        arr_total: number;
        costs_annual: number;
        margin_annual: number;
    };
    revenueByDivision?: {
        division: string;
        count: number;
        total: number;
    }[];
    revenueData?: { month: string; revenue: number; costs: number }[];
    recentTickets?: TicketItem[];
    alerts?: {
        type: 'danger' | 'warning' | 'info';
        icon: string;
        title: string;
        subtitle: string;
        link: string;
    }[];
    neniwebStats?: {
        active_domains: number;
        active_hostings: number;
        expiring_soon: number;
        expired: number;
        unpaid_payments: number;
        total_storage_mb: number;
        storage_by_server: { server: string; count: number; total_mb: number }[];
        expiring: {
            id: number;
            name: string;
            type: string;
            expires_at: string;
            days: number;
            urgency: string;
            customer_name: string | null;
        }[];
    };
    recentActivity?: {
        id: number;
        subject_type: string;
        description: string;
        created_at: string;
        icon: Activity['icon'];
        text: string;
        changes?: string | null;
    }[];
    taskStats?: {
        overdue: number;
        due_today: number;
        due_this_week: number;
        total_open: number;
    };
    financialSummary?: {
        total_revenue: number;
        total_costs: number;
        total_profit: number;
        paid: number;
        unpaid_invoices: number;
        unpaid_subscriptions: number;
        not_invoiced: number;
    };
    receivables?: {
        id: number;
        customer_id: number;
        customer_name: string;
        type: 'invoice' | 'order' | 'subscription';
        label: string;
        amount: number;
        status: string;
        due_date: string | null;
        days_overdue: number | null;
        link: string;
    }[];
}

const formatCurrency = (v: number | null | undefined) =>
    new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
    }).format(v ?? 0);

function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Právě teď';
    if (minutes < 60) return `Před ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Před ${hours} hod`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Včera';
    return `Před ${days} dny`;
}

export default function Dashboard({ stats, mrr, revenueByDivision, revenueData, recentTickets, alerts, recentActivity, neniwebStats, taskStats, financialSummary, receivables }: Props) {
    const s = stats ?? { active_orders: 0, unpaid_amount: 0, open_tickets: 0, upcoming_deadlines: 0 };
    const mrrData = mrr ?? { total: 0, hosting: 0, domain: 0, service: 0, vps: 0, count: 0, costs_monthly: 0, margin_monthly: 0, arr_total: 0, costs_annual: 0, margin_annual: 0 };

    const activities: Activity[] = (recentActivity ?? []).map((a) => ({
        id: a.id,
        icon: a.icon,
        text: a.text,
        time: formatRelativeTime(a.created_at),
        created_at: a.created_at,
        changes: a.changes,
    }));

    return (
        <AuthenticatedLayout
            title="Dashboard"
            breadcrumbs={[{ label: 'Dashboard' }]}
        >
            <div className="space-y-6">
                {/* Row 1: Stat cards */}
                <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
                    <StatCard
                        label="Aktivní zakázky"
                        value={String(s.active_orders)}
                        icon={ClipboardList}
                        iconColor="text-amber-500"
                        iconBg="bg-amber-500/10"
                    />
                    <StatCard
                        label="Nezaplacené faktury"
                        value={formatCurrency(s.unpaid_amount)}
                        icon={CreditCard}
                        iconColor="text-red-500"
                        iconBg="bg-red-500/10"
                    />
                    <StatCard
                        label="Otevřené požadavky"
                        value={String(s.open_tickets)}
                        icon={MessageSquare}
                        iconColor="text-emerald-500"
                        iconBg="bg-emerald-500/10"
                    />
                    <StatCard
                        label="Měsíční MRR"
                        value={formatCurrency(mrrData.total)}
                        icon={TrendingUp}
                        iconColor="text-primary"
                        iconBg="bg-primary/10"
                        subtitle={`Náklady ${formatCurrency(mrrData.costs_monthly)} · Zisk ${formatCurrency(mrrData.margin_monthly)}`}
                    />
                    <StatCard
                        label="Otevřené úkoly"
                        value={String(taskStats?.total_open ?? 0)}
                        icon={CalendarCheck}
                        iconColor="text-violet-500"
                        iconBg="bg-violet-500/10"
                        subtitle={
                            taskStats?.overdue
                                ? `${taskStats.overdue} po termínu`
                                : taskStats?.due_today
                                    ? `${taskStats.due_today} dnes`
                                    : undefined
                        }
                    />
                </div>

                {/* Row 2: Revenue chart + Financial overview */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 h-full">
                        <RevenueChart data={revenueData} />
                    </div>
                    <div className="h-full">
                        <Receivables items={receivables} summary={financialSummary} />
                    </div>
                </div>

                {/* Row 3: Neniweb + Attention alerts */}
                <div className="grid gap-6 lg:grid-cols-2">
                    {neniwebStats && <NeniwebOverview stats={neniwebStats} />}
                    <AttentionAlerts alerts={alerts} />
                </div>

                {/* Row 4: Tickets + Activity */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <RecentTickets tickets={recentTickets} />
                    <ActivityTimeline activities={activities} />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
