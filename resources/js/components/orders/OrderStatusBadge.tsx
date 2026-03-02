import { cn } from '@/lib/utils';

export type OrderStatus = 'nova' | 'v_reseni' | 'hotovo' | 'fakturovano';

const statusConfig: Record<OrderStatus, { label: string; className: string }> = {
    nova: { label: 'Nová', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    v_reseni: { label: 'V řešení', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    hotovo: { label: 'Hotovo', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    fakturovano: { label: 'Fakturováno', className: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
};

interface Props {
    status: OrderStatus;
    className?: string;
}

export default function OrderStatusBadge({ status, className }: Props) {
    const config = statusConfig[status] ?? statusConfig.nova;
    return (
        <span
            className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                config.className,
                className,
            )}
        >
            {config.label}
        </span>
    );
}
