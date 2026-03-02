import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
    label: string;
    value: string;
    icon: LucideIcon;
    iconColor: string;
    iconBg: string;
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
    trend,
    subtitle,
}: StatCardProps) {
    return (
        <div className="rounded-xl border border-white/5 bg-[#1a1a22] p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm text-gray-400">{label}</p>
                    <p className="mt-2 text-3xl font-bold text-white">{value}</p>
                    {trend && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs">
                            <span
                                className={
                                    trend.positive
                                        ? 'text-emerald-400'
                                        : 'text-red-400'
                                }
                            >
                                {trend.positive ? '↑' : '↓'} {trend.value}
                            </span>
                            {subtitle && (
                                <span className="text-gray-500">
                                    {subtitle}
                                </span>
                            )}
                        </p>
                    )}
                </div>
                <div
                    className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        iconBg,
                    )}
                >
                    <Icon className={cn('h-5 w-5', iconColor)} />
                </div>
            </div>
        </div>
    );
}
