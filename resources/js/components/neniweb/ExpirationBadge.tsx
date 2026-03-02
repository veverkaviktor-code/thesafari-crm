import { differenceInDays, parseISO } from 'date-fns';

interface ExpirationBadgeProps {
    expiresAt: string;
}

export default function ExpirationBadge({ expiresAt }: ExpirationBadgeProps) {
    const days = differenceInDays(parseISO(expiresAt), new Date());

    let label: string;
    let className: string;

    if (days < 0) {
        label = 'Expirováno';
        className = 'bg-red-500/10 text-red-400 border-red-500/20';
    } else if (days <= 7) {
        label = `${days} dní`;
        className = 'bg-red-500/10 text-red-400 border-red-500/20';
    } else if (days <= 14) {
        label = `${days} dní`;
        className = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    } else if (days <= 30) {
        label = `${days} dní`;
        className = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    } else {
        label = `${days} dní`;
        className = 'bg-green-500/10 text-green-400 border-green-500/20';
    }

    return (
        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
            {label}
        </span>
    );
}
