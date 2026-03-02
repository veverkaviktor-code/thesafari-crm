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
    customer: { icon: UserPlus, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    order: { icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    invoice: { icon: FileText, color: 'text-violet-400', bg: 'bg-violet-500/20' },
    payment: { icon: CreditCard, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    ticket: { icon: MessageSquare, color: 'text-rose-400', bg: 'bg-rose-500/20' },
};

// Placeholder data
const placeholderActivities: Activity[] = [
    { id: 1, icon: 'customer', text: 'Nový zákazník: Studio Grafika s.r.o.', time: 'Před 2 hodinami' },
    { id: 2, icon: 'payment', text: 'Faktura #2024-0042 zaplacena (12 500 Kč)', time: 'Před 3 hodinami' },
    { id: 3, icon: 'order', text: 'Zakázka "Polep dodávky" dokončena', time: 'Před 5 hodinami' },
    { id: 4, icon: 'ticket', text: 'Nový požadavek: Aktualizace webu neniweb.cz', time: 'Včera' },
    { id: 5, icon: 'invoice', text: 'Vystavena faktura #2024-0043 (28 000 Kč)', time: 'Včera' },
    { id: 6, icon: 'customer', text: 'Nový zákazník: Jan Procházka', time: 'Před 2 dny' },
];

interface Props {
    activities?: Activity[];
}

export default function ActivityTimeline({ activities }: Props) {
    const items = activities ?? placeholderActivities;

    return (
        <div className="rounded-xl border border-white/5 bg-[#1a1a22] p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-300">
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
                                    <div className="mt-1 h-full w-px bg-white/5" />
                                )}
                            </div>
                            <div className="pb-4">
                                <p className="text-sm text-gray-300">
                                    {activity.text}
                                </p>
                                <p className="mt-0.5 text-xs text-gray-500">
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
