import { type FormEvent } from 'react';
import { useForm, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import WebsiteForm, {
    defaultWebsiteData,
    type WebsiteFormData,
} from '@/components/webove-sluzby/WebsiteForm';

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

interface Props {
    customers: Customer[];
    vpsServers: VpsServerOption[];
    managementPlans: ManagementPlanOption[];
    aliasOptions: AliasOption[];
}

export default function WeboveSluzbyCreate({ customers, vpsServers, managementPlans, aliasOptions }: Props) {
    const form = useForm<WebsiteFormData>({
        ...defaultWebsiteData,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/webove-sluzby');
    };

    return (
        <AuthenticatedLayout
            title="Nový web"
            breadcrumbs={[
                { label: 'Webové služby', href: '/webove-sluzby' },
                { label: 'Nový web' },
            ]}
        >
            <div className="p-6 max-w-2xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => router.visit('/webove-sluzby')}
                    className="text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Zpět
                </Button>

                <div className="bg-card rounded-xl border border-border p-6">
                    <WebsiteForm
                        form={form}
                        onSubmit={handleSubmit}
                        submitLabel="Uložit"
                        customers={customers}
                        vpsServers={vpsServers}
                        managementPlans={managementPlans}
                        aliasOptions={aliasOptions}
                        onCancel={() => router.visit('/webove-sluzby')}
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
