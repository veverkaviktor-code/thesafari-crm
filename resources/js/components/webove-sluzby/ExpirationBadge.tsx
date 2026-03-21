import { differenceInDays, parseISO, format } from 'date-fns';
import { cs } from 'date-fns/locale';

interface ExpirationBadgeProps {
    expiresAt: string | null;
}

export default function ExpirationBadge({ expiresAt }: ExpirationBadgeProps) {
    if (!expiresAt) {
        return (
            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium bg-muted text-muted-foreground border-border">
                —
            </span>
        );
    }

    const days = differenceInDays(parseISO(expiresAt), new Date());
    const dateLabel = format(parseISO(expiresAt), 'd. M. yyyy', { locale: cs });

    let daysLabel: string;
    let className: string;

    if (days < 0) {
        daysLabel = `${Math.abs(days)} dní po exp.`;
        className = 'bg-red-500/20 text-red-400 border-red-500/30';
    } else if (days <= 7) {
        daysLabel = `${days} dní`;
        className = 'bg-red-500/10 text-red-400 border-red-500/20';
    } else if (days <= 14) {
        daysLabel = `${days} dní`;
        className = 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    } else if (days <= 30) {
        daysLabel = `${days} dní`;
        className = 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    } else {
        daysLabel = `${days} dní`;
        className = 'bg-green-500/10 text-green-400 border-green-500/20';
    }

    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${className}`}>
            {dateLabel}
            <span className="opacity-60">({daysLabel})</span>
        </span>
    );
}
