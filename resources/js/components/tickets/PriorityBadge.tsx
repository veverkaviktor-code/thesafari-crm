interface PriorityBadgeProps {
    priority: string;
}

const priorityConfig: Record<string, { label: string; className: string }> = {
    low: { label: 'Nízká', className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' },
    medium: { label: 'Střední', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    high: { label: 'Vysoká', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
};

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
    const config = priorityConfig[priority] ?? { label: priority, className: 'bg-gray-500/10 text-gray-400 border-gray-500/20' };

    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}>
            {config.label}
        </span>
    );
}
