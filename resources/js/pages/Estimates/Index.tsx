import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Archive, Calculator, ChevronLeft, ChevronRight, FileText, Plus, RotateCcw, Trash2 } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import GlassModal from '@/components/ui/GlassModal';
import StatusBadge from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';

interface Estimate {
    id: number;
    name: string;
    customer_id: number | null;
    customer: { id: number; name: string; company: string | null } | null;
    deadline: string | null;
    total_price: number;
    status: 'draft' | 'sent' | 'accepted' | 'rejected';
    items_count: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

interface Props {
    estimates: {
        data: Estimate[];
        current_page: number;
        last_page: number;
        total: number;
    };
    filters: { search?: string; status?: string; trash?: string };
    trashedCount: number;
}

const statusMap = {
    draft:    { label: 'Koncept',   variant: 'pending'   as const },
    sent:     { label: 'Odesláno',  variant: 'active'    as const },
    accepted: { label: 'Schváleno', variant: 'completed' as const },
    rejected: { label: 'Zamítnuto', variant: 'cancelled' as const },
};

export default function Index({ estimates, filters, trashedCount }: Props) {
    const isTrash = filters.trash === '1';
    const [showCreate, setShowCreate] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Estimate | null>(null);
    const [deleting, setDeleting] = useState(false);

    const form = useForm<{ name: string }>({ name: '' });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/kalkulator', {
            onSuccess: () => {
                setShowCreate(false);
                form.reset();
            },
        });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        setDeleting(true);
        if (isTrash) {
            router.delete(`/kalkulator/${deleteTarget.id}/force-delete`, {
                onSuccess: () => { setDeleteTarget(null); setDeleting(false); },
                onError: () => setDeleting(false),
            });
        } else {
            router.delete(`/kalkulator/${deleteTarget.id}`, {
                onSuccess: () => { setDeleteTarget(null); setDeleting(false); },
                onError: () => setDeleting(false),
            });
        }
    };

    const handleRestore = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        router.post(`/kalkulator/${id}/restore`, {}, { preserveScroll: true });
    };

    const goToPage = (page: number) => {
        router.get('/kalkulator', { page, ...(isTrash ? { trash: '1' } : {}) }, { preserveState: true, replace: true });
    };

    return (
        <AuthenticatedLayout breadcrumbs={[{ label: 'Kalkulátor' }]}>
            <div className="space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                    <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        Kalkulátor
                    </h1>
                    {!isTrash && (
                        <Button
                            className="bg-amber-600 text-white hover:bg-amber-500"
                            onClick={() => setShowCreate(true)}
                        >
                            <Plus className="h-4 w-4" />
                            <span className="hidden sm:inline">Nová kalkulace</span>
                        </Button>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-between border-b border-border">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => router.get('/kalkulator', {}, { preserveState: true, replace: true })}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                !isTrash
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Všechny
                        </button>
                        <button
                            onClick={() => router.get('/kalkulator', { trash: '1' }, { preserveState: true, replace: true })}
                            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px flex items-center gap-2 ${
                                isTrash
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            }`}
                        >
                            Smazané
                            {trashedCount > 0 && (
                                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/10 px-1.5 text-xs font-medium text-red-400">
                                    {trashedCount}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Empty state */}
                {estimates.data.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
                        {isTrash ? (
                            <>
                                <Archive className="h-14 w-14 text-muted-foreground/30" strokeWidth={1.25} />
                                <p className="text-base font-medium text-muted-foreground">Koš je prázdný</p>
                            </>
                        ) : (
                            <>
                                <Calculator className="h-14 w-14 text-muted-foreground/30" strokeWidth={1.25} />
                                <div>
                                    <p className="text-base font-medium text-muted-foreground">Zatím žádná kalkulace</p>
                                    <p className="mt-1 text-sm text-muted-foreground/60">
                                        Vytvořte první kalkulaci tlačítkem výše.
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Cards grid */}
                {estimates.data.length > 0 && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {estimates.data.map((estimate) => {
                            const st = statusMap[estimate.status] ?? statusMap.draft;
                            return (
                                <div
                                    key={estimate.id}
                                    onClick={() => !isTrash && router.visit(`/kalkulator/${estimate.id}`)}
                                    className={`group relative rounded-xl border border-border bg-card p-4 transition-colors ${
                                        isTrash
                                            ? 'opacity-70'
                                            : 'cursor-pointer hover:border-amber-600/40 hover:bg-card/80'
                                    }`}
                                >
                                    {/* Top row: name + actions */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <FileText className="h-4 w-4 shrink-0 text-muted-foreground/50" />
                                            <span className="truncate font-medium text-foreground">
                                                {estimate.name}
                                            </span>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1">
                                            {isTrash && (
                                                <button
                                                    onClick={(e) => handleRestore(e, estimate.id)}
                                                    className="rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-emerald-500/10 hover:text-emerald-400"
                                                    title="Obnovit"
                                                >
                                                    <RotateCcw className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(estimate); }}
                                                className={`shrink-0 rounded-lg p-1.5 text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-400 ${
                                                    isTrash ? '' : 'sm:opacity-0 sm:group-hover:opacity-100'
                                                }`}
                                                title={isTrash ? 'Trvale smazat' : 'Do koše'}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Customer */}
                                    <p className="mt-1.5 truncate pl-6 text-sm text-muted-foreground">
                                        {estimate.customer
                                            ? (estimate.customer.company ?? estimate.customer.name)
                                            : <span className="italic opacity-50">Bez zákazníka</span>
                                        }
                                    </p>

                                    {/* Bottom row: meta */}
                                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-6">
                                        <StatusBadge status={st.variant} label={st.label} />

                                        <span className="text-xs text-muted-foreground/70">
                                            {estimate.items_count} {estimate.items_count === 1 ? 'položka' : estimate.items_count < 5 ? 'položky' : 'položek'}
                                        </span>

                                        <span className="text-xs font-medium text-foreground/80">
                                            {formatCurrency(estimate.total_price)}
                                        </span>

                                        <span className="ml-auto text-xs text-muted-foreground/50">
                                            {new Date(estimate.created_at).toLocaleDateString('cs-CZ')}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {estimates.last_page > 1 && (
                    <div className="flex items-center justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={estimates.current_page <= 1}
                            onClick={() => goToPage(estimates.current_page - 1)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Předchozí
                        </Button>
                        <span className="text-sm text-muted-foreground">
                            {estimates.current_page} / {estimates.last_page}
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={estimates.current_page >= estimates.last_page}
                            onClick={() => goToPage(estimates.current_page + 1)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            Další
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>

            {/* Create modal */}
            <GlassModal
                open={showCreate}
                onClose={() => { setShowCreate(false); form.reset(); }}
                title="Nová kalkulace"
                maxWidth="max-w-md"
            >
                <form onSubmit={handleCreate} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-foreground" htmlFor="estimate-name">
                            Název
                        </label>
                        <input
                            id="estimate-name"
                            type="text"
                            autoFocus
                            placeholder="např. Polep dodávky — Novák s.r.o."
                            value={form.data.name}
                            onChange={(e) => form.setData('name', e.target.value)}
                            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-600/40"
                        />
                        {form.errors.name && (
                            <p className="text-xs text-red-400">{form.errors.name}</p>
                        )}
                    </div>

                    <div className="flex justify-end gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => { setShowCreate(false); form.reset(); }}
                        >
                            Zrušit
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing || !form.data.name.trim()}
                            className="bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50"
                        >
                            {form.processing ? 'Vytvářím...' : 'Vytvořit'}
                        </Button>
                    </div>
                </form>
            </GlassModal>

            {/* Delete confirmation modal */}
            <GlassModal
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                title={isTrash ? 'Trvale smazat kalkulaci' : 'Přesunout do koše'}
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        {isTrash ? (
                            <>
                                Opravdu chcete <span className="font-semibold text-red-400">trvale smazat</span> kalkulaci{' '}
                                <span className="font-semibold text-foreground">{deleteTarget?.name}</span>?
                                Tuto akci nelze vrátit.
                            </>
                        ) : (
                            <>
                                Kalkulace{' '}
                                <span className="font-semibold text-foreground">{deleteTarget?.name}</span>{' '}
                                bude přesunuta do koše. Po 30 dnech se smaže trvale.
                            </>
                        )}
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setDeleteTarget(null)}
                        >
                            Zrušit
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={deleting}
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <Trash2 className="h-4 w-4" />
                            {deleting ? 'Mažu...' : isTrash ? 'Trvale smazat' : 'Do koše'}
                        </Button>
                    </div>
                </div>
            </GlassModal>
        </AuthenticatedLayout>
    );
}
