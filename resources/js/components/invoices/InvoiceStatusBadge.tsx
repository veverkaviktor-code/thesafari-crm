import { cn } from '@/lib/utils';

export type InvoiceStatus = 'vystavena' | 'odeslana' | 'zaplacena' | 'po_splatnosti';

const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
    vystavena: { label: 'Vystavena', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    odeslana: { label: 'Odeslaná', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    zaplacena: { label: 'Zaplacena', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    po_splatnosti: { label: 'Po splatnosti', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
};

interface Props {
    status: InvoiceStatus;
    className?: string;
}

export default function InvoiceStatusBadge({ status, className }: Props) {
    const config = statusConfig[status] ?? statusConfig.vystavena;
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
