import {
    CheckCircle2,
    CreditCard,
    FileText,
    MessageSquare,
    UserPlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Activity {
    id: number;
    icon: 'customer' | 'order' | 'invoice' | 'payment' | 'ticket';
    text: string;
    time: string;
}

const iconMap = {
    customer: { icon: UserPlus, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    order: { icon: FileText, color: 'text-primary', bg: 'bg-primary/10' },
    invoice: { icon: FileText, color: 'text-[#D4A574]', bg: 'bg-[#D4A574]/10' },
    payment: { icon: CreditCard, color: 'text-lime-600', bg: 'bg-lime-600/10' },
    ticket: { icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-500/10' },
};

const placeholderActivities: Activity[] = [
    { id: 1, icon: 'customer', text: 'Nový zákazník: Studio Grafika s.r.o.', time: 'Před 2 hodinami' },
    { id: 2, icon: 'payment', text: 'Faktura #2024-0042 zaplacena (12 500 Kč)', time: 'Před 3 hodinami' },
    { id: 3, icon: 'order', text: 'Zakázka "Polep dodávky" dokončena', time: 'Před 5 hodinami' },
    { id: 4, icon: 'ticket', text: 'Nový požadavek: Aktualizace webu neniweb.cz', time: 'Před 5 hodinami' },
    { id: 5, icon: 'invoice', text: 'Vystavena faktura #2024-0043 (28 000 Kč)', time: 'Včera' },
    { id: 6, icon: 'customer', text: 'Nový zákazník: Jan Procházka', time: 'Před 2 dny' },
];

interface Props {
    activities?: Activity[];
}

export default function ActivityTimeline({ activities }: Props) {
    const items = activities ?? placeholderActivities;

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                Poslední aktivita
            </h3>
            <div className="space-y-4">
                {items.map((activity, index) => {
                    const config = iconMap[activity.icon];
                    const Icon = config.icon;
                    return (
                        <div key={activity.id} className="flex gap-3">
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
                            <div className="pb-4">
                                <p className="text-sm text-foreground/80">
                                    {activity.text}
                                </p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                    {activity.time}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
