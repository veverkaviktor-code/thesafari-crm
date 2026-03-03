import { Link } from '@inertiajs/react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Ticket {
    id: number;
    subject: string;
    customer: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    created_at: string;
}

const priorityConfig = {
    low: { label: 'Nízká', className: 'bg-accent text-muted-foreground border-border' },
    medium: { label: 'Střední', className: 'bg-[#D4A574]/10 text-[#D4A574] border-[#D4A574]/20' },
    high: { label: 'Vysoká', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
    urgent: { label: 'Urgentní', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
};

const placeholderTickets: Ticket[] = [
    { id: 1, subject: 'Nefunguje kontaktní formulář', customer: 'Studio Grafika', priority: 'high', created_at: 'Před 1 hodinou' },
    { id: 2, subject: 'Aktualizace ceníku na webu', customer: 'Jan Procházka', priority: 'medium', created_at: 'Před 3 hodinami' },
    { id: 3, subject: 'Nový design vizitky', customer: 'ABC Logistics', priority: 'low', created_at: 'Včera' },
    { id: 4, subject: 'SSL certifikát expiruje', customer: 'Kavárna U Mlynáře', priority: 'urgent', created_at: 'Včera' },
    { id: 5, subject: 'Přidání foto do galerie', customer: 'Hotel Relax', priority: 'low', created_at: 'Před 2 dny' },
];

interface Props {
    tickets?: Ticket[];
}

export default function RecentTickets({ tickets }: Props) {
    const items = tickets ?? placeholderTickets;

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">
                    Požadavky k řešení
                </h3>
                <Link
                    href="/pozadavky"
                    className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                    Zobrazit vše
                    <ArrowRight className="h-3 w-3" />
                </Link>
            </div>
            <div className="space-y-2">
                {items.map((ticket) => {
                    const priority = priorityConfig[ticket.priority];
                    return (
                        <div
                            key={ticket.id}
                            className="flex items-center gap-3 rounded-lg bg-accent/50 p-3 transition-colors hover:bg-accent"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground/80">
                                    {ticket.subject}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {ticket.customer} &middot; {ticket.created_at}
                                </p>
                            </div>
                            <span
                                className={cn(
                                    'shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                                    priority.className,
                                )}
                            >
                                {priority.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
