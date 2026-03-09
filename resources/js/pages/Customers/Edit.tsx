import { type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import CustomerForm, {
    type CustomerFormData,
    defaultCustomerData,
} from '@/components/customers/CustomerForm';

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
}

interface Props {
    customer: Customer;
}

export default function Edit({ customer }: Props) {
    const form = useForm<CustomerFormData>({
        ...defaultCustomerData,
        type: customer.type,
        name: customer.name,
        company: customer.company ?? '',
        ico: customer.ico ?? '',
        dic: customer.dic ?? '',
        contact_person: customer.contact_person ?? '',
        email: customer.email ?? '',
        phone: customer.phone ?? '',
        web: customer.web ?? '',
        billing_street: customer.billing_street ?? '',
        billing_city: customer.billing_city ?? '',
        billing_zip: customer.billing_zip ?? '',
        billing_country: customer.billing_country ?? 'Česká republika',
        delivery_same: customer.delivery_same,
        delivery_street: customer.delivery_street ?? '',
        delivery_city: customer.delivery_city ?? '',
        delivery_zip: customer.delivery_zip ?? '',
        delivery_country: customer.delivery_country ?? 'Česká republika',
        notes: customer.notes ?? '',
        tags: customer.tags ?? [],
        avatar: null,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.put(`/zakaznici/${customer.id}`);
    };

    return (
        <AuthenticatedLayout
            title={`Upravit: ${customer.name}`}
            breadcrumbs={[
                { label: 'Zákazníci', href: '/zakaznici' },
                { label: customer.name, href: `/zakaznici/${customer.id}` },
                { label: 'Upravit' },
            ]}
        >
            <div className="mx-auto max-w-3xl">
                <h1 className="mb-6 text-2xl font-semibold text-foreground">
                    Upravit zákazníka
                </h1>
                <CustomerForm
                    form={form}
                    onSubmit={handleSubmit}
                    submitLabel="Uložit změny"
                />
            </div>
        </AuthenticatedLayout>
    );
}
