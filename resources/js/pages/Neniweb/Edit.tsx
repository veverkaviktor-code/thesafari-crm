import { type FormEvent, useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import NeniwebForm, { type NeniwebFormData } from '@/components/neniweb/NeniwebForm';

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface Subscription {
    id: number;
    type: string;
    customer_id: number;
    name: string;
    provider: string | null;
    server: string | null;
    storage_quota_mb: number;
    price_yearly: number;
    cost_yearly: number;
    sell_yearly: number;
    billing_cycle: string;
    monthly_price: number;
    monthly_plan: string | null;
    starts_at: string;
    expires_at: string;
    auto_renew: boolean;
    auto_invoice: boolean;
    is_free: boolean;
    is_external: boolean;
    status: string;
    notes: string | null;
    admin_url: string | null;
    admin_user: string | null;
    admin_password: string | null;
    client_user: string | null;
    client_password: string | null;
}

interface Props {
    subscription: Subscription;
    customers: Customer[];
}

export default function NeniwebEdit({ subscription, customers }: Props) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const form = useForm<NeniwebFormData>({
        type: subscription.type,
        customer_id: subscription.customer_id ? String(subscription.customer_id) : '',
        name: subscription.name,
        provider: subscription.provider || '',
        server: subscription.server || '',
        storage_quota_mb: String(subscription.storage_quota_mb || ''),
        price_yearly: String(subscription.price_yearly || ''),
        cost_yearly: String(subscription.cost_yearly || ''),
        sell_yearly: String(subscription.sell_yearly || ''),
        billing_cycle: subscription.billing_cycle || 'yearly',
        monthly_price: String(subscription.monthly_price || ''),
        monthly_plan: subscription.monthly_plan || '',
        starts_at: subscription.starts_at || '',
        expires_at: subscription.expires_at || '',
        auto_renew: subscription.auto_renew,
        auto_invoice: subscription.auto_invoice ?? true,
        is_free: subscription.is_free ?? false,
        is_external: subscription.is_external ?? false,
        status: subscription.status,
        notes: subscription.notes || '',
        admin_url: subscription.admin_url || '',
        admin_user: subscription.admin_user || '',
        admin_password: subscription.admin_password || '',
        client_user: subscription.client_user || '',
        client_password: subscription.client_password || '',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.put(`/neniweb/${subscription.id}`);
    };

    const handleDelete = () => setShowDeleteConfirm(true);

    return (
        <AuthenticatedLayout
            title={`Upravit: ${subscription.name}`}
            breadcrumbs={[
                { label: 'Webové služby', href: '/neniweb' },
                { label: subscription.name, href: `/neniweb/${subscription.id}` },
                { label: 'Upravit' },
            ]}
        >
            <div className="p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.visit(`/neniweb/${subscription.id}`)}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Zpět
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={handleDelete}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Smazat
                    </Button>
                </div>

                <div className="bg-card rounded-xl border border-border p-6">
                    <NeniwebForm
                        form={form}
                        onSubmit={handleSubmit}
                        submitLabel="Uložit změny"
                        customers={customers}
                        onCancel={() => router.visit(`/neniweb/${subscription.id}`)}
                    />
                </div>
            </div>
            <ConfirmDialog
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => router.delete(`/neniweb/${subscription.id}`)}
                title="Smazat službu"
                message={`Opravdu chcete smazat "${subscription.name}"?`}
            />
        </AuthenticatedLayout>
    );
}
