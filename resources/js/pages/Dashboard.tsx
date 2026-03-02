import {
    AlertTriangle,
    ClipboardList,
    CreditCard,
    MessageSquare,
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import StatCard from '@/components/dashboard/StatCard';
import RevenueChart from '@/components/dashboard/RevenueChart';
import ActivityTimeline from '@/components/dashboard/ActivityTimeline';
import RecentTickets from '@/components/dashboard/RecentTickets';

interface Props {
    stats?: {
        active_orders: number;
        unpaid_invoices: number;
        unpaid_amount: number;
        open_tickets: number;
        upcoming_deadlines: number;
        orders_trend?: { value: string; positive: boolean };
        invoices_trend?: { value: string; positive: boolean };
        tickets_trend?: { value: string; positive: boolean };
    };
}

const formatCurrency = (v: number | null | undefined) =>
    new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
    }).format(v ?? 0);

export default function Dashboard({ stats }: Props) {
    const s = stats ?? {
        active_orders: 12,
        unpaid_invoices: 5,
        unpaid_amount: 45000,
        open_tickets: 3,
        upcoming_deadlines: 2,
        orders_trend: { value: '12%', positive: true },
        invoices_trend: { value: '8%', positive: false },
        tickets_trend: { value: '25%', positive: true },
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
                        iconColor="text-blue-400"
                        iconBg="bg-blue-500/10"
                        trend={s.orders_trend}
                        subtitle="od minulého týdne"
                    />
                    <StatCard
                        label="Nezaplacené faktury"
                        value={formatCurrency(s.unpaid_amount)}
                        icon={CreditCard}
                        iconColor="text-amber-400"
                        iconBg="bg-amber-500/10"
                        trend={s.invoices_trend}
                        subtitle="od minulého měsíce"
                    />
                    <StatCard
                        label="Otevřené požadavky"
                        value={String(s.open_tickets)}
                        icon={MessageSquare}
                        iconColor="text-violet-400"
                        iconBg="bg-violet-500/10"
                        trend={s.tickets_trend}
                        subtitle="vyřešeno tento týden"
                    />
                    <StatCard
                        label="Blížící se deadlines"
                        value={String(s.upcoming_deadlines)}
                        icon={AlertTriangle}
                        iconColor="text-rose-400"
                        iconBg="bg-rose-500/10"
                    />
                </div>

                {/* Row 2: Chart + side stats */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <RevenueChart />
                    </div>
                    <div className="space-y-6">
                        {/* Profitability mini cards */}
                        <div className="rounded-xl border border-white/5 bg-[#1a1a22] p-5">
                            <h3 className="mb-4 text-sm font-semibold text-gray-300">
                                Profitabilita
                            </h3>
                            <div className="space-y-4">
                                <MiniStat
                                    label="Celkové příjmy"
                                    value="590 000 Kč"
                                    bar={85}
                                    color="bg-[#D97706]"
                                />
                                <MiniStat
                                    label="Celkové náklady"
                                    value="234 000 Kč"
                                    bar={40}
                                    color="bg-gray-500"
                                />
                                <MiniStat
                                    label="Čistý zisk"
                                    value="356 000 Kč"
                                    bar={60}
                                    color="bg-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Quick info */}
                        <div className="rounded-xl border border-white/5 bg-[#1a1a22] p-5">
                            <h3 className="mb-3 text-sm font-semibold text-gray-300">
                                Tento měsíc
                            </h3>
                            <div className="space-y-2">
                                <QuickStat label="Noví zákazníci" value="4" />
                                <QuickStat label="Dokončené zakázky" value="8" />
                                <QuickStat label="Vystavené faktury" value="12" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 3: Activity + Tickets */}
                <div className="grid gap-6 lg:grid-cols-2">
                    <ActivityTimeline />
                    <RecentTickets />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}

function MiniStat({
    label,
    value,
    bar,
    color,
}: {
    label: string;
    value: string;
    bar: number;
    color: string;
}) {
    return (
        <div>
            <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">{label}</span>
                <span className="font-medium text-white">{value}</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-white/5">
                <div
                    className={`h-full rounded-full ${color}`}
                    style={{ width: `${bar}%` }}
                />
            </div>
        </div>
    );
}

function QuickStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-center justify-between rounded-lg bg-white/[0.03] px-3 py-2">
            <span className="text-sm text-gray-400">{label}</span>
            <span className="text-sm font-semibold text-white">{value}</span>
        </div>
    );
}
