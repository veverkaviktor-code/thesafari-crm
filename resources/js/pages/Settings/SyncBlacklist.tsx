import { useState } from 'react';
import { router } from '@inertiajs/react';
import { ShieldOff, Trash2 } from 'lucide-react';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface SyncBlacklistEntry {
    id: number;
    domain_name: string;
    reason: string;
    created_at: string | null;
}

interface Props {
    blacklist: SyncBlacklistEntry[];
}

const reasonLabels: Record<string, { label: string; className: string }> = {
    lukas: { label: 'Lukáš', className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
    deleted: { label: 'Smazáno', className: 'bg-red-500/10 text-red-400 border-red-500/20' },
    manual: { label: 'Ručně', className: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
};

export default function SyncBlacklistTab({ blacklist }: Props) {
    const [deleteId, setDeleteId] = useState<number | null>(null);

    function confirmDelete() {
        if (deleteId === null) return;
        router.delete(`/nastaveni/blacklist/${deleteId}`, { preserveScroll: true });
        setDeleteId(null);
    }

    function formatDate(dateStr: string | null): string {
        if (!dateStr) return '—';
        try {
            return new Date(dateStr).toLocaleDateString('cs-CZ');
        } catch {
            return '—';
        }
    }

    return (
        <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-4">
                <h2 className="text-lg font-semibold text-foreground">Výjimky syncu</h2>
                <p className="text-sm text-muted-foreground">
                    Domény ignorované při synchronizaci z API. Odebráním se doména znovu objeví při dalším syncu.
                </p>
            </div>

            {blacklist.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ShieldOff className="mb-3 h-10 w-10" />
                    <p className="text-sm">Žádné výjimky</p>
                    <p className="mt-1 text-xs">Všechny domény se synchronizují.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-muted-foreground">
                                <th className="pb-2 pr-4 font-medium">Doména</th>
                                <th className="pb-2 pr-4 font-medium">Důvod</th>
                                <th className="pb-2 pr-4 font-medium">Přidáno</th>
                                <th className="pb-2 font-medium text-right">Akce</th>
                            </tr>
                        </thead>
                        <tbody>
                            {blacklist.map(entry => {
                                const reason = reasonLabels[entry.reason] ?? { label: entry.reason, className: 'bg-muted text-muted-foreground' };
                                return (
                                    <tr key={entry.id} className="border-b border-border/50 last:border-0">
                                        <td className="py-3 pr-4">
                                            <span className="font-medium text-foreground">{entry.domain_name}</span>
                                        </td>
                                        <td className="py-3 pr-4">
                                            <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${reason.className}`}>
                                                {reason.label}
                                            </span>
                                        </td>
                                        <td className="py-3 pr-4 text-muted-foreground">
                                            {formatDate(entry.created_at)}
                                        </td>
                                        <td className="py-3 text-right">
                                            <button
                                                onClick={() => setDeleteId(entry.id)}
                                                className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                title="Odebrat z výjimek"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <p className="mt-3 text-xs text-muted-foreground">
                        Celkem {blacklist.length} {blacklist.length === 1 ? 'doména' : blacklist.length < 5 ? 'domény' : 'domén'} ve výjimkách.
                    </p>
                </div>
            )}

            <ConfirmDialog
                open={deleteId !== null}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Odebrat z výjimek"
                message="Doména se znovu objeví jako 'Ke schválení' při dalším syncu z API."
            />
        </div>
    );
}
