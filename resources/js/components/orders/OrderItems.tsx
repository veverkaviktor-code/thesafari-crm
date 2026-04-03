import { type FormEvent, useState } from 'react';
import { router } from '@inertiajs/react';
import { Check, Package, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { formatCurrency } from '@/lib/utils';

interface OrderItem {
    id: number;
    name: string;
    description: string | null;
    quantity: number;
    unit: string;
    unit_price: number;
    total: number;
}

const UNITS = [
    { value: 'ks', label: 'ks' },
    { value: 'm2', label: 'm\u00B2' },
    { value: 'm', label: 'm' },
    { value: 'hod', label: 'hod' },
    { value: 'sada', label: 'sada' },
];

interface Props {
    orderId: number;
    items: OrderItem[];
}

export default function OrderItems({ orderId, items }: Props) {
    const [showForm, setShowForm] = useState(false);
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [unit, setUnit] = useState('ks');
    const [unitPrice, setUnitPrice] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        name: '',
        quantity: '',
        unit: '',
        unit_price: '',
    });

    const itemsTotal = items.reduce((sum, item) => sum + (item.total ?? 0), 0);

    const handleAdd = (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !unitPrice) return;
        setSubmitting(true);
        router.post(
            `/zakazky/${orderId}/polozky`,
            {
                name: name.trim(),
                quantity: Number(quantity) || 1,
                unit,
                unit_price: Number(unitPrice),
            },
            {
                preserveScroll: true,
                onSuccess: () => {
                    setName('');
                    setQuantity('1');
                    setUnit('ks');
                    setUnitPrice('');
                    setShowForm(false);
                },
                onFinish: () => setSubmitting(false),
            },
        );
    };

    const handleDelete = (itemId: number) => {
        router.delete(`/zakazky/${orderId}/polozky/${itemId}`, {
            preserveScroll: true,
        });
    };

    const handleEditStart = (item: OrderItem) => {
        setEditingId(item.id);
        setEditForm({
            name: item.name,
            quantity: String(item.quantity),
            unit: item.unit,
            unit_price: String(item.unit_price),
        });
    };

    const handleEditCancel = () => {
        setEditingId(null);
    };

    const handleUpdate = (itemId: number) => {
        if (!editForm.name.trim() || !editForm.unit_price) return;
        router.put(
            `/zakazky/${orderId}/polozky/${itemId}`,
            {
                name: editForm.name.trim(),
                quantity: Number(editForm.quantity) || 1,
                unit: editForm.unit,
                unit_price: Number(editForm.unit_price),
            },
            {
                preserveScroll: true,
                onSuccess: () => setEditingId(null),
            },
        );
    };

    return (
        <div className="rounded-xl border border-primary/20 bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground/70">
                    <Package className="h-4 w-4 text-primary/60" />
                    Položky zakázky
                </h3>
                {!showForm && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowForm(true)}
                        className="text-muted-foreground hover:text-primary"
                    >
                        <Plus className="h-4 w-4" />
                        <span className="ml-1">Přidat</span>
                    </Button>
                )}
            </div>

            {/* Add form */}
            {showForm && (
                <form onSubmit={handleAdd} className="mb-4 space-y-2 rounded-lg border border-primary/30 bg-accent p-3">
                    <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Název položky (např. Samolepky)"
                        className="border-border bg-card text-sm"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <Input
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            type="number"
                            min="0.01"
                            step="0.01"
                            placeholder="Množství"
                            className="w-24 shrink-0 border-border bg-card text-sm"
                        />
                        <Select value={unit} onValueChange={setUnit}>
                            <SelectTrigger className="w-20 shrink-0 border-border bg-card text-sm">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-card">
                                {UNITS.map((u) => (
                                    <SelectItem key={u.value} value={u.value} className="focus:bg-accent">
                                        {u.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="relative flex-1">
                            <Input
                                value={unitPrice}
                                onChange={(e) => setUnitPrice(e.target.value)}
                                type="number"
                                step="1"
                                placeholder="Cena/ks"
                                className="border-border bg-card pr-10 text-sm"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                Kč
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                            Celkem:{' '}
                            <span className="font-medium text-primary">
                                {formatCurrency((Number(quantity) || 0) * (Number(unitPrice) || 0))}
                            </span>
                        </span>
                        <div className="flex gap-1">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowForm(false)}
                                className="text-muted-foreground"
                            >
                                Zrušit
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={submitting || !name.trim() || !unitPrice}
                                className="bg-primary text-white hover:bg-primary/80"
                            >
                                Přidat
                            </Button>
                        </div>
                    </div>
                </form>
            )}

            {/* Items list */}
            {items.length === 0 && !showForm ? (
                <p className="text-sm text-muted-foreground">Žádné položky</p>
            ) : (
                <div className="space-y-2">
                    {items.map((item) =>
                        editingId === item.id ? (
                            <div
                                key={item.id}
                                className="rounded-lg border border-primary/30 bg-accent p-3"
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') handleEditCancel();
                                }}
                            >
                                <div className="space-y-2">
                                    <Input
                                        value={editForm.name}
                                        onChange={(e) =>
                                            setEditForm((f) => ({ ...f, name: e.target.value }))
                                        }
                                        className="border-border bg-card text-sm"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <Input
                                            value={editForm.quantity}
                                            onChange={(e) =>
                                                setEditForm((f) => ({ ...f, quantity: e.target.value }))
                                            }
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            className="w-24 shrink-0 border-border bg-card text-sm"
                                        />
                                        <Select
                                            value={editForm.unit}
                                            onValueChange={(v) =>
                                                setEditForm((f) => ({ ...f, unit: v }))
                                            }
                                        >
                                            <SelectTrigger className="w-20 shrink-0 border-border bg-card text-sm">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="border-border bg-card">
                                                {UNITS.map((u) => (
                                                    <SelectItem key={u.value} value={u.value} className="focus:bg-accent">
                                                        {u.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <div className="relative flex-1">
                                            <Input
                                                value={editForm.unit_price}
                                                onChange={(e) =>
                                                    setEditForm((f) => ({ ...f, unit_price: e.target.value }))
                                                }
                                                type="number"
                                                className="border-border bg-card pr-10 text-sm"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                                Kč
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            Celkem:{' '}
                                            <span className="font-medium text-primary">
                                                {formatCurrency(
                                                    (Number(editForm.quantity) || 0) * (Number(editForm.unit_price) || 0),
                                                )}
                                            </span>
                                        </span>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-xs"
                                                className="text-muted-foreground hover:text-foreground"
                                                onClick={handleEditCancel}
                                            >
                                                <X className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-xs"
                                                className="text-primary hover:text-primary/80"
                                                onClick={() => handleUpdate(item.id)}
                                            >
                                                <Check className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                key={item.id}
                                className="flex items-center justify-between rounded-lg border-l-2 border-primary/40 bg-accent pl-3 pr-3 py-3"
                            >
                                <div className="flex items-center gap-3">
                                    <Package className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm font-medium text-foreground">{item.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {item.quantity} {item.unit} &times; {formatCurrency(item.unit_price)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-foreground">
                                        {formatCurrency(item.total)}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        className="text-muted-foreground hover:text-foreground"
                                        onClick={() => handleEditStart(item)}
                                    >
                                        <Pencil className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        className="text-muted-foreground hover:text-red-400"
                                        onClick={() => handleDelete(item.id)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        ),
                    )}
                </div>
            )}

            {/* Total */}
            {items.length > 0 && (
                <div className="mt-4 flex items-center justify-between rounded-lg bg-primary/5 border border-primary/15 px-3 py-2">
                    <span className="text-sm font-medium text-muted-foreground">Celkem položky</span>
                    <span className="text-base font-bold text-foreground">
                        {formatCurrency(itemsTotal)}
                    </span>
                </div>
            )}
        </div>
    );
}
