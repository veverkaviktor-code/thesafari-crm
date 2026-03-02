import { type FormEvent, useState } from 'react';
import { router } from '@inertiajs/react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface OrderCost {
    id: number;
    title: string;
    amount: number;
}

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
    }).format(v);

interface Props {
    orderId: number;
    costs: OrderCost[];
    totalCosts: number;
}

export default function CostsList({ orderId, costs, totalCosts }: Props) {
    const [title, setTitle] = useState('');
    const [amount, setAmount] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleAdd = (e: FormEvent) => {
        e.preventDefault();
        if (!title.trim() || !amount) return;
        setSubmitting(true);
        router.post(
            `/zakazky/${orderId}/naklady`,
            { title: title.trim(), amount: Number(amount) },
            {
                preserveScroll: true,
                onFinish: () => {
                    setTitle('');
                    setAmount('');
                    setSubmitting(false);
                },
            },
        );
    };

    const handleDelete = (costId: number) => {
        router.delete(`/zakazky/${orderId}/naklady/${costId}`, {
            preserveScroll: true,
        });
    };

    return (
        <div className="rounded-xl border border-white/5 bg-[#1a1a22] p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-300">Náklady</h3>

            {/* Add form */}
            <form onSubmit={handleAdd} className="mb-4 flex gap-2">
                <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Název nákladu..."
                    className="border-white/10 bg-white/5"
                />
                <Input
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Částka"
                    type="number"
                    min="0"
                    step="1"
                    className="w-32 shrink-0 border-white/10 bg-white/5"
                />
                <Button
                    type="submit"
                    size="icon"
                    disabled={submitting || !title.trim() || !amount}
                    className="shrink-0 bg-[#D97706] text-white hover:bg-[#B45309]"
                >
                    <Plus className="h-4 w-4" />
                </Button>
            </form>

            {/* List */}
            {costs.length === 0 ? (
                <p className="text-sm text-gray-500">Žádné náklady</p>
            ) : (
                <div className="space-y-2">
                    {costs.map((cost) => (
                        <div
                            key={cost.id}
                            className="flex items-center justify-between rounded-lg bg-white/[0.03] p-3"
                        >
                            <div>
                                <p className="text-sm text-gray-300">
                                    {cost.title}
                                </p>
                                <p className="text-xs text-gray-500">
                                    {formatCurrency(cost.amount)}
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                className="text-gray-500 hover:text-red-400"
                                onClick={() => handleDelete(cost.id)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Total */}
            <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
                <span className="text-sm text-gray-400">Celkem náklady</span>
                <span className="text-sm font-semibold text-white">
                    {formatCurrency(totalCosts)}
                </span>
            </div>
        </div>
    );
}
