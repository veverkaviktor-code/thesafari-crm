import { router } from '@inertiajs/react';
import { type Column } from '@/components/ui/DataTable';
import { cn } from '@/lib/utils';

const TAG_COLORS = [
    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'bg-violet-500/20 text-violet-400 border-violet-500/30',
    'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
];

export interface CustomerRow {
    id: number;
    name: string;
    company: string | null;
    type: 'fyzicka' | 'pravnicka';
    email: string | null;
    phone: string | null;
    tags: string[];
    created_at: string;
}

function getInitials(name: string): string {
    return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export const customerColumns: Column<CustomerRow>[] = [
    {
        key: 'name',
        label: 'Zákazník',
        sortable: true,
        render: (c) => (
            <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D97706]/20 text-xs font-semibold text-[#D97706]">
                    {getInitials(c.name)}
                </div>
                <div>
                    <p className="font-medium text-white">{c.name}</p>
                    {c.company && (
                        <p className="text-xs text-[#6B6560]">{c.company}</p>
                    )}
                </div>
            </div>
        ),
    },
    {
        key: 'email',
        label: 'E-mail',
        sortable: true,
        render: (c) => (
            <span className="text-[#9C9585]">{c.email ?? '—'}</span>
        ),
    },
    {
        key: 'phone',
        label: 'Telefon',
        render: (c) => (
            <span className="text-[#9C9585]">{c.phone ?? '—'}</span>
        ),
    },
    {
        key: 'tags',
        label: 'Štítky',
        render: (c) => (
            <div className="flex flex-wrap gap-1">
                {c.tags.map((tag, i) => (
                    <span
                        key={tag}
                        className={cn(
                            'inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium',
                            TAG_COLORS[i % TAG_COLORS.length],
                        )}
                    >
                        {tag}
                    </span>
                ))}
            </div>
        ),
    },
    {
        key: 'created_at',
        label: 'Vytvořeno',
        sortable: true,
        render: (c) => (
            <span className="text-[#6B6560]">
                {new Date(c.created_at).toLocaleDateString('cs-CZ')}
            </span>
        ),
    },
];

export function handleCustomerRowClick(customer: CustomerRow) {
    router.visit(`/zakaznici/${customer.id}`);
}
