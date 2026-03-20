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

interface VpsServerOption {
    id: number;
    name: string;
}

interface ManagementPlanOption {
    id: number;
    name: string;
    price_monthly: number | string;
    is_active: boolean;
}

interface AliasOption {
    id: number;
    name: string;
}

interface Website {
    id: number;
    customer_id: number | null;
    name: string;
    server: string | null;
    status: string;
    notes: string | null;
    starts_at: string | null;
    is_registered_by_us: boolean;
    auto_renew: boolean;
    auto_invoice: boolean;
    auto_invoice_management: boolean;
    is_free: boolean;
    is_external: boolean;
    sell_yearly: number;
    cost_yearly: number;
    admin_url: string | null;
    domain_expires_at: string | null;
    hosting_expires_at: string | null;
    hosting_server_id: number | null;
    alias_of_id: number | null;
    management_plan_id: number | null;
    management_cycle: string | null;
    storage_quota_mb: number;
}

interface Props {
    website: Website;
    customers: Customer[];
    vpsServers: VpsServerOption[];
    managementPlans: ManagementPlanOption[];
    aliasOptions: AliasOption[];
}

export default function WeboveSluzbyEdit({ website, customers, vpsServers, managementPlans, aliasOptions }: Props) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const form = useForm<WebsiteFormData>({
        customer_id: website.customer_id ? String(website.customer_id) : '',
        name: website.name,
        server: website.server || '',
        status: website.status,
        notes: website.notes || '',
        starts_at: website.starts_at || '',
        is_registered_by_us: website.is_registered_by_us ?? true,
        auto_renew: website.auto_renew ?? true,
        auto_invoice: website.auto_invoice ?? true,
        auto_invoice_management: website.auto_invoice_management ?? false,
        is_free: website.is_free ?? false,
        is_external: website.is_external ?? false,
        sell_yearly: String(website.sell_yearly || ''),
        cost_yearly: String(website.cost_yearly || ''),
        admin_url: website.admin_url || '',
        domain_expires_at: website.domain_expires_at || '',
        hosting_expires_at: website.hosting_expires_at || '',
        hosting_server_id: website.hosting_server_id ? String(website.hosting_server_id) : '',
        alias_of_id: website.alias_of_id ? String(website.alias_of_id) : '',
        management_plan_id: website.management_plan_id ? String(website.management_plan_id) : '',
        management_cycle: website.management_cycle || '',
        storage_quota_mb: String(website.storage_quota_mb || ''),
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
                        vpsServers={vpsServers}
                        managementPlans={managementPlans}
                        aliasOptions={aliasOptions}
                        onCancel={() => router.visit(`/webove-sluzby/${website.id}`)}
                    />
                </div>
            </div>
            <ConfirmDialog
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => router.delete(`/webove-sluzby/${website.id}`)}
                title="Smazat web"
                message={`Opravdu chcete smazat "${website.name}"?`}
            />
        </AuthenticatedLayout>
    );
}
