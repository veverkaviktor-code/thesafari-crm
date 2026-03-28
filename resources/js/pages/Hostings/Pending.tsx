import { useState } from 'react';
import { router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CheckCircle, Ban, Globe, ArrowLeft, Server } from 'lucide-react';

const sourceToServer: Record<string, string> = {
    sss06: 'sss06.vas-server.cz',
    ond08: 'ond08.vas-server.cz',
    thaimassage: 'thaimassage-server.cz',
};

interface PendingItem {
    id: number;
    domain_name: string;
    source: string;
    discovered_at: string;
}

interface Customer {
    id: number;
    name: string;
}

interface Props {
    pendingItems: PendingItem[];
    customers: Customer[];
}

export default function Pending({ pendingItems, customers }: Props) {
    const [selectedCustomers, setSelectedCustomers] = useState<Record<string, string>>({});
    const [processing, setProcessing] = useState<string | null>(null);

    const handleApprove = (domainName: string) => {
        setProcessing(domainName);
        router.post('/hostingy/ke-schvaleni/approve', {
            domain_name: domainName,
            customer_id: selectedCustomers[domainName] || null,
        }, {
            preserveState: false,
            onFinish: () => setProcessing(null),
        });
    };

    const handleIgnore = (domainName: string) => {
        setProcessing(domainName);
        router.post('/hostingy/ke-schvaleni/ignore', {
            domain_name: domainName,
        }, {
            preserveState: false,
            onFinish: () => setProcessing(null),
        });
    };

    return (
        <AuthenticatedLayout
            breadcrumbs={[
                { label: 'Hostingy', href: '/hostingy' },
                { label: 'Ke schválení' },
            ]}
        >
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold">Ke schválení</h2>
                        <p className="text-sm text-muted-foreground">
                            Nové hostingy nalezené při sync z API — schvalte nebo ignorujte.
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => router.visit('/hostingy')}
                        className="border border-border"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Zpět
                    </Button>
                </div>

                {pendingItems.length === 0 ? (
                    <div className="rounded-lg border border-border bg-card p-12 text-center">
                        <Globe className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
                        <p className="text-muted-foreground">Žádné hostingy ke schválení</p>
                    </div>
                ) : (
                    <div className="rounded-lg border border-border bg-card">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-muted-foreground">
                                    <th className="px-4 py-3 text-left font-medium">Doména</th>
                                    <th className="px-4 py-3 text-left font-medium">Server</th>
                                    <th className="px-4 py-3 text-left font-medium">Nalezeno</th>
                                    <th className="px-4 py-3 text-left font-medium">Přiřadit zákazníkovi</th>
                                    <th className="px-4 py-3 text-right font-medium">Akce</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingItems.map((item) => (
                                    <tr key={item.id} className="border-b border-border/50 last:border-0">
                                        <td className="px-4 py-3 font-medium">{item.domain_name}</td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <Server className="h-3.5 w-3.5" />
                                                {sourceToServer[item.source] || item.source}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {item.discovered_at
                                                ? format(new Date(item.discovered_at), 'd. M. yyyy HH:mm', { locale: cs })
                                                : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Select
                                                value={selectedCustomers[item.domain_name] || ''}
                                                onValueChange={(val) =>
                                                    setSelectedCustomers((prev) => ({ ...prev, [item.domain_name]: val }))
                                                }
                                            >
                                                <SelectTrigger className="w-[220px]">
                                                    <SelectValue placeholder="Bez zákazníka" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {customers.map((c) => (
                                                        <SelectItem key={c.id} value={String(c.id)}>
                                                            {c.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleApprove(item.domain_name)}
                                                    disabled={processing === item.domain_name}
                                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                    Schválit
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleIgnore(item.domain_name)}
                                                    disabled={processing === item.domain_name}
                                                    className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                                                >
                                                    <Ban className="h-4 w-4 mr-1" />
                                                    Ignorovat
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
