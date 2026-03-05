import { useState } from 'react';
import { router } from '@inertiajs/react';
import { format, isPast } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Check, ExternalLink, Pencil, Plus, Trash2 } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import DataTable from '@/components/ui/DataTable';
import GlassModal from '@/components/ui/GlassModal';
import PriorityBadge from '@/components/tickets/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TaskForm from '@/components/planner/TaskForm';
import CalendarGrid from '@/components/planner/CalendarGrid';

interface Task {
    id: number;
    title: string;
    description: string | null;
    status: 'novy' | 'rozpracovany' | 'hotovy' | 'zruseny';
    priority: 'low' | 'medium' | 'high';
    due_date: string | null;
    completed_at: string | null;
    customer_id: number | null;
    order_id: number | null;
    invoice_id: number | null;
    customer: { id: number; name: string; company: string | null } | null;
    order: { id: number; title: string } | null;
    invoice: { id: number; invoice_number: string } | null;
    created_at: string;
}

interface CalendarEvent {
    id: number;
    title: string;
    date: string;
    type: 'task' | 'subscription' | 'invoice';
    priority?: string;
    subtype?: string;
    total?: number;
}

interface Props {
    tasks: {
        data: Task[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        from: number | null;
        to: number | null;
    };
    calendarEvents: {
        tasks: CalendarEvent[];
        subscriptions: CalendarEvent[];
        invoices: CalendarEvent[];
    };
    filters: {
        search?: string;
        status?: string;
        priority?: string;
        period?: string;
    };
    customers: { id: number; name: string; company: string | null }[];
    orders: { id: number; title: string }[];
    invoices: { id: number; invoice_number: string }[];
}

const statusMap: Record<string, { label: string; variant: 'pending' | 'active' | 'completed' | 'cancelled' }> = {
    novy: { label: 'Nový', variant: 'pending' },
    rozpracovany: { label: 'Rozpracovaný', variant: 'active' },
    hotovy: { label: 'Hotový', variant: 'completed' },
    zruseny: { label: 'Zrušený', variant: 'cancelled' },
};

export default function PlannerIndex({ tasks, calendarEvents, filters, customers, orders, invoices }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Task | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
    const [deleting, setDeleting] = useState(false);

    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [priorityFilter, setPriorityFilter] = useState(filters.priority || 'all');
    const [periodFilter, setPeriodFilter] = useState(filters.period || 'all');

    const allCalendarEvents: CalendarEvent[] = [
        ...calendarEvents.tasks,
        ...calendarEvents.subscriptions,
        ...calendarEvents.invoices,
    ];

    function applyFilters(overrides: Record<string, string>) {
        const params: Record<string, string> = {
            ...(filters.search ? { search: filters.search } : {}),
            ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
            ...(priorityFilter !== 'all' ? { priority: priorityFilter } : {}),
            ...(periodFilter !== 'all' ? { period: periodFilter } : {}),
            ...overrides,
        };
        Object.keys(params).forEach((k) => {
            if (params[k] === 'all' || params[k] === '') delete params[k];
        });
        router.get('/planovac', params, { preserveState: true });
    }

    const handleToggle = (task: Task) => {
        router.post(`/planovac/${task.id}/toggle`, {}, { preserveScroll: true });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(`/planovac/${deleteTarget.id}`, {
            onSuccess: () => {
                setDeleteTarget(null);
                setDeleting(false);
            },
            onError: () => setDeleting(false),
        });
    };

    const handleCalendarTaskClick = (taskId: number) => {
        const task = tasks.data.find((t) => t.id === taskId);
        if (task) setEditTarget(task);
    };

    const columns = [
        {
            key: 'toggle' as const,
            label: '',
            className: 'w-[48px]',
            render: (task: Task) => (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggle(task);
                    }}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                        task.status === 'hotovy'
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-border bg-transparent text-transparent hover:border-emerald-500/60 hover:bg-emerald-500/10'
                    }`}
                    title={task.status === 'hotovy' ? 'Označit jako otevřený' : 'Označit jako hotový'}
                >
                    <Check className="h-3 w-3" />
                </button>
            ),
        },
        {
            key: 'title' as const,
            label: 'Úkol',
            sortable: true,
            render: (task: Task) => (
                <div>
                    <p
                        className={`font-medium text-foreground leading-tight ${
                            task.status === 'hotovy' ? 'line-through text-muted-foreground' : ''
                        }`}
                    >
                        {task.title}
                    </p>
                    {task.description && (
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                            {task.description}
                        </p>
                    )}
                </div>
            ),
        },
        {
            key: 'priority' as const,
            label: 'Priorita',
            sortable: true,
            render: (task: Task) => <PriorityBadge priority={task.priority} />,
        },
        {
            key: 'status' as const,
            label: 'Stav',
            sortable: true,
            render: (task: Task) => {
                const s = statusMap[task.status];
                return s ? (
                    <StatusBadge status={s.variant} label={s.label} />
                ) : (
                    <span className="text-sm text-muted-foreground">{task.status}</span>
                );
            },
        },
        {
            key: 'due_date' as const,
            label: 'Termín',
            sortable: true,
            render: (task: Task) => {
                if (!task.due_date) return <span className="text-muted-foreground">—</span>;
                const date = new Date(task.due_date);
                const overdue = task.status !== 'hotovy' && task.status !== 'zruseny' && isPast(date);
                return (
                    <span
                        className={`text-sm ${overdue ? 'font-medium text-red-400' : 'text-muted-foreground'}`}
                    >
                        {format(date, 'd. M. yyyy', { locale: cs })}
                    </span>
                );
            },
        },
        {
            key: 'linked' as const,
            label: 'Vazba',
            render: (task: Task) => {
                if (task.customer) {
                    return (
                        <a
                            href={`/zakaznici/${task.customer.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-amber-400 hover:underline"
                        >
                            <ExternalLink className="h-3 w-3" />
                            {task.customer.company ?? task.customer.name}
                        </a>
                    );
                }
                if (task.order) {
                    return (
                        <a
                            href={`/zakazky/${task.order.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                        >
                            <ExternalLink className="h-3 w-3" />
                            {task.order.title}
                        </a>
                    );
                }
                if (task.invoice) {
                    return (
                        <a
                            href={`/faktury/${task.invoice.id}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:underline"
                        >
                            <ExternalLink className="h-3 w-3" />
                            {task.invoice.invoice_number}
                        </a>
                    );
                }
                return <span className="text-muted-foreground">—</span>;
            },
        },
        {
            key: 'actions' as const,
            label: '',
            className: 'w-[80px] text-right',
            render: (task: Task) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => setEditTarget(task)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Upravit"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => setDeleteTarget(task)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Smazat"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout title="Plánovač" breadcrumbs={[{ label: 'Plánovač' }]}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-foreground">Plánovač</h1>
                    <Button
                        onClick={() => setCreateOpen(true)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <Plus className="h-4 w-4" />
                        Nový úkol
                    </Button>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="seznam">
                    <TabsList className="bg-muted">
                        <TabsTrigger value="seznam">Seznam</TabsTrigger>
                        <TabsTrigger value="kalendar">Kalendář</TabsTrigger>
                    </TabsList>

                    {/* Seznam tab */}
                    <TabsContent value="seznam" className="mt-4">
                        <DataTable
                            data={tasks.data}
                            columns={columns}
                            pagination={{
                                current_page: tasks.current_page,
                                last_page: tasks.last_page,
                                per_page: tasks.per_page,
                                total: tasks.total,
                                from: tasks.from,
                                to: tasks.to,
                            }}
                            searchValue={filters.search}
                            onSearchChange={(search) => applyFilters({ search })}
                            searchPlaceholder="Hledat úkoly..."
                            onPageChange={(page) => applyFilters({ page: String(page) })}
                            emptyMessage="Žádné úkoly"
                            toolbar={
                                <div className="flex items-center gap-3">
                                    <Select
                                        value={periodFilter}
                                        onValueChange={(v) => {
                                            setPeriodFilter(v);
                                            applyFilters({ period: v });
                                        }}
                                    >
                                        <SelectTrigger className="w-[160px] bg-muted border-border text-foreground/80">
                                            <SelectValue placeholder="Období" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border">
                                            <SelectItem value="all">Vše</SelectItem>
                                            <SelectItem value="today">Dnes</SelectItem>
                                            <SelectItem value="this_week">Tento týden</SelectItem>
                                            <SelectItem value="overdue">Po termínu</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select
                                        value={statusFilter}
                                        onValueChange={(v) => {
                                            setStatusFilter(v);
                                            applyFilters({ status: v });
                                        }}
                                    >
                                        <SelectTrigger className="w-[150px] bg-muted border-border text-foreground/80">
                                            <SelectValue placeholder="Stav" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border">
                                            <SelectItem value="all">Všechny stavy</SelectItem>
                                            <SelectItem value="novy">Nový</SelectItem>
                                            <SelectItem value="rozpracovany">Rozpracovaný</SelectItem>
                                            <SelectItem value="hotovy">Hotový</SelectItem>
                                            <SelectItem value="zruseny">Zrušený</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    <Select
                                        value={priorityFilter}
                                        onValueChange={(v) => {
                                            setPriorityFilter(v);
                                            applyFilters({ priority: v });
                                        }}
                                    >
                                        <SelectTrigger className="w-[140px] bg-muted border-border text-foreground/80">
                                            <SelectValue placeholder="Priorita" />
                                        </SelectTrigger>
                                        <SelectContent className="bg-card border-border">
                                            <SelectItem value="all">Všechny</SelectItem>
                                            <SelectItem value="low">Nízká</SelectItem>
                                            <SelectItem value="medium">Střední</SelectItem>
                                            <SelectItem value="high">Vysoká</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            }
                        />
                    </TabsContent>

                    {/* Kalendář tab */}
                    <TabsContent value="kalendar" className="mt-4">
                        <CalendarGrid
                            events={allCalendarEvents}
                            onTaskClick={handleCalendarTaskClick}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Create modal */}
            <GlassModal
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                title="Nový úkol"
                maxWidth="max-w-2xl"
            >
                <TaskForm
                    customers={customers}
                    orders={orders}
                    invoices={invoices}
                    onClose={() => setCreateOpen(false)}
                />
            </GlassModal>

            {/* Edit modal */}
            <GlassModal
                open={!!editTarget}
                onClose={() => setEditTarget(null)}
                title="Upravit úkol"
                maxWidth="max-w-2xl"
            >
                {editTarget && (
                    <TaskForm
                        task={editTarget}
                        customers={customers}
                        orders={orders}
                        invoices={invoices}
                        onClose={() => setEditTarget(null)}
                    />
                )}
            </GlassModal>

            {/* Delete confirmation modal */}
            <GlassModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title="Smazat úkol"
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Opravdu chcete smazat úkol{' '}
                        <span className="font-semibold text-foreground">{deleteTarget?.title}</span>?
                        Tato akce je nevratná.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setDeleteTarget(null)}
                        >
                            Zrušit
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={deleting}
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <Trash2 className="h-4 w-4" />
                            {deleting ? 'Mažu...' : 'Smazat'}
                        </Button>
                    </div>
                </div>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
