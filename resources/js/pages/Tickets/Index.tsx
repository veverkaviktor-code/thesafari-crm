import { useState } from 'react';
import { router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import DataTable from '@/components/ui/DataTable';
import PriorityBadge from '@/components/tickets/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { MessageSquare, Pencil, Trash2 } from 'lucide-react';
import GlassModal from '@/components/ui/GlassModal';

interface Ticket {
    id: number;
    subject: string;
    customer: { id: number; name: string; company: string | null } | null;
    status: string;
    priority: string;
    source_email: string;
    created_at: string;
    resolved_at: string | null;
    messages_count?: number;
}

interface Props {
    tickets: {
        data: Ticket[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search?: string;
        status?: string;
        priority?: string;
        sort_by?: string;
        sort_dir?: string;
    };
}

const statusMap: Record<string, { label: string; variant: string }> = {
    novy: { label: 'Nový', variant: 'pending' },
    v_reseni: { label: 'V řešení', variant: 'active' },
    ceka_na_zakaznika: { label: 'Čeká na zákazníka', variant: 'inactive' },
    vyreseno: { label: 'Vyřešeno', variant: 'completed' },
};

const baseColumns = [
    {
        key: 'subject' as const,
        label: 'Předmět',
        sortable: true,
        render: (ticket: Ticket) => (
            <div>
                <p className="font-medium text-foreground">{ticket.subject}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{ticket.source_email}</p>
            </div>
        ),
    },
    {
        key: 'customer' as const,
        label: 'Zákazník',
        render: (ticket: Ticket) => (
            <span className="text-foreground/80">
                {ticket.customer ? (ticket.customer.company || ticket.customer.name) : '—'}
            </span>
        ),
    },
    {
        key: 'priority' as const,
        label: 'Priorita',
        sortable: true,
        render: (ticket: Ticket) => <PriorityBadge priority={ticket.priority} />,
    },
    {
        key: 'status' as const,
        label: 'Stav',
        sortable: true,
        render: (ticket: Ticket) => {
            const s = statusMap[ticket.status];
            return s ? <StatusBadge status={s.variant}>{s.label}</StatusBadge> : <span>{ticket.status}</span>;
        },
    },
    {
        key: 'messages_count' as const,
        label: 'Zprávy',
        render: (ticket: Ticket) => (
            <div className="flex items-center gap-1.5 text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5" />
                <span className="text-sm">{ticket.messages_count ?? 0}</span>
            </div>
        ),
    },
    {
        key: 'created_at' as const,
        label: 'Vytvořeno',
        sortable: true,
        render: (ticket: Ticket) => (
            <span className="text-sm text-muted-foreground">
                {format(new Date(ticket.created_at), 'd. M. yyyy', { locale: cs })}
            </span>
        ),
    },
];

export default function TicketsIndex({ tickets, filters }: Props) {
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [priorityFilter, setPriorityFilter] = useState(filters.priority || 'all');
    const [deleteTarget, setDeleteTarget] = useState<Ticket | null>(null);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        router.delete(`/pozadavky/${deleteTarget.id}`, {
            onSuccess: () => {
                setDeleteTarget(null);
                setDeleting(false);
            },
            onError: () => setDeleting(false),
        });
    };

    const columns = [
        ...baseColumns,
        {
            key: 'actions' as const,
            label: '',
            className: 'w-[100px] text-right',
            render: (row: Ticket) => (
                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={() => router.visit(`/pozadavky/${row.id}/edit`)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        title="Upravit"
                    >
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                        onClick={() => setDeleteTarget(row)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                        title="Smazat"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    function applyFilters(overrides: Record<string, string>) {
        const params: Record<string, string> = {
            ...(filters.search ? { search: filters.search } : {}),
            ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
            ...(priorityFilter !== 'all' ? { priority: priorityFilter } : {}),
            ...overrides,
        };
        Object.keys(params).forEach((k) => {
            if (params[k] === 'all' || params[k] === '') delete params[k];
        });
        router.get('/pozadavky', params, { preserveState: true });
    }

    return (
        <AuthenticatedLayout
            title="Požadavky"
            breadcrumbs={[{ label: 'Požadavky' }]}
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-semibold text-foreground">
                        Požadavky
                    </h1>
                </div>

                <DataTable
                    data={tickets.data}
                    columns={columns}
                    pagination={{
                        current_page: tickets.current_page,
                        last_page: tickets.last_page,
                        per_page: tickets.per_page,
                        total: tickets.total,
                        from: null,
                        to: null,
                    }}
                    searchValue={filters.search}
                    onSearchChange={(search) => applyFilters({ search })}
                    sortField={filters.sort_by}
                    sortDirection={filters.sort_dir as 'asc' | 'desc'}
                    onSort={(field) => {
                        const newDir = filters.sort_by === field && filters.sort_dir === 'asc' ? 'desc' : 'asc';
                        applyFilters({ sort_by: field, sort_dir: newDir });
                    }}
                    onPageChange={(page) => applyFilters({ page: String(page) })}
                    onRowClick={(ticket) => router.visit(`/pozadavky/${ticket.id}`)}
                    toolbar={
                        <div className="flex items-center gap-3">
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => { setStatusFilter(v); applyFilters({ status: v }); }}
                            >
                                <SelectTrigger className="w-[160px] bg-muted border-border text-foreground/80">
                                    <SelectValue placeholder="Stav" />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border">
                                    <SelectItem value="all">Všechny stavy</SelectItem>
                                    <SelectItem value="novy">Nový</SelectItem>
                                    <SelectItem value="v_reseni">V řešení</SelectItem>
                                    <SelectItem value="ceka_na_zakaznika">Čeká na zákazníka</SelectItem>
                                    <SelectItem value="vyreseno">Vyřešeno</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select
                                value={priorityFilter}
                                onValueChange={(v) => { setPriorityFilter(v); applyFilters({ priority: v }); }}
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
                    emptyMessage="Žádné požadavky"
                />
            </div>

            {/* Delete confirmation modal */}
            <GlassModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Smazat požadavek" maxWidth="max-w-md">
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Opravdu chcete smazat požadavek{' '}
                        <span className="font-semibold text-foreground">{deleteTarget?.subject}</span>?
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" className="text-muted-foreground hover:text-foreground" onClick={() => setDeleteTarget(null)}>Zrušit</Button>
                        <Button variant="destructive" disabled={deleting} onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            <Trash2 className="h-4 w-4" />
                            {deleting ? 'Mažu...' : 'Smazat'}
                        </Button>
                    </div>
                </div>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
