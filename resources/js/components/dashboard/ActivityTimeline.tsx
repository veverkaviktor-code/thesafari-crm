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
    order: { icon: FileText, color: 'text-[#D97706]', bg: 'bg-[#D97706]/10' },
    invoice: { icon: FileText, color: 'text-[#D4A574]', bg: 'bg-[#D4A574]/10' },
    payment: { icon: CreditCard, color: 'text-[#65A30D]', bg: 'bg-[#65A30D]/10' },
    ticket: { icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-500/10' },
};

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
        <div className="rounded-xl border border-[#F5F0E8]/[0.06] bg-gradient-to-br from-[#16140f] to-[#141414] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[#9C9585]">
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
                                    <div className="mt-1 h-full w-px bg-[#F5F0E8]/[0.05]" />
                                )}
                            </div>
                            <div className="pb-4">
                                <p className="text-sm text-[#F5F0E8]/80">
                                    {activity.text}
                                </p>
                                <p className="mt-0.5 text-xs text-[#6B6560]">
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
