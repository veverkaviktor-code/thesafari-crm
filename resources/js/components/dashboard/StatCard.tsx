import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    label: string;
    value: string;
    icon: LucideIcon;
    iconColor: string;
    iconBg: string;
    gradient?: string;
    trend?: {
        value: string;
        positive: boolean;
    };
    subtitle?: string;
}

export default function StatCard({
    label,
    value,
    icon: Icon,
    iconColor,
    iconBg,
    gradient = 'bg-card',
    trend,
    subtitle,
}: StatCardProps) {
    return (
        <div className={cn('rounded-xl border border-border p-5', gradient)}>
            <div className="flex items-start justify-between">
                <div
                    className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        iconBg,
                    )}
                >
                    <Icon className={cn('h-5 w-5', iconColor)} />
                </div>
                {trend && (
                    <span
                        className={cn(
                            'text-xs font-medium',
                            trend.positive ? 'text-lime-600' : 'text-destructive',
                        )}
                    >
                        {trend.positive ? '↑' : '↓'} {trend.value}
                    </span>
                )}
            </div>
            <div className="mt-4">
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                    {value}
                </p>
                {subtitle && (
                    <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
