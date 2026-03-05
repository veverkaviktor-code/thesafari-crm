import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react';
import { type InertiaFormProps } from '@inertiajs/react';
import { Loader2, Plus, Search, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn, formatPhone } from '@/lib/utils';

export interface CustomerFormData {
    type: 'fyzicka' | 'pravnicka';
    name: string;
    company: string;
    ico: string;
    dic: string;
    contact_person: string;
    email: string;
    phone: string;
    web: string;
    billing_street: string;
    billing_city: string;
    billing_zip: string;
    billing_country: string;
    delivery_same: boolean;
    delivery_street: string;
    delivery_city: string;
    delivery_zip: string;
    delivery_country: string;
    notes: string;
    tags: string[];
    avatar: File | null;
}

export const defaultCustomerData: CustomerFormData = {
    type: 'fyzicka',
    company: '',
    name: '',
    ico: '',
    dic: '',
    contact_person: '',
    email: '',
    phone: '',
    web: '',
    billing_street: '',
    billing_city: '',
    billing_zip: '',
    billing_country: 'Česká republika',
    delivery_same: true,
    delivery_street: '',
    delivery_city: '',
    delivery_zip: '',
    delivery_country: 'Česká republika',
    notes: '',
    tags: [],
    avatar: null,
};

const TAG_COLORS = [
    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'bg-violet-500/20 text-violet-400 border-violet-500/30',
    'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
];

interface CustomerFormProps {
    form: InertiaFormProps<CustomerFormData>;
    onSubmit: (e: FormEvent) => void;
    submitLabel: string;
    onCancel?: () => void;
}

export default function CustomerForm({
    form,
    onSubmit,
    submitLabel,
    onCancel,
}: CustomerFormProps) {
    const { data, setData, errors, processing } = form;
    const [tagInput, setTagInput] = useState('');
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [aresLoading, setAresLoading] = useState(false);
    const [aresError, setAresError] = useState<string | null>(null);
    const [aresSuccess, setAresSuccess] = useState(false);

    const addPendingTag = () => {
        const value = tagInput.trim();
        if (value && !data.tags.includes(value)) {
            setData('tags', [...data.tags, value]);
        }
        setTagInput('');
    };

    const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addPendingTag();
        }
    };

    const removeTag = (tag: string) => {
        setData(
            'tags',
            data.tags.filter((t) => t !== tag),
        );
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setData('avatar', file);
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setAvatarPreview(null);
        }
    };

    const handleAresLookup = async () => {
        const ico = data.ico.trim();
        if (!ico || ico.length !== 8) {
            setAresError('IČO musí obsahovat 8 číslic.');
            return;
        }
        setAresLoading(true);
        setAresError(null);
        setAresSuccess(false);
        try {
            const response = await fetch(`/api/ares/${ico}`);
            const result = await response.json();
            if (!response.ok) {
                setAresError(result.error || 'Chyba při vyhledávání.');
                return;
            }
            if (result.name) setData('name', result.name);
            if (result.dic) setData('dic', result.dic);
            if (result.street) setData('billing_street', result.street);
            if (result.city) setData('billing_city', result.city);
            if (result.zip) setData('billing_zip', result.zip);
            if (result.country) setData('billing_country', result.country);
            setData('type', 'pravnicka');
            setAresSuccess(true);
            setTimeout(() => setAresSuccess(false), 3000);
        } catch {
            setAresError('Nepodařilo se připojit k ARES.');
        } finally {
            setAresLoading(false);
        }
    };

    const normalizeUrl = (url: string): string => {
        const trimmed = url.trim();
        if (!trimmed) return '';
        if (/^https?:\/\//i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
    };

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            window.history.back();
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-8">
            {/* Type toggle + Avatar */}
            <div className="rounded-xl border border-border bg-card p-6">
                <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-4">
                        <Label className="text-foreground/70">Typ zákazníka</Label>
                        <div className="flex gap-2">
                            {(
                                [
                                    { value: 'fyzicka', label: 'Fyzická osoba' },
                                    { value: 'pravnicka', label: 'Právnická osoba' },
                                ] as const
                            ).map((opt) => (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setData('type', opt.value)}
                                    className={cn(
                                        'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                                        data.type === opt.value
                                            ? 'border-primary bg-primary/10 text-primary'
                                            : 'border-border text-muted-foreground hover:border-white/20 hover:text-foreground/70',
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                        <FieldError error={errors.type} />
                    </div>

                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="group flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border transition-colors hover:border-white/20"
                        >
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt="Avatar"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <Upload className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-muted-foreground" />
                            )}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                        <span className="text-xs text-muted-foreground">Avatar</span>
                    </div>
                </div>
            </div>

            {/* Basic info */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="mb-4 text-sm font-semibold text-foreground/70">
                    Základní údaje
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field
                        label="Jméno / Název *"
                        value={data.name}
                        onChange={(v) => setData('name', v)}
                        error={errors.name}
                        placeholder={
                            data.type === 'fyzicka'
                                ? 'Jan Novák'
                                : 'Firma s.r.o.'
                        }
                    />
                    <Field
                        label="Obchodní název"
                        value={data.company}
                        onChange={(v) => setData('company', v)}
                        error={errors.company}
                        placeholder="Pokud se liší od názvu"
                    />
                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground">IČO</Label>
                        <div className="flex gap-2">
                            <Input
                                value={data.ico}
                                onChange={(e) => {
                                    setData('ico', e.target.value);
                                    setAresError(null);
                                    setAresSuccess(false);
                                }}
                                placeholder="12345678"
                                maxLength={8}
                                className="border-border bg-accent"
                                aria-invalid={!!errors.ico || !!aresError}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={aresLoading || data.ico.trim().length !== 8}
                                onClick={handleAresLookup}
                                className="shrink-0 border-border text-muted-foreground hover:border-primary hover:text-primary"
                            >
                                {aresLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Search className="h-4 w-4" />
                                )}
                                <span className="ml-1.5">ARES</span>
                            </Button>
                        </div>
                        <FieldError error={errors.ico} />
                        {aresError && (
                            <p className="text-xs text-red-400">{aresError}</p>
                        )}
                        {aresSuccess && (
                            <p className="text-xs text-emerald-400">Data z ARES načtena.</p>
                        )}
                    </div>
                    <Field
                        label="DIČ"
                        value={data.dic}
                        onChange={(v) => setData('dic', v)}
                        error={errors.dic}
                        placeholder="CZ12345678"
                    />
                </div>
            </div>

            {/* Contact info */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="mb-4 text-sm font-semibold text-foreground/70">
                    Kontaktní údaje
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                    <Field
                        label="Kontaktní osoba"
                        value={data.contact_person}
                        onChange={(v) => setData('contact_person', v)}
                        error={errors.contact_person}
                        placeholder="Jméno kontaktní osoby"
                    />
                    <Field
                        label="E-mail"
                        value={data.email}
                        onChange={(v) => setData('email', v)}
                        error={errors.email}
                        placeholder="email@example.com"
                        type="email"
                    />
                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground">Telefon</Label>
                        <Input
                            type="tel"
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            onBlur={() => setData('phone', formatPhone(data.phone))}
                            placeholder="+420 123 456 789"
                            className="border-border bg-accent"
                            aria-invalid={!!errors.phone}
                        />
                        <FieldError error={errors.phone} />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-muted-foreground">Web</Label>
                        <Input
                            value={data.web}
                            onChange={(e) => setData('web', e.target.value)}
                            onBlur={() => setData('web', normalizeUrl(data.web))}
                            placeholder="example.com"
                            className="border-border bg-accent"
                            aria-invalid={!!errors.web}
                        />
                        <FieldError error={errors.web} />
                    </div>
                </div>
            </div>

            {/* Billing address */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="mb-4 text-sm font-semibold text-foreground/70">
                    Fakturační adresa
                </h3>
                <AddressFields
                    prefix="billing"
                    data={data}
                    setData={setData}
                    errors={errors}
                />
            </div>

            {/* Delivery address */}
            <div className="rounded-xl border border-border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-foreground/70">
                        Doručovací adresa
                    </h3>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Checkbox
                            checked={data.delivery_same}
                            onCheckedChange={(checked) =>
                                setData('delivery_same', checked === true)
                            }
                        />
                        Stejná jako fakturační
                    </label>
                </div>
                {!data.delivery_same && (
                    <AddressFields
                        prefix="delivery"
                        data={data}
                        setData={setData}
                        errors={errors}
                    />
                )}
            </div>

            {/* Tags */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="mb-4 text-sm font-semibold text-foreground/70">Štítky</h3>
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <Input
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={handleTagKeyDown}
                            onBlur={addPendingTag}
                            placeholder="Napište štítek a stiskněte Enter..."
                            className="border-border bg-accent"
                        />
                        {tagInput.trim() && (
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                onClick={addPendingTag}
                                className="shrink-0 border-border text-muted-foreground hover:text-foreground"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    {data.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                            {data.tags.map((tag, i) => (
                                <span
                                    key={tag}
                                    className={cn(
                                        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium',
                                        TAG_COLORS[i % TAG_COLORS.length],
                                    )}
                                >
                                    {tag}
                                    <button
                                        type="button"
                                        onClick={() => removeTag(tag)}
                                        className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-accent"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Notes */}
            <div className="rounded-xl border border-border bg-card p-6">
                <h3 className="mb-4 text-sm font-semibold text-foreground/70">
                    Poznámky
                </h3>
                <Textarea
                    value={data.notes}
                    onChange={(e) => setData('notes', e.target.value)}
                    placeholder="Interní poznámky k zákazníkovi..."
                    className="min-h-24 border-border bg-accent"
                />
                <FieldError error={errors.notes} />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3">
                <Button
                    type="button"
                    variant="ghost"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={handleCancel}
                >
                    Zrušit
                </Button>
                <Separator orientation="vertical" className="h-6 bg-border" />
                <Button
                    type="submit"
                    disabled={processing}
                    className="bg-primary text-white hover:bg-primary/80"
                >
                    {processing ? 'Ukládám...' : submitLabel}
                </Button>
            </div>
        </form>
    );
}

/* ──────────────────── Helper components ──────────────────── */

function Field({
    label,
    value,
    onChange,
    error,
    placeholder,
    type = 'text',
    maxLength,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    error?: string;
    placeholder?: string;
    type?: string;
    maxLength?: number;
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-muted-foreground">{label}</Label>
            <Input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                className="border-border bg-accent"
                aria-invalid={!!error}
            />
            <FieldError error={error} />
        </div>
    );
}

function AddressFields({
    prefix,
    data,
    setData,
    errors,
}: {
    prefix: 'billing' | 'delivery';
    data: CustomerFormData;
    setData: InertiaFormProps<CustomerFormData>['setData'];
    errors: Partial<Record<keyof CustomerFormData, string>>;
}) {
    const k = (field: string) =>
        `${prefix}_${field}` as keyof CustomerFormData;

    return (
        <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
                <Field
                    label="Ulice"
                    value={data[k('street')] as string}
                    onChange={(v) => setData(k('street'), v)}
                    error={errors[k('street')]}
                    placeholder="Ulice a číslo popisné"
                />
            </div>
            <Field
                label="Město"
                value={data[k('city')] as string}
                onChange={(v) => setData(k('city'), v)}
                error={errors[k('city')]}
                placeholder="Město"
            />
            <div className="grid grid-cols-2 gap-4">
                <Field
                    label="PSČ"
                    value={data[k('zip')] as string}
                    onChange={(v) => setData(k('zip'), v)}
                    error={errors[k('zip')]}
                    placeholder="123 00"
                />
                <Field
                    label="Země"
                    value={data[k('country')] as string}
                    onChange={(v) => setData(k('country'), v)}
                    error={errors[k('country')]}
                    placeholder="Česká republika"
                />
            </div>
        </div>
    );
}

function FieldError({ error }: { error?: string }) {
    if (!error) return null;
    return <p className="text-xs text-red-400">{error}</p>;
}
