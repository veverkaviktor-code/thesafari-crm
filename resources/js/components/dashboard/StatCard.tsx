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
    gradient = 'bg-gradient-to-br from-[#16140f] to-[#1a1508]',
    trend,
    subtitle,
}: StatCardProps) {
    return (
        <div className={cn('rounded-xl border border-[#F5F0E8]/[0.06] p-5', gradient)}>
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
                            trend.positive ? 'text-[#65A30D]' : 'text-[#DC2626]',
                        )}
                    >
                        {trend.positive ? '↑' : '↓'} {trend.value}
                    </span>
                )}
            </div>
            <div className="mt-4">
                <p className="text-sm text-[#9C9585]">{label}</p>
                <p className="mt-1 text-3xl font-bold tracking-tight text-[#F5F0E8]">
                    {value}
                </p>
                {subtitle && (
                    <p className="mt-1 text-xs text-[#6B6560]">{subtitle}</p>
                )}
            </div>
        </div>
    );
}
