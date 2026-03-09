import { Link } from '@inertiajs/react';
import {
    CheckCircle2,
    Clock,
    CreditCard,
    FileText,
    MessageSquare,
    Package,
    Receipt,
    UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Activity {
    id: number;
    icon: 'customer' | 'order' | 'invoice' | 'payment' | 'ticket' | 'time_entry' | 'cost' | 'item' | 'task' | 'estimate';
    text: string;
    time: string;
    created_at: string;
    changes?: string | null;
    link?: string | null;
}

const iconMap = {
    customer:   { icon: UserPlus,      color: 'text-amber-500',    bg: 'bg-amber-500/10' },
    order:      { icon: FileText,      color: 'text-primary',      bg: 'bg-primary/10' },
    invoice:    { icon: FileText,      color: 'text-[#D4A574]',    bg: 'bg-[#D4A574]/10' },
    payment:    { icon: CreditCard,    color: 'text-lime-600',     bg: 'bg-lime-600/10' },
    ticket:     { icon: MessageSquare, color: 'text-orange-500',   bg: 'bg-orange-500/10' },
    time_entry: { icon: Clock,         color: 'text-sky-500',      bg: 'bg-sky-500/10' },
    cost:       { icon: Receipt,       color: 'text-rose-500',     bg: 'bg-rose-500/10' },
    item:       { icon: Package,       color: 'text-violet-500',   bg: 'bg-violet-500/10' },
    task:       { icon: CheckCircle2,  color: 'text-emerald-500',  bg: 'bg-emerald-500/10' },
    estimate:   { icon: FileText,      color: 'text-amber-400',    bg: 'bg-amber-400/10' },
};

interface Props {
    activities?: Activity[];
}

export default function ActivityTimeline({ activities }: Props) {
    const items = activities ?? [];

    if (items.length === 0) {
        return (
            <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                    Poslední aktivita
                </h3>
                <p className="text-sm text-muted-foreground">Žádná aktivita</p>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                Poslední aktivita
            </h3>
            <div className="max-h-[480px] space-y-4 overflow-y-auto overflow-x-hidden">
                {items.map((activity, index) => {
                    const config = iconMap[activity.icon] ?? iconMap.order;
                    const Icon = config.icon;

                    const content = (
                        <>
                            <div className="relative flex flex-col items-center">
                                <div
                                    className={cn(
                                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                                        config.bg,
                                    )}
                                >
                                    <Icon
                                        className={cn('h-3.5 w-3.5', config.color)}
                                    />
                                </div>
                                {index < items.length - 1 && (
                                    <div className="mt-1 h-full w-px bg-border" />
                                )}
                            </div>
                            <div className="pb-4 min-w-0 flex-1">
                                <p className="text-sm text-foreground/80">
                                    {activity.text}
                                </p>
                                {activity.changes && (
                                    <p className="mt-0.5 text-xs text-muted-foreground/70">
                                        Změněno: {activity.changes}
                                    </p>
                                )}
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {activity.time}
                                </p>
                            </div>
                        </>
                    );

                    if (activity.link) {
                        return (
                            <Link
                                key={activity.id}
                                href={activity.link}
                                className="flex gap-3 rounded-lg -mx-2 px-2 py-0.5 transition-colors hover:bg-accent/50"
                            >
                                {content}
                            </Link>
                        );
                    }

                    return (
                        <div key={activity.id} className="flex gap-3">
                            {content}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
