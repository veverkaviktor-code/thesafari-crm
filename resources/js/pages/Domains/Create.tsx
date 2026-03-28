import { type FormEvent } from 'react';
import { useForm, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import DomainForm, {
    defaultDomainData,
    type DomainFormData,
} from '@/components/domains/DomainForm';

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface HostingOption {
    id: number;
    name: string;
}

interface Props {
    customers: Customer[];
    hostings: HostingOption[];
}

export default function DomainsCreate({ customers, hostings }: Props) {
    const form = useForm<DomainFormData>({
        ...defaultDomainData,
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/domeny');
    };

    return (
        <AuthenticatedLayout
            title="Nová doména"
            breadcrumbs={[
                { label: 'Domény', href: '/domeny' },
                { label: 'Nová doména' },
            ]}
        >
            <div className="p-6 max-w-2xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => router.visit('/domeny')}
                    className="text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Zpět
                </Button>

                <div className="bg-card rounded-xl border border-border p-6">
                    <DomainForm
                        form={form}
                        onSubmit={handleSubmit}
                        submitLabel="Uložit"
                        customers={customers}
                        hostings={hostings}
                        onCancel={() => router.visit('/domeny')}
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
