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
    low: { label: 'Nízká', className: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    medium: { label: 'Střední', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    high: { label: 'Vysoká', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    urgent: { label: 'Urgentní', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

// Placeholder data
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
        <div className="rounded-xl border border-white/5 bg-[#1a1a22] p-5">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-300">
                    Požadavky k řešení
                </h3>
                <Link
                    href="/pozadavky"
                    className="flex items-center gap-1 text-xs text-[#D97706] hover:underline"
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
                            className="flex items-center gap-3 rounded-lg bg-white/[0.03] p-3 transition-colors hover:bg-white/5"
                        >
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-gray-300">
                                    {ticket.subject}
                                </p>
                                <p className="text-xs text-gray-500">
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
