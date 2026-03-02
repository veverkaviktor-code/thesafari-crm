import { type FormEvent } from 'react';
import { useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import OrderForm, {
    type OrderFormData,
    defaultOrderData,
} from '@/components/orders/OrderForm';

interface Order {
    id: number;
    title: string;
    customer_id: number;
    division: string;
    description: string | null;
    price: number;
    deadline: string | null;
}

interface Props {
    order: Order;
    customers: { id: number; name: string; company: string | null }[];
}

export default function Edit({ order, customers }: Props) {
    const form = useForm<OrderFormData>({
        ...defaultOrderData,
        customer_id: String(order.customer_id),
        division: order.division,
        title: order.title,
        description: order.description ?? '',
        price: String(order.price),
        deadline: order.deadline ?? '',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.put(`/zakazky/${order.id}`);
    };

    return (
        <AuthenticatedLayout
            title={`Upravit: ${order.title}`}
            breadcrumbs={[
                { label: 'Zakázky', href: '/zakazky' },
                { label: order.title, href: `/zakazky/${order.id}` },
                { label: 'Upravit' },
            ]}
        >
            <div className="mx-auto max-w-3xl">
                <h1 className="mb-6 text-2xl font-semibold text-white">
                    Upravit zakázku
                </h1>
                <OrderForm
                    form={form}
                    onSubmit={handleSubmit}
                    submitLabel="Uložit změny"
                    customers={customers ?? []}
                />
            </div>
        </AuthenticatedLayout>
    );
}
