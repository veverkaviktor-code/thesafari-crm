import { Link, router } from '@inertiajs/react';
import {
    Building2,
    Globe,
    Mail,
    MapPin,
    Pencil,
    Phone,
    Trash2,
    User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface Customer {
    id: number;
    name: string;
    type: 'fyzicka' | 'pravnicka';
    company: string | null;
    ico: string | null;
    dic: string | null;
    contact_person: string | null;
    email: string | null;
    phone: string | null;
    web: string | null;
    billing_street: string | null;
    billing_city: string | null;
    billing_zip: string | null;
    billing_country: string | null;
    delivery_same: boolean;
    delivery_street: string | null;
    delivery_city: string | null;
    delivery_zip: string | null;
    delivery_country: string | null;
    notes: string | null;
    tags: string[];
    created_at: string;
}

const TAG_COLORS = [
    'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    'bg-violet-500/20 text-violet-400 border-violet-500/30',
    'bg-rose-500/20 text-rose-400 border-rose-500/30',
    'bg-amber-500/20 text-amber-400 border-amber-500/30',
    'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
];

interface Props {
    customer: Customer;
}

export default function CustomerProfile({ customer }: Props) {
    const initials = customer.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const handleDelete = () => {
        if (confirm('Opravdu chcete smazat tohoto zákazníka?')) {
            router.delete(`/zakaznici/${customer.id}`);
        }
    };

    const billingAddress = formatAddress(
        customer.billing_street,
        customer.billing_city,
        customer.billing_zip,
        customer.billing_country,
    );

    const deliveryAddress = customer.delivery_same
        ? null
        : formatAddress(
              customer.delivery_street,
              customer.delivery_city,
              customer.delivery_zip,
              customer.delivery_country,
          );

    return (
        <div className="rounded-xl border border-white/5 bg-[#1a1a22] overflow-hidden">
            {/* Banner + Avatar */}
            <div className="relative h-24 bg-gradient-to-r from-[#D97706]/20 via-[#1a1a22] to-[#1a1a22]">
                <div className="absolute -bottom-8 left-6">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-[#1a1a22] bg-[#D97706] text-xl font-bold text-white">
                        {initials}
                    </div>
                </div>
            </div>

            <div className="px-6 pb-6 pt-12">
                {/* Name + actions */}
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-white">
                            {customer.name}
                        </h2>
                        {customer.company && (
                            <p className="text-sm text-gray-400">
                                {customer.company}
                            </p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">
                            Zákazník od{' '}
                            {new Date(customer.created_at).toLocaleDateString(
                                'cs-CZ',
                            )}
                        </p>
                    </div>
                    <div className="flex gap-1">
                        <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            className="text-gray-400 hover:text-white"
                        >
                            <Link href={`/zakaznici/${customer.id}/upravit`}>
                                <Pencil className="h-4 w-4" />
                            </Link>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-gray-400 hover:text-red-400"
                            onClick={handleDelete}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Tags */}
                {customer.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {customer.tags.map((tag, i) => (
                            <span
                                key={tag}
                                className={cn(
                                    'inline-flex rounded-full border px-2 py-0.5 text-xs font-medium',
                                    TAG_COLORS[i % TAG_COLORS.length],
                                )}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Notes */}
                {customer.notes && (
                    <p className="mt-4 rounded-lg bg-white/5 p-3 text-sm text-gray-400">
                        {customer.notes}
                    </p>
                )}

                <Separator className="my-5 bg-white/5" />

                {/* Contact info grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                    <InfoItem
                        icon={Mail}
                        label="E-mail"
                        value={customer.email}
                        href={customer.email ? `mailto:${customer.email}` : undefined}
                    />
                    <InfoItem
                        icon={Phone}
                        label="Telefon"
                        value={customer.phone}
                        href={customer.phone ? `tel:${customer.phone}` : undefined}
                    />
                    <InfoItem
                        icon={Globe}
                        label="Web"
                        value={customer.web}
                        href={customer.web ?? undefined}
                        external
                    />
                    <InfoItem
                        icon={User}
                        label="Kontaktní osoba"
                        value={customer.contact_person}
                    />
                </div>

                {/* Business info */}
                {(customer.ico || customer.dic) && (
                    <>
                        <Separator className="my-5 bg-white/5" />
                        <div className="grid gap-3 sm:grid-cols-2">
                            <InfoItem
                                icon={Building2}
                                label="IČO"
                                value={customer.ico}
                            />
                            <InfoItem
                                icon={Building2}
                                label="DIČ"
                                value={customer.dic}
                            />
                        </div>
                    </>
                )}

                {/* Addresses */}
                {billingAddress && (
                    <>
                        <Separator className="my-5 bg-white/5" />
                        <div className="grid gap-3 sm:grid-cols-2">
                            <InfoItem
                                icon={MapPin}
                                label="Fakturační adresa"
                                value={billingAddress}
                            />
                            {deliveryAddress && (
                                <InfoItem
                                    icon={MapPin}
                                    label="Doručovací adresa"
                                    value={deliveryAddress}
                                />
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

function InfoItem({
    icon: Icon,
    label,
    value,
    href,
    external,
}: {
    icon: React.ElementType;
    label: string;
    value: string | null;
    href?: string;
    external?: boolean;
}) {
    return (
        <div className="flex items-start gap-3 rounded-lg bg-white/[0.03] p-3">
            <Icon className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
            <div className="min-w-0">
                <p className="text-xs text-gray-500">{label}</p>
                {value ? (
                    href ? (
                        <a
                            href={href}
                            className="text-sm text-[#D97706] hover:underline"
                            {...(external
                                ? { target: '_blank', rel: 'noopener noreferrer' }
                                : {})}
                        >
                            {value}
                        </a>
                    ) : (
                        <p className="text-sm text-gray-300">{value}</p>
                    )
                ) : (
                    <p className="text-sm text-gray-600">—</p>
                )}
            </div>
        </div>
    );
}

function formatAddress(
    street: string | null,
    city: string | null,
    zip: string | null,
    country: string | null,
): string | null {
    const parts = [street, [zip, city].filter(Boolean).join(' '), country].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
}
