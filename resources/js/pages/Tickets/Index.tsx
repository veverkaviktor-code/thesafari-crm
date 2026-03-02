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
import { MessageSquare } from 'lucide-react';

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

const columns = [
    {
        key: 'subject' as const,
        label: 'Předmět',
        sortable: true,
        render: (ticket: Ticket) => (
            <div>
                <p className="font-medium text-gray-200">{ticket.subject}</p>
                <p className="text-xs text-gray-500 mt-0.5">{ticket.source_email}</p>
            </div>
        ),
    },
    {
        key: 'customer' as const,
        label: 'Zákazník',
        render: (ticket: Ticket) => (
            <span className="text-gray-300">
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
            <div className="flex items-center gap-1.5 text-gray-400">
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
            <span className="text-sm text-gray-400">
                {format(new Date(ticket.created_at), 'd. M. yyyy', { locale: cs })}
            </span>
        ),
    },
];

export default function TicketsIndex({ tickets, filters }: Props) {
    const [statusFilter, setStatusFilter] = useState(filters.status || 'all');
    const [priorityFilter, setPriorityFilter] = useState(filters.priority || 'all');

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
            <div className="p-6">
                <DataTable
                    data={tickets.data}
                    columns={columns}
                    pagination={{
                        currentPage: tickets.current_page,
                        lastPage: tickets.last_page,
                        perPage: tickets.per_page,
                        total: tickets.total,
                    }}
                    searchValue={filters.search}
                    onSearch={(search) => applyFilters({ search })}
                    sortBy={filters.sort_by}
                    sortDir={filters.sort_dir as 'asc' | 'desc'}
                    onSort={(sort_by, sort_dir) => applyFilters({ sort_by, sort_dir })}
                    onPageChange={(page) => applyFilters({ page: String(page) })}
                    onRowClick={(ticket) => router.visit(`/pozadavky/${ticket.id}`)}
                    toolbar={
                        <div className="flex items-center gap-3">
                            <Select
                                value={statusFilter}
                                onValueChange={(v) => { setStatusFilter(v); applyFilters({ status: v }); }}
                            >
                                <SelectTrigger className="w-[160px] bg-[#111116] border-white/10 text-gray-300">
                                    <SelectValue placeholder="Stav" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a22] border-white/10">
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
                                <SelectTrigger className="w-[140px] bg-[#111116] border-white/10 text-gray-300">
                                    <SelectValue placeholder="Priorita" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a22] border-white/10">
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
        </AuthenticatedLayout>
    );
}
