import { cn } from '@/lib/utils';

export type Division = 'tisk' | 'reklama' | 'polepy' | 'montaze' | 'weby';

const divisionConfig: Record<Division, { label: string; className: string }> = {
    tisk: { label: 'Tisk', className: 'bg-gray-500/20 text-muted-foreground border-gray-500/30' },
    reklama: { label: 'Reklama', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    polepy: { label: 'Polepy', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    montaze: { label: 'Montáže', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    weby: { label: 'Weby', className: 'bg-violet-500/20 text-violet-400 border-violet-500/30' },
};

interface Props {
    division: Division;
    className?: string;
}

export default function DivisionBadge({ division, className }: Props) {
    const config = divisionConfig[division] ?? divisionConfig.tisk;
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
