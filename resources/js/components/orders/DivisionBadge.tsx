import { cn } from '@/lib/utils';

export type Division = 'digital' | 'design' | 'lab' | 'ostatni';

const divisionConfig: Record<Division, { label: string; className: string }> = {
    digital: { label: 'Digital', className: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
    design: { label: 'Design', className: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
    lab: { label: 'Lab', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    ostatni: { label: 'Ostatní', className: 'bg-stone-500/20 text-stone-400 border-stone-500/30' },
};

export const allDivisions = Object.entries(divisionConfig).map(([value, { label }]) => ({ value, label }));

interface Props {
    division: Division;
    className?: string;
}

export default function DivisionBadge({ division, className }: Props) {
    const config = divisionConfig[division] ?? divisionConfig.ostatni;
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
