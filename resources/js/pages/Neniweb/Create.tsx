import { type FormEvent } from 'react';
import { useForm, router } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import NeniwebForm, {
    defaultNeniwebData,
    type NeniwebFormData,
} from '@/components/neniweb/NeniwebForm';

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface Props {
    customers: Customer[];
    type?: string;
}

export default function NeniwebCreate({ customers, type: initialType }: Props) {
    const form = useForm<NeniwebFormData>({
        ...defaultNeniwebData,
        type: initialType || 'domena',
    });

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/neniweb');
    };

    const isDomain = form.data.type === 'domena';

    return (
        <AuthenticatedLayout
            title={isDomain ? 'Nová doména' : 'Nový hosting'}
            breadcrumbs={[
                { label: 'Webové služby', href: '/neniweb' },
                { label: isDomain ? 'Nová doména' : 'Nový hosting' },
            ]}
        >
            <div className="p-6 max-w-2xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => router.visit('/neniweb')}
                    className="text-muted-foreground hover:text-foreground mb-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Zpět
                </Button>

                <div className="bg-card rounded-xl border border-border p-6">
                    <NeniwebForm
                        form={form}
                        onSubmit={handleSubmit}
                        submitLabel="Uložit"
                        customers={customers}
                        onCancel={() => router.visit('/neniweb')}
                    />
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
