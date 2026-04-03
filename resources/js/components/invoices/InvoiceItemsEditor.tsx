import { Plus, Trash2 } from 'lucide-react';
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

export interface InvoiceItemRow {
    description: string;
    quantity: string;
    unit: string;
    unit_price: string;
}

const units = [
    { value: 'ks', label: 'ks' },
    { value: 'hod', label: 'hod' },
    { value: 'm2', label: 'm²' },
    { value: 'm', label: 'm' },
    { value: 'komplet', label: 'komplet' },
];

interface Props {
    items: InvoiceItemRow[];
    onChange: (items: InvoiceItemRow[]) => void;
}

export default function InvoiceItemsEditor({ items, onChange }: Props) {
    const updateItem = (index: number, field: keyof InvoiceItemRow, value: string) => {
        const updated = [...items];
        updated[index] = { ...updated[index], [field]: value };
        onChange(updated);
    };

    const addItem = () => {
        onChange([
            ...items,
            { description: '', quantity: '1', unit: 'ks', unit_price: '' },
        ]);
    };

    const removeItem = (index: number) => {
        onChange(items.filter((_, i) => i !== index));
    };

    const getRowTotal = (item: InvoiceItemRow): number => {
        const qty = Number(item.quantity) || 0;
        const price = Number(item.unit_price) || 0;
        return qty * price;
    };

    const grandTotal = items.reduce((sum, item) => sum + getRowTotal(item), 0);

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-muted-foreground">
                Položky faktury
            </h3>

            {/* Header */}
            <div className="mb-2 grid grid-cols-[1fr_80px_90px_100px_90px_36px] gap-2 text-xs font-medium text-muted-foreground">
                <span>Popis</span>
                <span>Množství</span>
                <span>Jednotka</span>
                <span>Cena/ks</span>
                <span className="text-right">Celkem</span>
                <span />
            </div>

            {/* Rows */}
            <div className="space-y-2">
                {items.map((item, i) => (
                    <div
                        key={`item-${i}`}
                        className="grid grid-cols-[1fr_80px_90px_100px_90px_36px] items-center gap-2"
                    >
                        <Input
                            value={item.description}
                            onChange={(e) =>
                                updateItem(i, 'description', e.target.value)
                            }
                            placeholder="Popis položky..."
                            className="border-border bg-accent"
                        />
                        <Input
                            value={item.quantity}
                            onChange={(e) =>
                                updateItem(i, 'quantity', e.target.value)
                            }
                            type="number"
                            min="0"
                            step="0.01"
                            className="border-border bg-accent"
                        />
                        <Select
                            value={item.unit}
                            onValueChange={(v) => updateItem(i, 'unit', v)}
                        >
                            <SelectTrigger className="border-border bg-accent">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-card">
                                {units.map((u) => (
                                    <SelectItem
                                        key={u.value}
                                        value={u.value}
                                        className="focus:bg-accent"
                                    >
                                        {u.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            value={item.unit_price}
                            onChange={(e) =>
                                updateItem(i, 'unit_price', e.target.value)
                            }
                            type="number"
                            step="1"
                            placeholder="0"
                            className="border-border bg-accent"
                        />
                        <span className="text-right text-sm font-medium text-muted-foreground">
                            {formatCurrency(getRowTotal(item))}
                        </span>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-muted-foreground hover:text-red-400"
                            onClick={() => removeItem(i)}
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                ))}
            </div>

            {/* Add + Total */}
            <div className="mt-4 flex items-center justify-between">
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={addItem}
                >
                    <Plus className="h-4 w-4" />
                    Přidat položku
                </Button>
                <div className="text-right">
                    <span className="text-sm text-muted-foreground">Celkem: </span>
                    <span className="text-lg font-bold text-primary">
                        {formatCurrency(grandTotal)}
                    </span>
                </div>
            </div>
        </div>
    );
}
