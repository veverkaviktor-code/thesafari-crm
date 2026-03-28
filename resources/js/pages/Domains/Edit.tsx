import { type FormEvent, useState } from 'react';
import { useForm, router } from '@inertiajs/react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import DomainForm, { type DomainFormData } from '@/components/domains/DomainForm';

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface HostingOption {
    id: number;
    name: string;
}

interface Domain {
    id: number;
    customer_id: number | null;
    hosting_id: number | null;
    name: string;
    registrar: string;
    expires_at: string | null;
    is_registered_by_us: boolean;
    sell_yearly: string;
    cost_yearly: string;
    auto_invoice: boolean;
    status: string;
    notes: string | null;
}

interface Props {
    domain: Domain;
    customers: Customer[];
    hostings: HostingOption[];
}

export default function DomainsEdit({ domain, customers, hostings }: Props) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const form = useForm<DomainFormData>({
        name: domain.name,
        customer_id: domain.customer_id ? String(domain.customer_id) : '',
        hosting_id: domain.hosting_id ? String(domain.hosting_id) : '',
        registrar: domain.registrar || 'vas-hosting',
        expires_at: domain.expires_at || '',
        is_registered_by_us: domain.is_registered_by_us ?? true,
        sell_yearly: String(domain.sell_yearly || ''),
        cost_yearly: String(domain.cost_yearly || ''),
        auto_invoice: domain.auto_invoice ?? false,
        status: domain.status || 'aktivni',
        notes: domain.notes || '',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.put(`/domeny/${domain.id}`);
    };

    const handleDelete = () => setShowDeleteConfirm(true);

    return (
        <AuthenticatedLayout
            title={`Upravit: ${domain.name}`}
            breadcrumbs={[
                { label: 'Domény', href: '/domeny' },
                { label: domain.name, href: `/domeny/${domain.id}` },
                { label: 'Upravit' },
            ]}
        >
            <div className="p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.visit(`/domeny/${domain.id}`)}
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
                    <DomainForm
                        form={form}
                        onSubmit={handleSubmit}
                        submitLabel="Uložit změny"
                        customers={customers}
                        hostings={hostings}
                        onCancel={() => router.visit(`/domeny/${domain.id}`)}
                    />
                </div>
            </div>
            <ConfirmDialog
                open={showDeleteConfirm}
                onClose={() => setShowDeleteConfirm(false)}
                onConfirm={() => router.delete(`/domeny/${domain.id}`)}
                title="Smazat doménu"
                message={`Opravdu chcete smazat doménu "${domain.name}"?`}
            />
        </AuthenticatedLayout>
    );
}
