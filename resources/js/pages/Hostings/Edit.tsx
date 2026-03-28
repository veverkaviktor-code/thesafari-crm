import { type FormEvent, useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import HostingForm, { type HostingFormData } from '@/components/hostings/HostingForm';

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

interface Hosting {
    id: number;
    customer_id: number | null;
    name: string;
    server: string | null;
    status: string;
    notes: string | null;
    starts_at: string | null;
    auto_invoice: boolean;
    auto_invoice_management: boolean;
    is_free: boolean;
    sell_yearly: number;
    cost_yearly: number;
    admin_url: string | null;
    hosting_expires_at: string | null;
    hosting_server_id: number | null;
    management_plan_id: number | null;
    management_cycle: string | null;
    storage_quota_mb: number;
}

interface Props {
    hosting: Hosting;
    customers: Customer[];
    vpsServers: VpsServerOption[];
    managementPlans: ManagementPlanOption[];
}

export default function HostingsEdit({ hosting, customers, vpsServers, managementPlans }: Props) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const form = useForm<HostingFormData>({
        customer_id: hosting.customer_id ? String(hosting.customer_id) : '',
        name: hosting.name,
        server: hosting.server || '',
        status: hosting.status,
        notes: hosting.notes || '',
        starts_at: hosting.starts_at || '',
        auto_invoice: hosting.auto_invoice ?? true,
        auto_invoice_management: hosting.auto_invoice_management ?? false,
        is_free: hosting.is_free ?? false,
        sell_yearly: String(hosting.sell_yearly || ''),
        cost_yearly: String(hosting.cost_yearly || ''),
        admin_url: hosting.admin_url || '',
        hosting_expires_at: hosting.hosting_expires_at || '',
        hosting_server_id: hosting.hosting_server_id ? String(hosting.hosting_server_id) : '',
        management_plan_id: hosting.management_plan_id ? String(hosting.management_plan_id) : '',
        management_cycle: hosting.management_cycle || '',
        storage_quota_mb: String(hosting.storage_quota_mb || ''),
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.put(`/hostingy/${hosting.id}`);
    };

    const handleDelete = () => setShowDeleteConfirm(true);

    return (
        <AuthenticatedLayout
            title={`Upravit: ${hosting.name}`}
            breadcrumbs={[
                { label: 'Hostingy', href: '/hostingy' },
                { label: hosting.name, href: `/hostingy/${hosting.id}` },
                { label: 'Upravit' },
            ]}
        >
            <div className="p-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.visit(`/hostingy/${hosting.id}`)}
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
                    <HostingForm
                        form={form}
                        onSubmit={handleSubmit}
                        submitLabel="Uložit změny"
                        customers={customers}
                        vpsServers={vpsServers}
                        managementPlans={managementPlans}
                        onCancel={() => router.visit(`/hostingy/${hosting.id}`)}
                    />
                </div>
            </div>
            <ConfirmDialog
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => router.delete(`/hostingy/${hosting.id}`)}
                title="Smazat hosting"
                message={`Opravdu chcete smazat "${hosting.name}"?`}
            />
        </AuthenticatedLayout>
    );
}
