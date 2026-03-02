import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import CustomerProfile from '@/components/customers/CustomerProfile';
import CustomerServices from '@/components/customers/CustomerServices';
import CustomerMiniDashboard from '@/components/customers/CustomerMiniDashboard';
import CustomerTabs from '@/components/customers/CustomerTabs';

interface Props {
    customer: {
        id: number;
        name: string;
        type: 'fyzicka' | 'pravnicka';
        company: string | null;
        ico: string | null;
        dic: string | null;
        contact_person: string | null;
        email: string | null;
        phone: string | null;
        web: string | null;
        billing_street: string | null;
        billing_city: string | null;
        billing_zip: string | null;
        billing_country: string | null;
        delivery_same: boolean;
        delivery_street: string | null;
        delivery_city: string | null;
        delivery_zip: string | null;
        delivery_country: string | null;
        notes: string | null;
        tags: string[];
        created_at: string;
        subscriptions: {
            id: number;
            service_type: string;
            name: string;
            status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled';
            expires_at: string | null;
        }[];
    };
    stats: {
        orders_count: number;
        total_revenue: number;
        total_costs: number;
        profit: number;
    };
    orders: {
        id: number;
        title: string;
        status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled';
        total_price: number;
        created_at: string;
    }[];
    invoices: {
        id: number;
        number: string;
        status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled';
        amount: number;
        due_date: string;
    }[];
    requirements: {
        id: number;
        subject: string;
        status: 'active' | 'inactive' | 'pending' | 'completed' | 'cancelled';
        priority: string;
        created_at: string;
    }[];
    files: {
        id: number;
        name: string;
        size: string;
        uploaded_at: string;
    }[];
}

export default function Show({
    customer,
    stats,
    orders,
    invoices,
    requirements,
    files,
}: Props) {
    return (
        <AuthenticatedLayout
            title={customer.name}
            breadcrumbs={[
                { label: 'Zákazníci', href: '/zakaznici' },
                { label: customer.name },
            ]}
        >
            <div className="space-y-6">
                {/* Top: Profile + Sidebar */}
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <CustomerProfile customer={customer} />
                    </div>
                    <div className="space-y-6">
                        <CustomerServices
                            subscriptions={customer.subscriptions ?? []}
                        />
                        <CustomerMiniDashboard
                            stats={
                                stats ?? {
                                    orders_count: 0,
                                    total_revenue: 0,
                                    total_costs: 0,
                                    profit: 0,
                                }
                            }
                        />
                    </div>
                </div>

                {/* Bottom: Tabs */}
                <CustomerTabs
                    orders={orders ?? []}
                    invoices={invoices ?? []}
                    requirements={requirements ?? []}
                    files={files ?? []}
                />
            </div>
        </AuthenticatedLayout>
    );
}
