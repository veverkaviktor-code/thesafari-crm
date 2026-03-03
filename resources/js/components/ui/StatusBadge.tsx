import { cn } from '@/lib/utils';

type Status = 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled';

const statusConfig: Record<Status, { label: string; className: string }> = {
    active: {
        label: 'Aktivní',
        className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    inactive: {
        label: 'Neaktivní',
        className: 'bg-gray-500/20 text-muted-foreground border-gray-500/30',
    },
    pending: {
        label: 'Čekající',
        className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    completed: {
        label: 'Dokončeno',
        className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    },
    cancelled: {
        label: 'Zrušeno',
        className: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
};

interface StatusBadgeProps {
    status: Status;
    label?: string;
    className?: string;
}

export default function StatusBadge({
    status,
    label,
    className,
}: StatusBadgeProps) {
    const config = statusConfig[status] ?? statusConfig.inactive;
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                config.className,
                className,
            )}
        >
            {label ?? config.label}
        </span>
    );
}

export type { Status };

export { StatusBadge };
