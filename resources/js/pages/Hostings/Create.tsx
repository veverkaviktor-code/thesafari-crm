import { type FormEvent } from 'react';
import { useForm, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import HostingForm, {
    defaultHostingData,
    type HostingFormData,
} from '@/components/hostings/HostingForm';

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

interface HostingForRedirect {
    id: number;
    name: string;
}

interface Props {
    customers: Customer[];
    vpsServers: VpsServerOption[];
    managementPlans: ManagementPlanOption[];
    hostingsForRedirect: HostingForRedirect[];
}

export default function HostingsCreate({ customers, vpsServers, managementPlans, hostingsForRedirect }: Props) {
    const form = useForm<HostingFormData>({
        ...defaultHostingData,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/hostingy');
    };

    return (
        <AuthenticatedLayout
            title="Nový hosting"
            breadcrumbs={[
                { label: 'Hostingy', href: '/hostingy' },
                { label: 'Nový hosting' },
            ]}
        >
            <div className="p-6 max-w-2xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => router.visit('/hostingy')}
                    className="text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Zpět
                </Button>

                <div className="bg-card rounded-xl border border-border p-6">
                    <HostingForm
                        form={form}
                        onSubmit={handleSubmit}
                        submitLabel="Uložit"
                        customers={customers}
                        vpsServers={vpsServers}
                        managementPlans={managementPlans}
                        hostingsForRedirect={hostingsForRedirect}
                        onCancel={() => router.visit('/hostingy')}
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
