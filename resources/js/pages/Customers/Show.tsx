import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import CustomerProfile from '@/components/customers/CustomerProfile';
import CustomerMiniDashboard from '@/components/customers/CustomerMiniDashboard';
import CustomerTabs from '@/components/customers/CustomerTabs';
import { type AttachmentData } from '@/components/AttachmentList';

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
            type: 'hosting' | 'domena' | 'sluzba';
            name: string;
            status: string;
            expires_at: string | null;
        }[];
    };
    stats: {
        orders_count: number;
        total_revenue: number;
        total_costs: number;
        profit: number;
        invoiced: number;
        paid: number;
        uninvoiced: number;
        active_subscriptions: number;
        vps_yearly: number;
    };
    vpsServers: {
        id: number;
        name: string;
        status: string;
        price_yearly: number;
        hostings_count: number;
    }[];
    orders: {
        id: number;
        title: string;
        division: string;
        status: string;
        price: number;
        deadline: string | null;
        created_at: string;
    }[];
    invoices: {
        id: number;
        invoice_number: string;
        status: string;
        total: number;
        due_date: string;
    }[];
    orderAttachments: (AttachmentData & { order_id: number; order_title: string })[];
}

export default function Show({
    customer,
    stats,
    orders,
    invoices,
    vpsServers,
    orderAttachments,
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
                <div className="grid gap-6 lg:grid-cols-3 items-start">
                    <div className="lg:col-span-2">
                        <CustomerProfile customer={customer} />
                    </div>
                    <div className="sticky top-24">
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

                {/* Bottom: 3 columns */}
                <CustomerTabs
                    orders={orders ?? []}
                    invoices={invoices ?? []}
                    subscriptions={customer.subscriptions ?? []}
                    vpsServers={vpsServers ?? []}
                    orderAttachments={orderAttachments ?? []}
                />
            </div>
        </AuthenticatedLayout>
    );
}
