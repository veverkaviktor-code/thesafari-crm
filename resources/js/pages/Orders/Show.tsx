import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { FileText, Pencil, Trash2 } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import OrderStatusBadge, {
    type OrderStatus,
} from '@/components/orders/OrderStatusBadge';
import DivisionBadge, {
    type Division,
} from '@/components/orders/DivisionBadge';
import TimeTracker from '@/components/orders/TimeTracker';
import CostsList from '@/components/orders/CostsList';
import OrderItems from '@/components/orders/OrderItems';
import FileUploader from '@/components/FileUploader';
import AttachmentList, { type AttachmentData } from '@/components/AttachmentList';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { cn, formatCurrency, formatHoursMinutes } from '@/lib/utils';

interface TimeEntry {
    id: number;
    started_at: string;
    stopped_at: string | null;
    description: string | null;
    duration_minutes: number;
    hourly_rate: number | null;
    billable_hours: number;
    cost: number;
}

interface OrderCost {
    id: number;
    title: string;
    amount: number;
}

interface OrderItem {
    id: number;
    name: string;
    description: string | null;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
}

interface Customer {
    id: number;
    name: string;
}

interface Order {
    id: number;
    title: string;
    description: string | null;
    customer_id: number;
    customer: Customer;
    division: Division[];
    status: OrderStatus;
    price: number;
    deadline: string | null;
    created_at: string;
    time_entries: TimeEntry[];
    costs: OrderCost[];
    items: OrderItem[];
    attachments: AttachmentData[];
}

interface Stats {
    total_time_minutes: number;
    total_time_cost: number;
    total_costs: number;
    running_timer: TimeEntry | null;
}

interface Props {
    order: Order;
    stats: Stats;
}

function deadlineInfo(deadline: string | null) {
    if (!deadline) return { text: 'Bez termínu', className: 'text-muted-foreground' };
    const diff = new Date(deadline).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    const formatted = format(new Date(deadline), 'd. MMMM yyyy', { locale: cs });
    if (days < 0)
        return {
            text: `${formatted} (po termínu)`,
            className: 'text-red-400',
        };
    if (days < 7)
        return {
            text: `${formatted} (za ${days} ${days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'})`,
            className: 'text-amber-400',
        };
    return { text: formatted, className: 'text-foreground/70' };
}

export default function Show({ order, stats }: Props) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const deadline = deadlineInfo(order.deadline);
    const itemsPrice = Number(order.price) || 0;
    const timeCost = Number(stats.total_time_cost) || 0;
    const totalRevenue = itemsPrice + timeCost;
    const materialCosts = Number(stats.total_costs) || 0;
    const profit = totalRevenue - materialCosts;
    const margin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;
    const marginClassName =
        margin >= 30
            ? 'text-emerald-400'
            : margin >= 10
              ? 'text-amber-400'
              : 'text-red-400';

    const handleStatusChange = (status: string) => {
        router.put(
            `/zakazky/${order.id}`,
            { status },
            { preserveScroll: true },
        );
    };

    const handleDelete = () => setShowDeleteConfirm(true);

    // Completed entries only (not running)
    const completedEntries = order.time_entries.filter(
        (e) => e.stopped_at !== null,
    );

    return (
        <AuthenticatedLayout
            title={order.title}
            breadcrumbs={[
                { label: 'Zakázky', href: '/zakazky' },
                { label: order.title },
            ]}
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-semibold text-foreground">
                                {order.title}
                            </h1>
                            <OrderStatusBadge status={order.status} />
                            {(Array.isArray(order.division) ? order.division : [order.division]).map((d) => (
                                <DivisionBadge key={d} division={d} />
                            ))}
                        </div>
                        <div className="mt-2 flex items-center gap-4 text-sm">
                            <Link
                                href={`/zakaznici/${order.customer.id}`}
                                className="text-primary hover:underline"
                            >
                                {order.customer.name}
                            </Link>
                            <span className={deadline.className}>
                                {deadline.text}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Select
                            value={order.status}
                            onValueChange={handleStatusChange}
                        >
                            <SelectTrigger className="w-[140px] border-border bg-accent">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-card">
                                <SelectItem value="nova" className="focus:bg-accent">Nová</SelectItem>
                                <SelectItem value="v_reseni" className="focus:bg-accent">V řešení</SelectItem>
                                <SelectItem value="hotovo" className="focus:bg-accent">Hotovo</SelectItem>
                                <SelectItem value="fakturovano" className="focus:bg-accent">Fakturováno</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            asChild
                            size="icon"
                            className="bg-[#ad9d8e]/15 text-[#ad9d8e] hover:bg-[#ad9d8e]/25 border border-[#ad9d8e]/25"
                        >
                            <Link href={`/zakazky/${order.id}/upravit`}>
                                <Pencil className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Button
                            size="icon"
                            className="bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/25"
                            onClick={handleDelete}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Main content */}
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Left: Details */}
                    <div className="space-y-6 lg:col-span-2">
                        {/* Description + Price */}
                        <div className="rounded-xl border border-border bg-card p-5">
                            {order.description && (
                                <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
                                    {order.description}
                                </p>
                            )}
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                                <InfoBox
                                    label="Cena zakázky"
                                    value={formatCurrency(totalRevenue)}
                                    className="text-foreground"
                                    subtitle={timeCost > 0 ? `položky ${formatCurrency(itemsPrice)} + čas ${formatCurrency(timeCost)}` : undefined}
                                    subtitleClassName="text-muted-foreground"
                                />
                                <InfoBox
                                    label="Odpracováno"
                                    value={formatHoursMinutes(stats.total_time_minutes ?? 0)}
                                    className="text-foreground/70"
                                    subtitle={timeCost > 0 ? formatCurrency(timeCost) : undefined}
                                    subtitleClassName="text-primary"
                                />
                                <InfoBox
                                    label="Náklady"
                                    value={formatCurrency(materialCosts)}
                                    className="text-foreground/70"
                                />
                                <InfoBox
                                    label="Zisk"
                                    value={formatCurrency(profit)}
                                    className={
                                        profit >= 0
                                            ? 'text-emerald-400'
                                            : 'text-red-400'
                                    }
                                    subtitle={`marže ${Math.round(margin)} %`}
                                    subtitleClassName={marginClassName}
                                />
                            </div>
                        </div>

                        {/* Time Tracker */}
                        <TimeTracker
                            orderId={order.id}
                            timeEntries={completedEntries}
                            runningTimer={stats.running_timer ?? null}
                            totalTimeMinutes={stats.total_time_minutes ?? 0}
                            totalTimeCost={stats.total_time_cost ?? 0}
                        />

                        {/* Order Items */}
                        <OrderItems
                            orderId={order.id}
                            items={order.items ?? []}
                        />
                    </div>

                    {/* Right sidebar */}
                    <div className="space-y-6">
                        {/* Order info card */}
                        <div className="rounded-xl border border-border bg-card p-5">
                            <h3 className="mb-3 text-sm font-semibold text-foreground/70">
                                Info
                            </h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Vytvořeno</span>
                                    <span className="text-foreground/70">
                                        {format(
                                            new Date(order.created_at),
                                            'd. M. yyyy',
                                        )}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Časové záznamy</span>
                                    <span className="text-foreground/70">
                                        {order.time_entries.length}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Materiálové náklady</span>
                                    <span className="text-foreground/70">
                                        {order.costs.length}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Costs */}
                        <CostsList
                            orderId={order.id}
                            costs={order.costs}
                            totalCosts={stats.total_costs ?? 0}
                        />

                        {/* Invoice button */}
                        <Button
                            asChild
                            className="w-full bg-primary text-white hover:bg-primary/80"
                        >
                            <Link
                                href={`/faktury/create?order_id=${order.id}`}
                            >
                                <FileText className="h-4 w-4" />
                                Vystavit fakturu
                            </Link>
                        </Button>

                        {/* Attachments */}
                        <div className="rounded-xl border border-border bg-card p-5">
                            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground/70">
                                <span>📎</span> Přílohy
                            </h3>
                            <FileUploader attachableType="order" attachableId={order.id} />
                            <div className="mt-4">
                                <AttachmentList attachments={order.attachments ?? []} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <ConfirmDialog
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => router.delete(`/zakazky/${order.id}`)}
                title="Smazat zakázku"
                message={`Opravdu chcete smazat zakázku "${order.title}"? Zakázka bude přesunuta do koše.`}
            />
        </AuthenticatedLayout>
    );
}

function InfoBox({
    label,
    value,
    className,
    subtitle,
    subtitleClassName,
}: {
    label: string;
    value: string;
    className?: string;
    subtitle?: string;
    subtitleClassName?: string;
}) {
    return (
        <div className="rounded-lg bg-accent p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className={cn('mt-1 text-lg font-semibold', className)}>
                {value}
            </p>
            {subtitle && (
                <p className={cn('text-xs', subtitleClassName)}>{subtitle}</p>
            )}
        </div>
    );
}
