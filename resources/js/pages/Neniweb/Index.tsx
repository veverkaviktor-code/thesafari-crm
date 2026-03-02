import { type FormEvent, useState } from 'react';
import { router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import DataTable from '@/components/ui/DataTable';
import ExpirationBadge from '@/components/neniweb/ExpirationBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GlassModal from '@/components/ui/GlassModal';
import NeniwebForm, {
    defaultNeniwebData,
    type NeniwebFormData,
} from '@/components/neniweb/NeniwebForm';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Globe, Server, Plus } from 'lucide-react';

interface Subscription {
    id: number;
    type: 'hosting' | 'domena';
    name: string;
    customer: { id: number; name: string; company: string | null } | null;
    provider: string | null;
    server: string | null;
    price_yearly: number;
    starts_at: string;
    expires_at: string;
    auto_renew: boolean;
    status: string;
}

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface Props {
    domains: {
        data: Subscription[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    hostings: {
        data: Subscription[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    customers: Customer[];
    filters: {
        tab?: string;
        search?: string;
        sort_by?: string;
        sort_dir?: string;
    };
}

const statusMap: Record<string, { label: string; variant: string }> = {
    aktivni: { label: 'Aktivní', variant: 'active' },
    neaktivni: { label: 'Neaktivní', variant: 'inactive' },
    expirovana: { label: 'Expirovaná', variant: 'cancelled' },
};

const domainColumns = [
    {
        key: 'name' as const,
        label: 'Doména',
        sortable: true,
        render: (sub: Subscription) => (
            <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-amber-500" />
                <span className="font-medium text-[#F5F0E8]/85">{sub.name}</span>
            </div>
        ),
    },
    {
        key: 'customer' as const,
        label: 'Zákazník',
        render: (sub: Subscription) => (
            <span className="text-[#F5F0E8]/70">
                {sub.customer
                    ? sub.customer.company || sub.customer.name
                    : '—'}
            </span>
        ),
    },
    {
        key: 'provider' as const,
        label: 'Registrár',
        render: (sub: Subscription) => (
            <span className="text-[#9C9585] text-sm">
                {sub.provider || '—'}
            </span>
        ),
    },
    {
        key: 'expires_at' as const,
        label: 'Expirace',
        sortable: true,
        render: (sub: Subscription) => (
            <div className="flex items-center gap-2">
                <span className="text-sm text-[#9C9585]">
                    {format(new Date(sub.expires_at), 'd. M. yyyy', {
                        locale: cs,
                    })}
                </span>
                <ExpirationBadge expiresAt={sub.expires_at} />
            </div>
        ),
    },
    {
        key: 'auto_renew' as const,
        label: 'Auto-renew',
        render: (sub: Subscription) => (
            <span
                className={`text-sm ${sub.auto_renew ? 'text-green-400' : 'text-[#6B6560]'}`}
            >
                {sub.auto_renew ? 'Ano' : 'Ne'}
            </span>
        ),
    },
    {
        key: 'price_yearly' as const,
        label: 'Roční cena',
        sortable: true,
        render: (sub: Subscription) => (
            <span className="text-sm text-[#F5F0E8]/70">
                {new Intl.NumberFormat('cs-CZ', {
                    style: 'currency',
                    currency: 'CZK',
                    maximumFractionDigits: 0,
                }).format(sub.price_yearly)}
            </span>
        ),
    },
    {
        key: 'status' as const,
        label: 'Stav',
        render: (sub: Subscription) => {
            const s = statusMap[sub.status];
            return s ? (
                <StatusBadge status={s.variant}>{s.label}</StatusBadge>
            ) : (
                <span>{sub.status}</span>
            );
        },
    },
];

const hostingColumns = [
    {
        key: 'name' as const,
        label: 'Hosting',
        sortable: true,
        render: (sub: Subscription) => (
            <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-blue-400" />
                <span className="font-medium text-[#F5F0E8]/85">{sub.name}</span>
            </div>
        ),
    },
    {
        key: 'customer' as const,
        label: 'Zákazník',
        render: (sub: Subscription) => (
            <span className="text-[#F5F0E8]/70">
                {sub.customer
                    ? sub.customer.company || sub.customer.name
                    : '—'}
            </span>
        ),
    },
    {
        key: 'server' as const,
        label: 'Server',
        render: (sub: Subscription) => (
            <span className="text-[#9C9585] text-sm">{sub.server || '—'}</span>
        ),
    },
    {
        key: 'expires_at' as const,
        label: 'Expirace',
        sortable: true,
        render: (sub: Subscription) => (
            <div className="flex items-center gap-2">
                <span className="text-sm text-[#9C9585]">
                    {format(new Date(sub.expires_at), 'd. M. yyyy', {
                        locale: cs,
                    })}
                </span>
                <ExpirationBadge expiresAt={sub.expires_at} />
            </div>
        ),
    },
    {
        key: 'auto_renew' as const,
        label: 'Auto-renew',
        render: (sub: Subscription) => (
            <span
                className={`text-sm ${sub.auto_renew ? 'text-green-400' : 'text-[#6B6560]'}`}
            >
                {sub.auto_renew ? 'Ano' : 'Ne'}
            </span>
        ),
    },
    {
        key: 'price_yearly' as const,
        label: 'Roční cena',
        sortable: true,
        render: (sub: Subscription) => (
            <span className="text-sm text-[#F5F0E8]/70">
                {new Intl.NumberFormat('cs-CZ', {
                    style: 'currency',
                    currency: 'CZK',
                    maximumFractionDigits: 0,
                }).format(sub.price_yearly)}
            </span>
        ),
    },
    {
        key: 'status' as const,
        label: 'Stav',
        render: (sub: Subscription) => {
            const s = statusMap[sub.status];
            return s ? (
                <StatusBadge status={s.variant}>{s.label}</StatusBadge>
            ) : (
                <span>{sub.status}</span>
            );
        },
    },
];

export default function NeniwebIndex({
    domains,
    hostings,
    customers,
    filters,
}: Props) {
    const [activeTab, setActiveTab] = useState(filters.tab || 'domeny');
    const [showCreate, setShowCreate] = useState(false);

    const form = useForm<NeniwebFormData>({
        ...defaultNeniwebData,
        type: activeTab === 'domeny' ? 'domena' : 'hosting',
    });

    const handleCreateSubmit = (e: FormEvent) => {
        e.preventDefault();
        form.post('/neniweb', {
            onSuccess: () => {
                setShowCreate(false);
                form.reset();
            },
        });
    };

    const handleOpenCreate = () => {
        form.setData('type', activeTab === 'domeny' ? 'domena' : 'hosting');
        setShowCreate(true);
    };

    function navigate(params: Record<string, string>) {
        const merged: Record<string, string> = { tab: activeTab, ...params };
        Object.keys(merged).forEach((k) => {
            if (!merged[k] || merged[k] === '') delete merged[k];
        });
        router.get('/neniweb', merged, { preserveState: true });
    }

    return (
        <AuthenticatedLayout
            title="Neniweb"
            breadcrumbs={[{ label: 'Neniweb' }]}
        >
            <div className="p-6">
                <Tabs
                    value={activeTab}
                    onValueChange={(v) => {
                        setActiveTab(v);
                        navigate({ tab: v });
                    }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <TabsList className="bg-[#0f0e0c] border border-[#F5F0E8]/[0.05]">
                            <TabsTrigger
                                value="domeny"
                                className="data-[state=active]:bg-[#D97706] data-[state=active]:text-white text-[#9C9585]"
                            >
                                <Globe className="h-4 w-4 mr-2" />
                                Domény ({domains.total})
                            </TabsTrigger>
                            <TabsTrigger
                                value="hostingy"
                                className="data-[state=active]:bg-[#D97706] data-[state=active]:text-white text-[#9C9585]"
                            >
                                <Server className="h-4 w-4 mr-2" />
                                Hostingy ({hostings.total})
                            </TabsTrigger>
                        </TabsList>
                        <Button
                            onClick={handleOpenCreate}
                            className="bg-[#D97706] hover:bg-[#B45309] text-white"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            {activeTab === 'domeny'
                                ? 'Nová doména'
                                : 'Nový hosting'}
                        </Button>
                    </div>

                    <TabsContent value="domeny">
                        <DataTable
                            data={domains.data}
                            columns={domainColumns}
                            pagination={{
                                currentPage: domains.current_page,
                                lastPage: domains.last_page,
                                perPage: domains.per_page,
                                total: domains.total,
                            }}
                            searchValue={filters.search}
                            onSearch={(search) =>
                                navigate({ search, tab: 'domeny' })
                            }
                            sortBy={filters.sort_by}
                            sortDir={filters.sort_dir as 'asc' | 'desc'}
                            onSort={(sort_by, sort_dir) =>
                                navigate({ sort_by, sort_dir, tab: 'domeny' })
                            }
                            onPageChange={(page) =>
                                navigate({
                                    page: String(page),
                                    tab: 'domeny',
                                })
                            }
                            onRowClick={(sub) =>
                                router.visit(`/neniweb/${sub.id}/edit`)
                            }
                            emptyMessage="Žádné domény"
                        />
                    </TabsContent>

                    <TabsContent value="hostingy">
                        <DataTable
                            data={hostings.data}
                            columns={hostingColumns}
                            pagination={{
                                currentPage: hostings.current_page,
                                lastPage: hostings.last_page,
                                perPage: hostings.per_page,
                                total: hostings.total,
                            }}
                            searchValue={filters.search}
                            onSearch={(search) =>
                                navigate({ search, tab: 'hostingy' })
                            }
                            sortBy={filters.sort_by}
                            sortDir={filters.sort_dir as 'asc' | 'desc'}
                            onSort={(sort_by, sort_dir) =>
                                navigate({
                                    sort_by,
                                    sort_dir,
                                    tab: 'hostingy',
                                })
                            }
                            onPageChange={(page) =>
                                navigate({
                                    page: String(page),
                                    tab: 'hostingy',
                                })
                            }
                            onRowClick={(sub) =>
                                router.visit(`/neniweb/${sub.id}/edit`)
                            }
                            emptyMessage="Žádné hostingy"
                        />
                    </TabsContent>
                </Tabs>
            </div>

            <GlassModal
                open={showCreate}
                onClose={() => setShowCreate(false)}
                title={
                    activeTab === 'domeny' ? 'Nová doména' : 'Nový hosting'
                }
                maxWidth="max-w-2xl"
            >
                <NeniwebForm
                    form={form}
                    onSubmit={handleCreateSubmit}
                    submitLabel="Uložit"
                    customers={customers}
                    onCancel={() => setShowCreate(false)}
                />
            </GlassModal>
        </AuthenticatedLayout>
    );
}
