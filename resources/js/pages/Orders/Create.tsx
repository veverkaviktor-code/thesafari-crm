import { type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import OrderForm, {
    type OrderFormData,
    defaultOrderData,
} from '@/components/orders/OrderForm';

interface Props {
    customers: { id: number; name: string; company: string | null }[];
}

export default function Create({ customers }: Props) {
    const form = useForm<OrderFormData>({ ...defaultOrderData });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/zakazky');
    };

    return (
        <AuthenticatedLayout
            title="Nová zakázka"
            breadcrumbs={[
                { label: 'Zakázky', href: '/zakazky' },
                { label: 'Nová zakázka' },
            ]}
        >
            <div className="mx-auto max-w-3xl">
                <h1 className="mb-6 text-2xl font-semibold text-foreground">
                    Nová zakázka
                </h1>
                <OrderForm
                    form={form}
                    onSubmit={handleSubmit}
                    submitLabel="Vytvořit zakázku"
                    customers={customers ?? []}
                />
            </div>
        </AuthenticatedLayout>
    );
}
