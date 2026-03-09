import { useEffect, useMemo, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import {
    ArrowLeft,
    Camera,
    Pencil,
    Plus,
    Trash2,
    X,
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import GlassModal from '@/components/ui/GlassModal';
import { Button } from '@/components/ui/button';
import { FieldError } from '@/components/ui/FieldError';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { LAMINATION_OPTIONS, MATERIALS } from '@/lib/materials';
import { calculateEstimateTotal } from '@/lib/nesting';
import { cn, formatCurrency } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EstimateItem {
    id: number;
    name: string;
    width: number;
    height: number;
    quantity: number;
    material: string | null;
    lamination: string | null;
    is_external: boolean;
    calculated_price: number | null;
    sort_order: number;
}

interface EstimatePhoto {
    id: number;
    path: string;
    caption: string | null;
    estimate_item_id: number | null;
}

interface Estimate {
    id: number;
    name: string;
    customer_id: number | null;
    customer: {
        id: number;
        name: string;
        company: string | null;
        email: string | null;
        phone: string | null;
    } | null;
    deadline: string | null;
    notes: string | null;
    total_price: number;
    status: string;
    items: EstimateItem[];
    photos: EstimatePhoto[];
}

interface Props {
    estimate: Estimate;
    customers: { id: number; name: string; company: string | null }[];
}

// ---------------------------------------------------------------------------
// Item form state
// ---------------------------------------------------------------------------

interface ItemFormData {
    name: string;
    width: string;
    height: string;
    material: string;
    lamination: string;
    is_external: boolean;
}

const emptyItemForm: ItemFormData = {
    name: '',
    width: '',
    height: '',
    material: '',
    lamination: '',
    is_external: false,
};

function itemToFormData(item: EstimateItem): ItemFormData {
    return {
        name: item.name,
        width: String(Math.round(Number(item.width) * 100)),
        height: String(Math.round(Number(item.height) * 100)),
        material: item.material ?? '',
        lamination: item.lamination ?? '',
        is_external: item.is_external,
    };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function InputField({
    label,
    error,
    className,
    ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    className?: string;
}) {
    return (
        <div className={cn('space-y-1.5', className)}>
            <label className="text-sm font-medium text-foreground">{label}</label>
            <input
                {...props}
                className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-amber-600/40"
            />
            <FieldError error={error} />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Show({ estimate, customers }: Props) {
    // Inline name editing
    const [editingName, setEditingName] = useState(false);
    const [nameValue, setNameValue] = useState(estimate.name);

    // Item modal
    const [itemModal, setItemModal] = useState<{
        open: boolean;
        item: EstimateItem | null;
    }>({ open: false, item: null });
    const [itemForm, setItemForm] = useState<ItemFormData>(emptyItemForm);
    const [itemProcessing, setItemProcessing] = useState(false);
    const [itemErrors, setItemErrors] = useState<Partial<Record<keyof ItemFormData, string>>>({});

    // Delete item confirmation (inline)
    const [deleteItemId, setDeleteItemId] = useState<number | null>(null);

    // Delete estimate modal
    const [deleteEstimateOpen, setDeleteEstimateOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Photo — direct upload, no intermediate form
    const photoInputRef = useRef<HTMLInputElement>(null);
    const photoForItemIdRef = useRef<number | null>(null);
    const [lightboxPhoto, setLightboxPhoto] = useState<EstimatePhoto | null>(null);

    // ---------------------------------------------------------------------------
    // Nesting calculation
    // ---------------------------------------------------------------------------

    const nestingResult = useMemo(() => {
        const nestableItems = estimate.items
            .filter((i) => !i.is_external && i.material)
            .map((i) => ({
                id: i.id,
                name: i.name,
                width: Number(i.width),
                height: Number(i.height),
                quantity: i.quantity,
                materialKey: i.material!,
            }));
        return calculateEstimateTotal(nestableItems, (key) => MATERIALS[key]);
    }, [estimate.items]);

    // Sync total_price to DB whenever nesting result changes
    useEffect(() => {
        const total = nestingResult.grandTotal;
        if (Math.abs(total - estimate.total_price) > 0.01) {
            router.put(`/kalkulator/${estimate.id}`, { total_price: total }, {
                preserveScroll: true,
                preserveState: true,
            });
        }
    }, [nestingResult.grandTotal]);

    // ---------------------------------------------------------------------------
    // Handlers — estimate meta
    // ---------------------------------------------------------------------------

    const saveName = () => {
        setEditingName(false);
        if (nameValue.trim() && nameValue !== estimate.name) {
            router.put(
                `/kalkulator/${estimate.id}`,
                { name: nameValue.trim() },
                { preserveScroll: true },
            );
        }
    };

    const handleCustomerChange = (val: string) => {
        router.put(
            `/kalkulator/${estimate.id}`,
            { customer_id: val === '__none__' ? null : val },
            { preserveScroll: true },
        );
    };

    const handleDeadlineChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        router.put(
            `/kalkulator/${estimate.id}`,
            { deadline: e.target.value || null },
            { preserveScroll: true },
        );
    };

    const handleDeleteEstimate = () => {
        setDeleting(true);
        router.delete(`/kalkulator/${estimate.id}`, {
            onError: () => setDeleting(false),
        });
    };

    // ---------------------------------------------------------------------------
    // Handlers — items
    // ---------------------------------------------------------------------------

    const openAddItem = () => {
        setItemForm(emptyItemForm);
        setItemErrors({});
        setItemModal({ open: true, item: null });
    };

    const openEditItem = (item: EstimateItem) => {
        setItemForm(itemToFormData(item));
        setItemErrors({});
        setItemModal({ open: true, item });
    };

    const closeItemModal = () => {
        setItemModal({ open: false, item: null });
        setItemErrors({});
    };

    const setField = <K extends keyof ItemFormData>(key: K, val: ItemFormData[K]) => {
        setItemForm((prev) => {
            const next = { ...prev, [key]: val };
            if (key === 'is_external' && val) {
                next.material = '';
                next.lamination = '';
            }
            if (key === 'material') {
                const mat = MATERIALS[val as string];
                if (!mat?.hasLamination) next.lamination = '';
            }
            return next;
        });
    };

    const validateItemForm = (): boolean => {
        const errors: Partial<Record<keyof ItemFormData, string>> = {};
        if (!itemForm.name.trim()) errors.name = 'Název je povinný.';
        if (!itemForm.width || Number(itemForm.width) <= 0) errors.width = 'Zadejte kladnou šířku.';
        if (!itemForm.height || Number(itemForm.height) <= 0) errors.height = 'Zadejte kladnou výšku.';
        setItemErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const submitItemForm = (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateItemForm()) return;

        const payload = {
            name: itemForm.name.trim(),
            width: Number(itemForm.width) / 100,
            height: Number(itemForm.height) / 100,
            quantity: 1,
            material: itemForm.is_external ? null : itemForm.material || null,
            lamination: itemForm.is_external ? null : itemForm.lamination || null,
            is_external: itemForm.is_external,
        };

        setItemProcessing(true);
        const isEdit = itemModal.item !== null;
        const url = isEdit
            ? `/kalkulator/${estimate.id}/items/${itemModal.item!.id}`
            : `/kalkulator/${estimate.id}/items`;

        const options = {
            preserveScroll: true,
            onSuccess: () => {
                setItemProcessing(false);
                closeItemModal();
            },
            onError: (errs: Record<string, string>) => {
                setItemProcessing(false);
                setItemErrors(errs as typeof itemErrors);
            },
        };

        if (isEdit) {
            router.put(url, payload, options);
        } else {
            router.post(url, payload, options);
        }
    };

    const deleteItem = (itemId: number) => {
        router.delete(`/kalkulator/${estimate.id}/items/${itemId}`, {
            preserveScroll: true,
            onSuccess: () => setDeleteItemId(null),
        });
    };

    // ---------------------------------------------------------------------------
    // Handlers — photos (direct upload, no form)
    // ---------------------------------------------------------------------------

    const triggerPhotoUpload = (itemId?: number) => {
        photoForItemIdRef.current = itemId ?? null;
        photoInputRef.current?.click();
    };

    const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const data: Record<string, unknown> = { photo: file };
        if (photoForItemIdRef.current) {
            data.estimate_item_id = photoForItemIdRef.current;
        }

        router.post(`/kalkulator/${estimate.id}/photos`, data, {
            forceFormData: true,
            preserveScroll: true,
        });
        e.target.value = '';
        photoForItemIdRef.current = null;
    };

    const deletePhoto = (photoId: number) => {
        router.delete(`/kalkulator/${estimate.id}/photos/${photoId}`, {
            preserveScroll: true,
        });
    };

    // ---------------------------------------------------------------------------
    // Derived
    // ---------------------------------------------------------------------------

    const selectedMaterial = itemForm.is_external ? null : MATERIALS[itemForm.material];
    const showLamination = !!selectedMaterial?.hasLamination;

    const getItemName = (photo: EstimatePhoto): string | null => {
        if (!photo.estimate_item_id) return null;
        return estimate.items.find((i) => i.id === photo.estimate_item_id)?.name ?? null;
    };

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: 'Kalkulátor', href: '/kalkulator' },
                { label: estimate.name },
            ]}
        >
            {/* Hidden file input for photos */}
            <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
            />

            <div className="min-w-0 space-y-6 pb-24 lg:pb-8">

                {/* ── Header ─────────────────────────────────────────────── */}
                <div className="flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                        <button
                            onClick={() => router.visit('/kalkulator')}
                            className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </button>

                        {editingName ? (
                            <input
                                autoFocus
                                value={nameValue}
                                onChange={(e) => setNameValue(e.target.value)}
                                onBlur={saveName}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') saveName();
                                    if (e.key === 'Escape') {
                                        setNameValue(estimate.name);
                                        setEditingName(false);
                                    }
                                }}
                                className="min-w-0 flex-1 rounded-lg border border-amber-600/60 bg-muted px-3 py-1.5 text-lg font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-amber-600/40 sm:text-xl"
                            />
                        ) : (
                            <button
                                onClick={() => setEditingName(true)}
                                className="group flex min-w-0 items-center gap-2 rounded-lg px-2 py-1 transition-colors hover:bg-accent"
                            >
                                <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                                    {estimate.name}
                                </h1>
                                <Pencil className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                            </button>
                        )}
                    </div>

                    <Button
                        size="icon"
                        className="shrink-0 bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/25"
                        onClick={() => setDeleteEstimateOpen(true)}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>

                {/* ── Meta row ───────────────────────────────────────────── */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="min-w-0 space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Zákazník</label>
                        <Select
                            value={estimate.customer_id ? String(estimate.customer_id) : '__none__'}
                            onValueChange={handleCustomerChange}
                        >
                            <SelectTrigger className="w-full border-border bg-muted">
                                <SelectValue placeholder="Bez zákazníka" />
                            </SelectTrigger>
                            <SelectContent className="border-border bg-card">
                                <SelectItem value="__none__" className="focus:bg-accent text-muted-foreground italic">
                                    Bez zákazníka
                                </SelectItem>
                                {customers.map((c) => (
                                    <SelectItem key={c.id} value={String(c.id)} className="focus:bg-accent">
                                        {c.company ? `${c.company} — ${c.name}` : c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="min-w-0 space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Termín</label>
                        <input
                            type="date"
                            defaultValue={estimate.deadline ?? ''}
                            onBlur={handleDeadlineChange}
                            className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-600/40"
                        />
                    </div>
                </div>

                {/* ── Položky ────────────────────────────────────────────── */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Položky
                        </h2>
                        <Button
                            size="sm"
                            className="bg-amber-600 text-white hover:bg-amber-500"
                            onClick={openAddItem}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Přidat
                        </Button>
                    </div>

                    {estimate.items.length === 0 && (
                        <p className="py-8 text-center text-sm text-muted-foreground/60">
                            Zatím žádné položky. Přidejte první.
                        </p>
                    )}

                    <div className="space-y-2">
                        {estimate.items.map((item) => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                photoCount={estimate.photos.filter((p) => p.estimate_item_id === item.id).length}
                                confirmingDelete={deleteItemId === item.id}
                                onEdit={() => openEditItem(item)}
                                onPhoto={() => triggerPhotoUpload(item.id)}
                                onDeleteRequest={() => setDeleteItemId(item.id)}
                                onDeleteConfirm={() => deleteItem(item.id)}
                                onDeleteCancel={() => setDeleteItemId(null)}
                            />
                        ))}
                    </div>
                </section>

                {/* ── Kalkulace ──────────────────────────────────────────── */}
                {nestingResult.byMaterial.length > 0 && (
                    <section className="space-y-3">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Kalkulace
                        </h2>

                        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                            {nestingResult.byMaterial.map((mat, i) => (
                                <div key={mat.materialKey}>
                                    {i > 0 && <div className="border-t border-border" />}
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-foreground">
                                            {mat.materialLabel}
                                        </p>
                                        <div className="flex flex-wrap gap-x-5 gap-y-0.5 text-xs text-muted-foreground">
                                            <span>Délka: {mat.result.totalLength.toFixed(2)} m</span>
                                            <span>Plocha: {mat.result.totalArea.toFixed(2)} m²</span>
                                            <span>Odpad: {mat.result.wastePercent.toFixed(0)} %</span>
                                            <span className="font-medium text-foreground/80">
                                                {formatCurrency(mat.result.totalPrice)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="border-t border-border pt-3 flex items-baseline justify-between">
                                <span className="text-sm text-muted-foreground">Celkem materiál</span>
                                <span className="text-2xl font-semibold text-foreground">
                                    {formatCurrency(nestingResult.grandTotal)}
                                </span>
                            </div>
                        </div>
                    </section>
                )}

                {/* ── Fotky ──────────────────────────────────────────────── */}
                <section className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            Fotky
                        </h2>
                        <button
                            onClick={() => triggerPhotoUpload()}
                            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-600/10"
                        >
                            <Camera className="h-3.5 w-3.5" />
                            Přidat fotku
                        </button>
                    </div>

                    {estimate.photos.length === 0 && (
                        <p className="py-6 text-center text-sm text-muted-foreground/60">
                            Žádné fotky.
                        </p>
                    )}

                    {estimate.photos.length > 0 && (
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                            {estimate.photos.map((photo) => {
                                const itemName = getItemName(photo);
                                return (
                                    <div key={photo.id} className="group relative aspect-square">
                                        <img
                                            src={`/storage/${photo.path}`}
                                            alt={itemName ?? ''}
                                            onClick={() => setLightboxPhoto(photo)}
                                            className="h-full w-full cursor-pointer rounded-lg object-cover transition-opacity group-hover:opacity-90"
                                        />
                                        {itemName && (
                                            <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                                                {itemName}
                                            </span>
                                        )}
                                        <button
                                            onClick={() => deletePhoto(photo.id)}
                                            className="absolute right-1 top-1 rounded-full bg-black/60 p-1.5 text-white opacity-100 sm:opacity-0 transition-opacity sm:group-hover:opacity-100 hover:bg-red-600"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>

            {/* ── Sticky bottom bar ─────────────────────────────────────── */}
            <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 px-4 py-3 backdrop-blur-md lg:hidden">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Celkem materiál</span>
                    <span className="text-lg font-semibold text-foreground">
                        {formatCurrency(nestingResult.grandTotal)}
                    </span>
                </div>
            </div>

            {/* ── Lightbox ──────────────────────────────────────────────── */}
            {lightboxPhoto && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
                    onClick={() => setLightboxPhoto(null)}
                >
                    <button
                        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
                        onClick={() => setLightboxPhoto(null)}
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <img
                        src={`/storage/${lightboxPhoto.path}`}
                        alt=""
                        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    {(() => {
                        const name = getItemName(lightboxPhoto);
                        return name ? (
                            <p className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-black/60 px-4 py-2 text-sm text-white">
                                {name}
                            </p>
                        ) : null;
                    })()}
                </div>
            )}

            {/* ── Item modal ────────────────────────────────────────────── */}
            <GlassModal
                open={itemModal.open}
                onClose={closeItemModal}
                title={itemModal.item ? 'Upravit položku' : 'Nová položka'}
                maxWidth="max-w-lg"
            >
                <form onSubmit={submitItemForm} className="space-y-4">
                    <InputField
                        label="Název"
                        autoFocus
                        placeholder="např. Okno předek"
                        value={itemForm.name}
                        onChange={(e) => setField('name', e.target.value)}
                        error={itemErrors.name}
                    />

                    <div className="grid grid-cols-2 gap-3">
                        <InputField
                            label="Šířka (cm)"
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="1"
                            placeholder="200"
                            value={itemForm.width}
                            onChange={(e) => setField('width', e.target.value)}
                            error={itemErrors.width}
                        />
                        <InputField
                            label="Výška (cm)"
                            type="number"
                            inputMode="numeric"
                            step="1"
                            min="1"
                            placeholder="120"
                            value={itemForm.height}
                            onChange={(e) => setField('height', e.target.value)}
                            error={itemErrors.height}
                        />
                    </div>

                    <label className="flex cursor-pointer items-center gap-3">
                        <input
                            type="checkbox"
                            checked={itemForm.is_external}
                            onChange={(e) => setField('is_external', e.target.checked)}
                            className="h-4 w-4 rounded border-border accent-amber-600"
                        />
                        <span className="text-sm text-foreground">Externě (dodavatel)</span>
                    </label>

                    {!itemForm.is_external && (
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium text-foreground">Materiál</label>
                                <Select
                                    value={itemForm.material || '__none__'}
                                    onValueChange={(v) => setField('material', v === '__none__' ? '' : v)}
                                >
                                    <SelectTrigger className="w-full border-border bg-muted">
                                        <SelectValue placeholder="Vyberte materiál" />
                                    </SelectTrigger>
                                    <SelectContent className="border-border bg-card">
                                        <SelectItem value="__none__" className="focus:bg-accent text-muted-foreground italic">
                                            Bez materiálu
                                        </SelectItem>
                                        {Object.values(MATERIALS).map((m) => (
                                            <SelectItem key={m.key} value={m.key} className="focus:bg-accent">
                                                {m.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FieldError error={itemErrors.material} />
                            </div>

                            {showLamination && (
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-foreground">Laminace</label>
                                    <Select
                                        value={itemForm.lamination || '__none__'}
                                        onValueChange={(v) => setField('lamination', v === '__none__' ? '' : v)}
                                    >
                                        <SelectTrigger className="w-full border-border bg-muted">
                                            <SelectValue placeholder="Bez laminace" />
                                        </SelectTrigger>
                                        <SelectContent className="border-border bg-card">
                                            <SelectItem value="__none__" className="focus:bg-accent text-muted-foreground italic">
                                                Bez laminace
                                            </SelectItem>
                                            {LAMINATION_OPTIONS.map((l) => (
                                                <SelectItem key={l.value} value={l.value} className="focus:bg-accent">
                                                    {l.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={closeItemModal}
                        >
                            Zrušit
                        </Button>
                        <Button
                            type="submit"
                            disabled={itemProcessing}
                            className="bg-amber-600 text-white hover:bg-amber-500 disabled:opacity-50"
                        >
                            {itemProcessing
                                ? itemModal.item ? 'Ukládám...' : 'Přidávám...'
                                : itemModal.item ? 'Uložit' : 'Přidat'}
                        </Button>
                    </div>
                </form>
            </GlassModal>

            {/* ── Delete estimate modal ─────────────────────────────────── */}
            <GlassModal
                open={deleteEstimateOpen}
                onClose={() => setDeleteEstimateOpen(false)}
                title="Smazat kalkulaci"
                maxWidth="max-w-md"
            >
                <div className="space-y-6">
                    <p className="text-sm text-muted-foreground">
                        Kalkulace{' '}
                        <span className="font-semibold text-foreground">{estimate.name}</span>{' '}
                        bude přesunuta do koše. Po 30 dnech se smaže trvale.
                    </p>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="ghost"
                            className="text-muted-foreground hover:text-foreground"
                            onClick={() => setDeleteEstimateOpen(false)}
                        >
                            Zrušit
                        </Button>
                        <Button
                            variant="destructive"
                            disabled={deleting}
                            onClick={handleDeleteEstimate}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            <Trash2 className="h-4 w-4" />
                            {deleting ? 'Mažu...' : 'Do koše'}
                        </Button>
                    </div>
                </div>
            </GlassModal>
        </AuthenticatedLayout>
    );
}

// ---------------------------------------------------------------------------
// ItemCard
// ---------------------------------------------------------------------------

function ItemCard({
    item,
    photoCount,
    confirmingDelete,
    onEdit,
    onPhoto,
    onDeleteRequest,
    onDeleteConfirm,
    onDeleteCancel,
}: {
    item: EstimateItem;
    photoCount: number;
    confirmingDelete: boolean;
    onEdit: () => void;
    onPhoto: () => void;
    onDeleteRequest: () => void;
    onDeleteConfirm: () => void;
    onDeleteCancel: () => void;
}) {
    const material = item.material ? MATERIALS[item.material] : null;
    const lamination = item.lamination
        ? LAMINATION_OPTIONS.find((l) => l.value === item.lamination)
        : null;

    const widthCm = Math.round(Number(item.width) * 100);
    const heightCm = Math.round(Number(item.height) * 100);

    return (
        <div className="group rounded-xl border border-border bg-card p-3 transition-colors hover:border-border/80 sm:p-4">
            {confirmingDelete ? (
                <div className="flex items-center justify-between gap-4">
                    <p className="text-sm text-muted-foreground">
                        Smazat <span className="font-medium text-foreground">{item.name}</span>?
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={onDeleteCancel}
                            className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                        >
                            Zrušit
                        </button>
                        <button
                            onClick={onDeleteConfirm}
                            className="rounded-lg bg-red-600/10 px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-600 hover:text-white"
                        >
                            Smazat
                        </button>
                    </div>
                </div>
            ) : (
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                        <p className="font-medium text-foreground">{item.name}</p>

                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                            <span>{widthCm} × {heightCm} cm</span>

                            {item.is_external && (
                                <span className="inline-flex items-center rounded-md bg-amber-600/15 px-2 py-0.5 text-xs font-medium text-amber-500">
                                    Externě
                                </span>
                            )}

                            {material && !item.is_external && (
                                <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-xs text-foreground/70">
                                    {material.label}
                                </span>
                            )}

                            {lamination && !item.is_external && (
                                <span className="inline-flex items-center rounded-md bg-accent px-2 py-0.5 text-xs text-foreground/70">
                                    {lamination.label}
                                </span>
                            )}

                            {photoCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground/60">
                                    <Camera className="h-3 w-3" />
                                    {photoCount}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                        <button
                            onClick={onPhoto}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                            title="Přidat fotku"
                        >
                            <Camera className="h-5 w-5 sm:h-4 sm:w-4" />
                        </button>
                        <button
                            onClick={onEdit}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground sm:opacity-0 sm:group-hover:opacity-100"
                            title="Upravit"
                        >
                            <Pencil className="h-5 w-5 sm:h-4 sm:w-4" />
                        </button>
                        <button
                            onClick={onDeleteRequest}
                            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400 sm:opacity-0 sm:group-hover:opacity-100"
                            title="Smazat"
                        >
                            <Trash2 className="h-5 w-5 sm:h-4 sm:w-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
