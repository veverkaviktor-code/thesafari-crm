import { type FormEvent, type KeyboardEvent, useRef, useState } from 'react';
import { type InertiaFormProps } from '@inertiajs/react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

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

    const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const value = tagInput.trim();
            if (value && !data.tags.includes(value)) {
                setData('tags', [...data.tags, value]);
            }
            setTagInput('');
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
            <div className="rounded-xl border border-[#F5F0E8]/[0.05] bg-[#16140f] p-6">
                <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 space-y-4">
                        <Label className="text-[#F5F0E8]/70">Typ zákazníka</Label>
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
                                            ? 'border-[#D97706] bg-[#D97706]/10 text-[#D97706]'
                                            : 'border-[#F5F0E8]/[0.06] text-[#9C9585] hover:border-white/20 hover:text-[#F5F0E8]/70',
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
                            className="group flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#F5F0E8]/[0.06] transition-colors hover:border-white/20"
                        >
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt="Avatar"
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <Upload className="h-5 w-5 text-[#6B6560] transition-colors group-hover:text-[#9C9585]" />
                            )}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                        <span className="text-xs text-[#6B6560]">Avatar</span>
                    </div>
                </div>
            </div>

            {/* Basic info */}
            <div className="rounded-xl border border-[#F5F0E8]/[0.05] bg-[#16140f] p-6">
                <h3 className="mb-4 text-sm font-semibold text-[#F5F0E8]/70">
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
                    {data.type === 'pravnicka' && (
                        <Field
                            label="Společnost"
                            value={data.company}
                            onChange={(v) => setData('company', v)}
                            error={errors.company}
                            placeholder="Název společnosti"
                        />
                    )}
                    <Field
                        label="IČO"
                        value={data.ico}
                        onChange={(v) => setData('ico', v)}
                        error={errors.ico}
                        placeholder="12345678"
                        maxLength={8}
                    />
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
            <div className="rounded-xl border border-[#F5F0E8]/[0.05] bg-[#16140f] p-6">
                <h3 className="mb-4 text-sm font-semibold text-[#F5F0E8]/70">
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
                    <Field
                        label="Telefon"
                        value={data.phone}
                        onChange={(v) => setData('phone', v)}
                        error={errors.phone}
                        placeholder="+420 123 456 789"
                        type="tel"
                    />
                    <Field
                        label="Web"
                        value={data.web}
                        onChange={(v) => setData('web', v)}
                        error={errors.web}
                        placeholder="https://example.com"
                        type="url"
                    />
                </div>
            </div>

            {/* Billing address */}
            <div className="rounded-xl border border-[#F5F0E8]/[0.05] bg-[#16140f] p-6">
                <h3 className="mb-4 text-sm font-semibold text-[#F5F0E8]/70">
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
            <div className="rounded-xl border border-[#F5F0E8]/[0.05] bg-[#16140f] p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#F5F0E8]/70">
                        Doručovací adresa
                    </h3>
                    <label className="flex items-center gap-2 text-sm text-[#9C9585]">
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
            <div className="rounded-xl border border-[#F5F0E8]/[0.05] bg-[#16140f] p-6">
                <h3 className="mb-4 text-sm font-semibold text-[#F5F0E8]/70">Štítky</h3>
                <div className="space-y-3">
                    <Input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={handleTagKeyDown}
                        placeholder="Napište štítek a stiskněte Enter..."
                        className="border-[#F5F0E8]/[0.06] bg-[#F5F0E8]/[0.04]"
                    />
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
                                        className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-white/10"
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
            <div className="rounded-xl border border-[#F5F0E8]/[0.05] bg-[#16140f] p-6">
                <h3 className="mb-4 text-sm font-semibold text-[#F5F0E8]/70">
                    Poznámky
                </h3>
                <Textarea
                    value={data.notes}
                    onChange={(e) => setData('notes', e.target.value)}
                    placeholder="Interní poznámky k zákazníkovi..."
                    className="min-h-24 border-[#F5F0E8]/[0.06] bg-[#F5F0E8]/[0.04]"
                />
                <FieldError error={errors.notes} />
            </div>

            {/* Submit */}
            <div className="flex items-center justify-end gap-3">
                <Button
                    type="button"
                    variant="ghost"
                    className="text-[#9C9585] hover:text-[#F5F0E8]"
                    onClick={handleCancel}
                >
                    Zrušit
                </Button>
                <Separator orientation="vertical" className="h-6 bg-white/10" />
                <Button
                    type="submit"
                    disabled={processing}
                    className="bg-[#D97706] text-white hover:bg-[#B45309]"
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
            <Label className="text-[#9C9585]">{label}</Label>
            <Input
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                maxLength={maxLength}
                className="border-[#F5F0E8]/[0.06] bg-[#F5F0E8]/[0.04]"
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
