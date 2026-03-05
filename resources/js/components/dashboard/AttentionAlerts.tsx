import { Link } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Calendar,
    CreditCard,
    FileText,
    Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Alert {
    type: 'danger' | 'warning' | 'info';
    icon: string;
    title: string;
    subtitle: string;
    link: string;
}

const iconMap: Record<string, { icon: typeof AlertTriangle; color: string }> = {
    order:        { icon: FileText,      color: 'text-amber-500' },
    invoice:      { icon: CreditCard,    color: 'text-red-500' },
    deadline:     { icon: Calendar,      color: 'text-orange-500' },
    subscription: { icon: Globe,         color: 'text-primary' },
    payment:      { icon: CreditCard,    color: 'text-rose-500' },
};

const typeBg: Record<string, string> = {
    danger: 'border-red-500/20 bg-red-500/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
    info: 'border-primary/20 bg-primary/5',
};

interface Props {
    alerts?: Alert[];
}

export default function AttentionAlerts({ alerts }: Props) {
    const items = alerts ?? [];

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-muted-foreground">
                    Věnujte pozornost
                </h3>
            </div>
            <div className="space-y-2">
                {items.length === 0 && (
                    <div className="py-6 text-center">
                        <p className="text-sm text-muted-foreground">Vše v pořádku, žádné urgentní upozornění</p>
                    </div>
                )}
                {items.map((alert, i) => {
                    const config = iconMap[alert.icon] ?? iconMap.order;
                    const Icon = config.icon;
                    return (
                        <Link
                            key={i}
                            href={alert.link}
                            className={cn(
                                'flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50',
                                typeBg[alert.type],
                            )}
                        >
                            <div className={cn(
                                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                alert.type === 'danger' ? 'bg-red-500/10' : 'bg-amber-500/10',
                            )}>
                                <Icon className={cn('h-4 w-4', config.color)} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-foreground/90">
                                    {alert.title}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                    {alert.subtitle}
                                </p>
                            </div>
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
