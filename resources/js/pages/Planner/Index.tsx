import { useEffect, useMemo, useState } from 'react';
import { router } from '@inertiajs/react';
import { format, isPast } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Check, ExternalLink, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import DataTable, { type Column } from '@/components/ui/DataTable';
import GlassModal from '@/components/ui/GlassModal';
import PriorityBadge from '@/components/tickets/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import TaskForm from '@/components/planner/TaskForm';
import CalendarGrid from '@/components/planner/CalendarGrid';
import AttentionAlerts from '@/components/dashboard/AttentionAlerts';

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
    deleted_at?: string | null;
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
        trashed?: string;
    };
    customers: { id: number; name: string; company: string | null }[];
    orders: { id: number; title: string }[];
    invoices: { id: number; invoice_number: string }[];
    alerts?: {
        type: 'danger' | 'warning' | 'info';
        icon: string;
        title: string;
        subtitle: string;
        link: string;
        subscription_id?: number;
    }[];
    ignoredAlerts?: {
        subscription_id: number;
        name: string;
        type: string;
        ignored_at: string;
        link: string;
    }[];
    trashedCount: number;
}

const statusMap: Record<string, { label: string; variant: 'pending' | 'active' | 'completed' | 'cancelled' }> = {
    novy: { label: 'Nový', variant: 'pending' },
    rozpracovany: { label: 'Rozpracovaný', variant: 'active' },
    hotovy: { label: 'Hotový', variant: 'completed' },
    zruseny: { label: 'Zrušený', variant: 'cancelled' },
};

export default function PlannerIndex({ tasks, calendarEvents, filters, customers, orders, invoices, alerts, ignoredAlerts, trashedCount }: Props) {
    const [createOpen, setCreateOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Task | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [restoring, setRestoring] = useState<number | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [bulkProcessing, setBulkProcessing] = useState(false);
    const [showEmptyTrash, setShowEmptyTrash] = useState(false);

    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [priorityFilter, setPriorityFilter] = useState(filters.priority || 'all');
    const [periodFilter, setPeriodFilter] = useState(filters.period || 'all');

    const isTrashed = filters.trashed === '1';

    // Reset selection on tab change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [isTrashed]);

    const allCalendarEvents: CalendarEvent[] = [
        ...calendarEvents.tasks,
        ...calendarEvents.subscriptions,
        ...calendarEvents.invoices,
    ];

    function applyFilters(overrides: Record<string, string | undefined>) {
        const params: Record<string, string> = {
            ...(filters.search ? { search: filters.search } : {}),
            ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
            ...(priorityFilter !== 'all' ? { priority: priorityFilter } : {}),
            ...(periodFilter !== 'all' ? { period: periodFilter } : {}),
            ...overrides,
        };
        Object.keys(params).forEach((k) => {
            if (params[k] === 'all' || params[k] === '' || params[k] === undefined) delete params[k];
        });
        router.get('/planovac', params, { preserveState: true });
    }

    const handleToggle = (task: Task) => {
        router.post(`/planovac/${task.id}/toggle`, {}, { preserveScroll: true });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        if (isTrashed) {
            router.delete(`/planovac/${deleteTarget.id}/force-delete`, {
                onSuccess: () => { setDeleteTarget(null); setDeleting(false); },
                onError: () => setDeleting(false),
            });
        } else {
            router.delete(`/planovac/${deleteTarget.id}`, {
                onSuccess: () => { setDeleteTarget(null); setDeleting(false); },
                onError: () => setDeleting(false),
            });
        }
    };

    const handleRestore = (id: number) => {
        setRestoring(id);
        router.post(`/planovac/${id}/restore`, {}, {
            onSuccess: () => setRestoring(null),
            onError: () => setRestoring(null),
        });
    };

    const handleCalendarTaskClick = (taskId: number) => {
        const task = tasks.data.find((t) => t.id === taskId);
        if (task) setEditTarget(task);
    };

    const handleBulkDelete = () => {
        setBulkProcessing(true);
        router.post('/planovac/bulk-delete', { ids: Array.from(selectedIds) }, {
            onSuccess: () => { setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    const handleBulkRestore = () => {
        setBulkProcessing(true);
        router.post('/planovac/bulk-restore', { ids: Array.from(selectedIds) }, {
            onSuccess: () => { setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    const handleBulkForceDelete = () => {
        setBulkProcessing(true);
        router.delete('/planovac/bulk-force-delete', { data: { ids: Array.from(selectedIds) } }, {
            onSuccess: () => { setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    const handleEmptyTrash = () => {
        setBulkProcessing(true);
        router.delete('/planovac/empty-trash', {}, {
            onSuccess: () => { setShowEmptyTrash(false); setSelectedIds(new Set()); setBulkProcessing(false); },
            onError: () => setBulkProcessing(false),
        });
    };

    const activeColumns = useMemo<Column<Task>[]>(() => [
        {
            key: 'toggle',
            label: '',
            className: 'w-[48px]',
            render: (task) => (
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
            key: 'title',
            label: 'Úkol',
            sortable: true,
            render: (task) => (
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
            key: 'priority',
            label: 'Priorita',
            sortable: true,
            render: (task) => <PriorityBadge priority={task.priority} />,
        },
        {
            key: 'status',
            label: 'Stav',
            sortable: true,
            render: (task) => {
                const s = statusMap[task.status];
                return s ? (
                    <StatusBadge status={s.variant} label={s.label} />
                ) : (
                    <span className="text-sm text-muted-foreground">{task.status}</span>
                );
            },
        },
        {
            key: 'due_date',
            label: 'Termín',
            sortable: true,
            render: (task) => {
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
            key: 'linked',
            label: 'Vazba',
            render: (task) => {
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
            key: 'actions',
            label: '',
            className: 'w-[80px] text-right',
            render: (task) => (
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
    ], []);

    const trashedColumns = useMemo<Column<Task>[]>(() => [
        {
            key: 'title',
            label: 'Úkol',
            render: (task) => (
                <span className="font-medium text-muted-foreground">{task.title}</span>
            ),
        },
        {
            key: 'priority',
            label: 'Priorita',
            render: (task) => <PriorityBadge priority={task.priority} />,
        },
        {
            key: 'due_date',
            label: 'Termín',
            render: (task) => (
                <span className="text-sm text-muted-foreground">
                    {task.due_date ? format(new Date(task.due_date), 'd. M. yyyy', { locale: cs }) : '—'}
                </span>
            ),
        },
        {
            key: 'deleted_at',
            label: 'Smazáno',
            render: (task) => (
                <span className="text-muted-foreground">
                    {task.deleted_at ? formatDate(task.deleted_at) : ''}
                </span>
            ),
        },
        {
            key: 'actions',
            label: '',
            className: 'w-[120px] text-right',
            render: (task) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => handleRestore(task.id)}
                        disabled={restoring === task.id}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-emerald-500/10 hover:text-emerald-500"
                        title="Obnovit"
                    >
                        <RotateCcw className={`h-3.5 w-3.5 ${restoring === task.id ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(task)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Trvale smazat"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ], [restoring]);

    return (
        <AuthenticatedLayout title="To Do" breadcrumbs={[{ label: 'To Do' }]}>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-foreground">To Do</h1>
                    {!isTrashed && (
                        <Button
                            onClick={() => setCreateOpen(true)}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            <Plus className="h-4 w-4" />
                            Nový úkol
                        </Button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => applyFilters({ trashed: undefined })}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                !isTrashed
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Všechny
                        </button>
                        <button
                            onClick={() => applyFilters({ trashed: '1', status: undefined, priority: undefined, period: undefined })}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                                isTrashed
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Smazané
                            {trashedCount > 0 && (
                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/10 px-1.5 text-xs font-medium text-red-400">
                                    {trashedCount}
                                </span>
                            )}
                        </button>
                    </div>
                    {isTrashed && trashedCount > 0 && (
                        <div className="pb-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowEmptyTrash(true)}
                                className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Vysypat koš
                            </Button>
                        </div>
                    )}
                </div>

                {isTrashed ? (
                    /* Koš — single column layout bez kalendáře a alertů */
                    <div className="space-y-4">
                        {/* Bulk action bar */}
                        {selectedIds.size > 0 && (
                            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-2">
                                <span className="text-sm text-muted-foreground">
                                    Vybráno: <span className="font-medium text-foreground">{selectedIds.size}</span>
                                </span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBulkRestore}
                                        disabled={bulkProcessing}
                                        className="border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Obnovit vybrané
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleBulkForceDelete}
                                        disabled={bulkProcessing}
                                        className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Smazat trvale
                                    </Button>
                                </div>
                            </div>
                        )}
                        <DataTable<Task>
                            data={tasks.data}
                            columns={trashedColumns}
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
                            searchPlaceholder="Hledat smazané úkoly..."
                            onPageChange={(page) => applyFilters({ page: String(page) })}
                            emptyMessage="Žádné smazané úkoly"
                            onRowClick={undefined}
                            selectable={true}
                            selectedIds={selectedIds}
                            onSelectionChange={setSelectedIds}
                            getItemId={(item) => item.id}
                        />
                    </div>
                ) : (
                    /* Aktivní — 2-column layout: Seznam + Kalendář */
                    <div className="grid gap-6 lg:grid-cols-[7fr_3fr] items-start">
                        {/* Seznam + Alerts */}
                        <div className="space-y-6">
                            {/* Bulk action bar */}
                            {selectedIds.size > 0 && (
                                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 px-4 py-2">
                                    <span className="text-sm text-muted-foreground">
                                        Vybráno: <span className="font-medium text-foreground">{selectedIds.size}</span>
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleBulkDelete}
                                            disabled={bulkProcessing}
                                            className="border-red-500/30 text-red-500 hover:bg-red-500/10"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Smazat vybrané
                                        </Button>
                                    </div>
                                </div>
                            )}
                            <DataTable<Task>
                                data={tasks.data}
                                columns={activeColumns}
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
                                onRowClick={(task) => setEditTarget(task)}
                                selectable={true}
                                selectedIds={selectedIds}
                                onSelectionChange={setSelectedIds}
                                getItemId={(item) => item.id}
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

                            <AttentionAlerts alerts={alerts} ignoredAlerts={ignoredAlerts} defaultVisible={5} />
                        </div>

                        {/* Kalendář */}
                        <div className="sticky top-24">
                            <CalendarGrid
                                events={allCalendarEvents}
                                onTaskClick={handleCalendarTaskClick}
                            />
                        </div>
                    </div>
                )}
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
                title={isTrashed ? 'Trvale smazat úkol' : 'Smazat úkol'}
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        {isTrashed ? (
                            <>
                                Opravdu chcete <span className="font-semibold text-red-400">trvale smazat</span> úkol{' '}
                                <span className="font-semibold text-foreground">{deleteTarget?.title}</span>?
                                Tuto akci nelze vrátit.
                            </>
                        ) : (
                            <>
                                Opravdu chcete smazat úkol{' '}
                                <span className="font-semibold text-foreground">{deleteTarget?.title}</span>?
                                Úkol bude možné obnovit z koše.
                            </>
                        )}
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
                            {deleting ? 'Mažu...' : isTrashed ? 'Trvale smazat' : 'Do koše'}
                        </Button>
                    </div>
                </div>
            </GlassModal>

            {/* Empty trash confirmation modal */}
            <GlassModal
                open={showEmptyTrash}
                onClose={() => setShowEmptyTrash(false)}
                title="Vysypat koš"
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Opravdu chcete <span className="font-semibold text-red-400">trvale smazat všech {trashedCount} položek</span> v koši?
                        Tuto akci nelze vrátit.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setShowEmptyTrash(false)}>Zrušit</Button>
                        <Button
                            variant="destructive"
                            disabled={bulkProcessing}
                            onClick={handleEmptyTrash}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <Trash2 className="h-4 w-4" />
                            {bulkProcessing ? 'Mažu...' : 'Vysypat koš'}
                        </Button>
                    </div>
                </div>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
