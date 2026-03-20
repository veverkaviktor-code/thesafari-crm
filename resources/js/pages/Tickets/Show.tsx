import { router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import PriorityBadge from '@/components/tickets/PriorityBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import TicketThread from '@/components/tickets/TicketThread';
import ReplyForm from '@/components/tickets/ReplyForm';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { ArrowLeft, User, Clock, Mail, Phone, Globe, Tag } from 'lucide-react';

interface TicketMessage {
    id: number;
    direction: 'inbound' | 'outbound';
    from_email: string;
    content: string;
    created_at: string;
    attachments?: { id: number; filename: string; path: string }[];
}

interface Ticket {
    id: number;
    subject: string;
    customer: { id: number; name: string; company: string | null; email: string } | null;
    status: string;
    priority: string;
    source_email: string;
    source: string | null;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    website: string | null;
    created_at: string;
    resolved_at: string | null;
    messages: TicketMessage[];
}

interface Props {
    ticket: Ticket;
}

const statusMap: Record<string, { label: string; variant: string }> = {
    novy: { label: 'Nový', variant: 'pending' },
    v_reseni: { label: 'V řešení', variant: 'active' },
    ceka_na_zakaznika: { label: 'Čeká na zákazníka', variant: 'inactive' },
    vyreseno: { label: 'Vyřešeno', variant: 'completed' },
};

export default function TicketShow({ ticket }: Props) {
    const statusInfo = statusMap[ticket.status];

    function handleStatusChange(newStatus: string) {
        router.put(`/zpravy/${ticket.id}`, { status: newStatus }, { preserveScroll: true });
    }

    return (
        <AuthenticatedLayout
            title={ticket.subject}
            breadcrumbs={[
                { label: 'Zprávy', href: '/zpravy' },
                { label: ticket.subject },
            ]}
        >
            <div className="p-6 max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start gap-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.visit('/zpravy')}
                            className="text-muted-foreground hover:text-foreground mt-1"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-semibold text-foreground">{ticket.subject}</h1>
                            <div className="flex items-center gap-3 mt-2">
                                <PriorityBadge priority={ticket.priority} />
                                {statusInfo && (
                                    <StatusBadge status={statusInfo.variant}>{statusInfo.label}</StatusBadge>
                                )}
                            </div>
                        </div>
                    </div>
                    <Select value={ticket.status} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-[180px] bg-muted border-border text-muted-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="novy">Nový</SelectItem>
                            <SelectItem value="v_reseni">V řešení</SelectItem>
                            <SelectItem value="ceka_na_zakaznika">Čeká na zákazníka</SelectItem>
                            <SelectItem value="vyreseno">Vyřešeno</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Info cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-card rounded-xl border border-border p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <User className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">Kontakt</span>
                        </div>
                        {ticket.customer ? (
                            <button
                                onClick={() => router.visit(`/zakaznici/${ticket.customer!.id}`)}
                                className="text-sm text-primary hover:text-primary/80 font-medium"
                            >
                                {ticket.customer.company || ticket.customer.name}
                            </button>
                        ) : ticket.first_name ? (
                            <span className="text-sm text-foreground font-medium">
                                {ticket.first_name} {ticket.last_name}
                            </span>
                        ) : (
                            <span className="text-sm text-muted-foreground">Nepřiřazen</span>
                        )}
                    </div>
                    <div className="bg-card rounded-xl border border-border p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Mail className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">E-mail</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{ticket.source_email}</span>
                        {ticket.phone && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <a href={`tel:${ticket.phone}`} className="text-sm text-muted-foreground hover:text-foreground">
                                    {ticket.phone}
                                </a>
                            </div>
                        )}
                        {ticket.website && (
                            <div className="flex items-center gap-1.5 mt-1">
                                <Globe className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">{ticket.website}</span>
                            </div>
                        )}
                    </div>
                    <div className="bg-card rounded-xl border border-border p-4">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Clock className="h-4 w-4" />
                            <span className="text-xs font-medium uppercase tracking-wider">Vytvořeno</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                            {format(new Date(ticket.created_at), 'd. MMMM yyyy HH:mm', { locale: cs })}
                        </span>
                        {ticket.source && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                                <Tag className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                    {{ web: 'Formulář', email: 'E-mail', api: 'API', manual: 'Manuální' }[ticket.source] ?? ticket.source}
                                </span>
                            </div>
                        )}
                        {ticket.resolved_at && (
                            <p className="text-xs text-green-400 mt-1">
                                Vyřešeno {format(new Date(ticket.resolved_at), 'd. M. yyyy', { locale: cs })}
                            </p>
                        )}
                    </div>
                </div>

                {/* Thread */}
                <div className="bg-card rounded-xl border border-border p-6">
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">Konverzace</h2>
                    <TicketThread messages={ticket.messages} />
                    {ticket.status !== 'vyreseno' && (
                        <div className="mt-6">
                            <ReplyForm ticketId={ticket.id} />
                        </div>
                    )}
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
