import { useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Plus, Pencil, Trash2, Package, Check, X } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface ManagementPlan {
    id: number;
    name: string;
    price_monthly: number;
    is_active: boolean;
    sort_order: number;
}

interface Props {
    plans: ManagementPlan[];
}

function PlanForm({ plan, onCancel }: { plan?: ManagementPlan; onCancel: () => void }) {
    const form = useForm({
        name: plan?.name || '',
        price_monthly: plan?.price_monthly?.toString() || '0',
        is_active: plan?.is_active ?? true,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const data = {
            ...form.data,
            price_monthly: parseInt(form.data.price_monthly) || 0,
        };
        if (plan) {
            router.put(`/nastaveni/balicky/${plan.id}`, data, { preserveScroll: true, onSuccess: onCancel });
        } else {
            router.post('/nastaveni/balicky', data, { preserveScroll: true, onSuccess: onCancel });
        }
    }

    return (
        <form onSubmit={handleSubmit} className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                    <Label className="text-muted-foreground">Název *</Label>
                    <Input
                        value={form.data.name}
                        onChange={e => form.setData('name', e.target.value)}
                        placeholder="např. Klidný spánek"
                        className="mt-1 bg-muted border-border text-foreground"
                        autoFocus
                    />
                </div>
                <div className="sm:col-span-1">
                    <Label className="text-muted-foreground">Cena / měsíc (Kč) *</Label>
                    <Input
                        type="number"
                        min="0"
                        step="1"
                        value={form.data.price_monthly}
                        onChange={e => form.setData('price_monthly', e.target.value)}
                        className="mt-1 bg-muted border-border text-foreground"
                    />
                </div>
                <div className="sm:col-span-1 flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer pb-2">
                        <input
                            type="checkbox"
                            checked={form.data.is_active}
                            onChange={e => form.setData('is_active', e.target.checked)}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">Aktivní</span>
                    </label>
                </div>
            </div>
            <div className="flex justify-end gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Zrušit</Button>
                <Button type="submit" size="sm" disabled={form.processing || !form.data.name} className="bg-primary text-white hover:bg-primary/80">
                    {plan ? 'Uložit' : 'Přidat'}
                </Button>
            </div>
        </form>
    );
}

export default function ManagementPlans({ plans }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [deleteId, setDeleteId] = useState<number | null>(null);

    function confirmDelete() {
        if (deleteId === null) return;
        router.delete(`/nastaveni/balicky/${deleteId}`, { preserveScroll: true });
        setDeleteId(null);
    }

    return (
        <div className="rounded-xl border border-border bg-card p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Balíčky správy</h2>
                    <p className="text-sm text-muted-foreground">Tarify správy webů pro zákazníky.</p>
                </div>
                {!showForm && (
                    <Button size="sm" onClick={() => setShowForm(true)} className="bg-primary text-white hover:bg-primary/80">
                        <Plus className="h-4 w-4 mr-1" />
                        Nový balíček
                    </Button>
                )}
            </div>

            {showForm && (
                <div className="mb-4">
                    <PlanForm onCancel={() => setShowForm(false)} />
                </div>
            )}

            {plans.length === 0 && !showForm ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Package className="mb-3 h-10 w-10" />
                    <p className="text-sm">Žádné balíčky správy</p>
                    <p className="mt-1 text-xs">Klikněte na "Nový balíček" pro přidání.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-muted-foreground">
                                <th className="pb-2 pr-4 font-medium">Název</th>
                                <th className="pb-2 pr-4 font-medium text-right">Cena / měsíc</th>
                                <th className="pb-2 pr-4 font-medium text-center">Stav</th>
                                <th className="pb-2 font-medium text-right">Akce</th>
                            </tr>
                        </thead>
                        <tbody>
                            {plans.map(plan => (
                                editingId === plan.id ? (
                                    <tr key={plan.id}>
                                        <td colSpan={4} className="py-2">
                                            <PlanForm plan={plan} onCancel={() => setEditingId(null)} />
                                        </td>
                                    </tr>
                                ) : (
                                    <tr key={plan.id} className="border-b border-border/50 last:border-0">
                                        <td className="py-3 pr-4">
                                            <span className="font-medium text-foreground">{plan.name}</span>
                                        </td>
                                        <td className="py-3 pr-4 text-right tabular-nums text-foreground">
                                            {formatCurrency(plan.price_monthly)}
                                        </td>
                                        <td className="py-3 pr-4 text-center">
                                            {plan.is_active ? (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">
                                                    <Check className="h-3 w-3" /> Aktivní
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                                    <X className="h-3 w-3" /> Neaktivní
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => setEditingId(plan.id)}
                                                    className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                                                    title="Upravit"
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => setDeleteId(plan.id)}
                                                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                                    title="Smazat"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <ConfirmDialog
                open={deleteId !== null}
                onClose={() => setDeleteId(null)}
                onConfirm={confirmDelete}
                title="Smazat balíček"
                message="Opravdu chcete smazat tento balíček? Weby s tímto balíčkem budou mít správu odpojenou."
            />
        </div>
    );
}
