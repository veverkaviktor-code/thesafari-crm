import { type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import CustomerForm, {
    type CustomerFormData,
    defaultCustomerData,
} from '@/components/customers/CustomerForm';

export default function Create() {
    const form = useForm<CustomerFormData>({ ...defaultCustomerData });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/zakaznici');
    };

    return (
        <AuthenticatedLayout
            title="Nový zákazník"
            breadcrumbs={[
                { label: 'Zákazníci', href: '/zakaznici' },
                { label: 'Nový zákazník' },
            ]}
        >
            <div className="mx-auto max-w-3xl">
                <h1 className="mb-6 text-2xl font-semibold text-foreground">
                    Nový zákazník
                </h1>
                <CustomerForm
                    form={form}
                    onSubmit={handleSubmit}
                    submitLabel="Vytvořit zákazníka"
                />
            </div>
        </AuthenticatedLayout>
    );
}
