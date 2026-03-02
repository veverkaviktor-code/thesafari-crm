import { Separator } from '@/components/ui/separator';

interface PreviewItem {
    description: string;
    quantity: string;
    unit: string;
    unit_price: string;
}

interface Props {
    invoiceNumber?: string;
    customerName?: string;
    issueDate?: string;
    dueDate?: string;
    paymentMethod?: string;
    variableSymbol?: string;
    items: PreviewItem[];
    notes?: string;
}

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
    }).format(v);

const formatDate = (d: string) =>
    d ? new Date(d).toLocaleDateString('cs-CZ') : '—';

export default function InvoicePreview({
    invoiceNumber,
    customerName,
    issueDate,
    dueDate,
    paymentMethod,
    variableSymbol,
    items,
    notes,
}: Props) {
    const grandTotal = items.reduce((sum, item) => {
        return sum + (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
    }, 0);

    return (
        <div className="sticky top-6 rounded-xl border border-[#F5F0E8]/[0.05] bg-[#16140f] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[#F5F0E8]/70">
                Náhled faktury
            </h3>

            {/* Mini invoice card */}
            <div className="rounded-lg border border-[#F5F0E8]/[0.06] bg-white/[0.02] p-4">
                {/* Header */}
                <div className="mb-3 flex items-start justify-between">
                    <div>
                        <p className="text-xs text-[#6B6560]">FAKTURA</p>
                        <p className="text-sm font-semibold text-white">
                            {invoiceNumber || '—'}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-[#6B6560]">The Safari s.r.o.</p>
                        <p className="text-[10px] text-[#6B6560]">Dodavatel</p>
                    </div>
                </div>

                <Separator className="my-2 bg-[#F5F0E8]/[0.04]" />

                {/* Customer */}
                <div className="mb-3">
                    <p className="text-[10px] text-[#6B6560]">Odběratel</p>
                    <p className="text-sm text-[#F5F0E8]/70">
                        {customerName || '—'}
                    </p>
                </div>

                {/* Dates */}
                <div className="mb-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <p className="text-[#6B6560]">Datum vystavení</p>
                        <p className="text-[#9C9585]">
                            {issueDate ? formatDate(issueDate) : '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[#6B6560]">Datum splatnosti</p>
                        <p className="text-[#9C9585]">
                            {dueDate ? formatDate(dueDate) : '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[#6B6560]">Platba</p>
                        <p className="text-[#9C9585]">
                            {paymentMethod === 'banka'
                                ? 'Převodem'
                                : paymentMethod === 'hotovost'
                                  ? 'Hotově'
                                  : '—'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[#6B6560]">VS</p>
                        <p className="text-[#9C9585]">
                            {variableSymbol || '—'}
                        </p>
                    </div>
                </div>

                <Separator className="my-2 bg-[#F5F0E8]/[0.04]" />

                {/* Items */}
                {items.length > 0 && (
                    <div className="mb-3 space-y-1">
                        {items
                            .filter((item) => item.description)
                            .map((item, i) => {
                                const total =
                                    (Number(item.quantity) || 0) *
                                    (Number(item.unit_price) || 0);
                                return (
                                    <div
                                        key={i}
                                        className="flex items-center justify-between text-xs"
                                    >
                                        <span className="truncate text-[#9C9585]">
                                            {item.description}
                                        </span>
                                        <span className="shrink-0 text-[#F5F0E8]/70">
                                            {formatCurrency(total)}
                                        </span>
                                    </div>
                                );
                            })}
                    </div>
                )}

                <Separator className="my-2 bg-[#F5F0E8]/[0.04]" />

                {/* Total */}
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#9C9585]">
                        Celkem k úhradě
                    </span>
                    <span className="text-sm font-bold text-[#D97706]">
                        {formatCurrency(grandTotal)}
                    </span>
                </div>

                {/* Notes */}
                {notes && (
                    <p className="mt-2 text-[10px] text-[#6B6560]">{notes}</p>
                )}
            </div>
        </div>
    );
}
