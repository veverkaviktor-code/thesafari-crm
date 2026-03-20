import { type FormEvent, useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import WebsiteForm, { type WebsiteFormData } from '@/components/webove-sluzby/WebsiteForm';

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface Website {
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

interface FolderOption {
    id: number;
    name: string;
}

interface ParentOption {
    id: number;
    name: string;
    type: string;
}

interface Props {
    website: Website & { folder_id?: number | null; parent_subscription_id?: number | null };
    customers: Customer[];
    folders?: FolderOption[];
    parentOptions?: ParentOption[];
}

export default function WeboveSluzbyEdit({ website, customers, folders = [], parentOptions = [] }: Props) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const form = useForm<WebsiteFormData>({
        type: website.type,
        customer_id: website.customer_id ? String(website.customer_id) : '',
        name: website.name,
        provider: website.provider || '',
        server: website.server || '',
        storage_quota_mb: String(website.storage_quota_mb || ''),
        price_yearly: String(website.price_yearly || ''),
        cost_yearly: String(website.cost_yearly || ''),
        sell_yearly: String(website.sell_yearly || ''),
        billing_cycle: website.billing_cycle || 'yearly',
        monthly_price: String(website.monthly_price || ''),
        monthly_plan: website.monthly_plan || '',
        starts_at: website.starts_at || '',
        expires_at: website.expires_at || '',
        auto_renew: website.auto_renew,
        auto_invoice: website.auto_invoice ?? true,
        is_free: website.is_free ?? false,
        is_external: website.is_external ?? false,
        status: website.status,
        notes: website.notes || '',
        admin_url: website.admin_url || '',
        admin_user: website.admin_user || '',
        admin_password: website.admin_password || '',
        client_user: website.client_user || '',
        client_password: website.client_password || '',
        folder_id: website.folder_id ? String(website.folder_id) : '',
        parent_subscription_id: website.parent_subscription_id ? String(website.parent_subscription_id) : '',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.put(`/webove-sluzby/${website.id}`);
    };

    const handleDelete = () => setShowDeleteConfirm(true);

    return (
        <AuthenticatedLayout
            title={`Upravit: ${website.name}`}
            breadcrumbs={[
                { label: 'Webové služby', href: '/webove-sluzby' },
                { label: website.name, href: `/webove-sluzby/${website.id}` },
                { label: 'Upravit' },
            ]}
        >
            <div className="p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.visit(`/webove-sluzby/${website.id}`)}
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
                    <WebsiteForm
                        form={form}
                        onSubmit={handleSubmit}
                        submitLabel="Uložit změny"
                        customers={customers}
                        folders={folders}
                        parentOptions={parentOptions}
                        onCancel={() => router.visit(`/webove-sluzby/${website.id}`)}
                    />
                </div>
            </div>
            <ConfirmDialog
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => router.delete(`/webove-sluzby/${website.id}`)}
                title="Smazat službu"
                message={`Opravdu chcete smazat "${website.name}"?`}
            />
        </AuthenticatedLayout>
    );
}
