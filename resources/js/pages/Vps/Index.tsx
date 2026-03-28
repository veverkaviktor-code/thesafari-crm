import { type FormEvent, useState, useCallback } from 'react';
import { router, useForm } from '@inertiajs/react';
import { formatCurrency } from '@/lib/utils';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import GlassModal from '@/components/ui/GlassModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
    HardDrive,
    Pencil,
    Play,
    Pause,
    Plus,
    RefreshCw,
    Trash2,
} from 'lucide-react';

interface VpsServer {
    id: number;
    name: string;
    customer: { id: number; name: string; company: string | null } | null;
    customer_id: number | null;
    price_yearly: number;
    api_hostname: string | null;
    ip_address: string | null;
    storage_total_gb: number;
    storage_used_mb: number;
    hostings_count: number;
    notes: string | null;
    status: string;
    expires_at: string | null;
    auto_invoice: boolean;
}

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface Props {
    vpsServers: VpsServer[];
    customers: Customer[];
}

interface VpsFormData {
    name: string;
    customer_id: string;
    price_yearly: string;
    ip_address: string;
    storage_total_gb: string;
    notes: string;
    status: string;
    expires_at: string;
    auto_invoice: boolean;
}

const statusIconMap: Record<string, { icon: typeof Play; className: string; title: string }> = {
    aktivni: { icon: Play, className: 'text-emerald-400', title: 'Aktivní' },
    neaktivni: { icon: Pause, className: 'text-zinc-400', title: 'Neaktivní' },
};

export default function VpsIndex({ vpsServers, customers }: Props) {
    const [showCreate, setShowCreate] = useState(false);
    const [editVps, setEditVps] = useState<VpsServer | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<VpsServer | null>(null);
    const [syncing, setSyncing] = useState(false);

    const form = useForm<VpsFormData>({
        name: '',
        customer_id: '',
        price_yearly: '0',
        ip_address: '',
        storage_total_gb: '0',
        notes: '',
        status: 'aktivni',
        expires_at: '',
        auto_invoice: false,
    });

    const handleSync = () => {
        setSyncing(true);
        router.post('/vps/sync', {}, { onFinish: () => setSyncing(false) });
    };

    const handleDelete = () => {
        if (!deleteTarget) return;
        router.delete(`/vps/${deleteTarget.id}`, {
            onSuccess: () => setDeleteTarget(null),
        });
    };

    const handleSubmit = useCallback((e: FormEvent) => {
        e.preventDefault();
        if (editVps) {
            form.put(`/vps/${editVps.id}`, {
                onSuccess: () => { setEditVps(null); form.reset(); },
            });
        } else {
            form.post('/vps', {
                onSuccess: () => { setShowCreate(false); form.reset(); },
            });
        }
    }, [editVps, form]);

    const openEdit = (vps: VpsServer) => {
        form.setData({
            name: vps.name,
            customer_id: vps.customer_id ? String(vps.customer_id) : '',
            price_yearly: String(vps.price_yearly),
            ip_address: vps.ip_address ?? '',
            storage_total_gb: String(vps.storage_total_gb),
            notes: vps.notes ?? '',
            status: vps.status,
            expires_at: vps.expires_at ? vps.expires_at.substring(0, 10) : '',
            auto_invoice: vps.auto_invoice ?? false,
        });
        setEditVps(vps);
    };

    const columns = [
        {
            key: 'name',
            label: 'Název',
            render: (vps: VpsServer) => (
                <div>
                    <span className="font-medium text-foreground">{vps.name}</span>
                    {vps.ip_address && (
                        <p className="text-[10px] font-mono text-muted-foreground/60 leading-none mt-0.5">{vps.ip_address}</p>
                    )}
                </div>
            ),
        },
        {
            key: 'customer',
            label: 'Zákazník',
            render: (vps: VpsServer) => (
                <span className="text-muted-foreground">{vps.customer ? vps.customer.company || vps.customer.name : '--'}</span>
            ),
        },
        {
            key: 'price_yearly',
            label: 'Cena/rok',
            render: (vps: VpsServer) => (
                <span className="text-sm text-muted-foreground">{vps.price_yearly ? formatCurrency(vps.price_yearly) : '--'}</span>
            ),
        },
        {
            key: 'hostings_count',
            label: 'Hostingů',
            render: (vps: VpsServer) => <span className="text-sm text-foreground font-medium">{vps.hostings_count}</span>,
        },
        {
            key: 'storage',
            label: 'Úložiště',
            render: (vps: VpsServer) => {
                if (!vps.storage_total_gb) return <span className="text-muted-foreground/50 text-sm">--</span>;
                const totalMb = vps.storage_total_gb * 1024;
                const usedMb = vps.storage_used_mb;
                const pct = totalMb > 0 ? Math.min(100, (usedMb / totalMb) * 100) : 0;
                return (
                    <div className="w-28">
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                            <span>{(usedMb / 1024).toFixed(1)} GB</span>
                            <span>{vps.storage_total_gb} GB</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-accent overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-primary/60'}`} style={{ width: `${pct}%` }} />
                        </div>
                    </div>
                );
            },
        },
        {
            key: 'status',
            label: 'Stav',
            render: (vps: VpsServer) => {
                const si = statusIconMap[vps.status];
                if (!si) return <span>{vps.status}</span>;
                const Icon = si.icon;
                return <span title={si.title}><Icon className={`h-4 w-4 ${si.className}`} /></span>;
            },
        },
        {
            key: 'actions',
            label: '',
            render: (vps: VpsServer) => (
                <div className="flex items-center gap-1">
                    <button onClick={() => openEdit(vps)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="Upravit">
                        <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(vps)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500" title="Smazat">
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                </div>
            ),
        },
    ];

    return (
        <AuthenticatedLayout
            title="VPS Servery"
            breadcrumbs={[
                { label: 'Webové služby' },
                { label: 'VPS Servery' },
            ]}
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">VPS Servery</h1>
                        <p className="text-sm text-muted-foreground">
                            {vpsServers.length} serverů
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleSync}
                            disabled={syncing}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                            Sync VPS
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => setShowCreate(true)}
                            className="bg-primary hover:bg-primary/80 text-white"
                        >
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            Nový VPS
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="rounded-xl border border-border bg-card">
                    <DataTable data={vpsServers} columns={columns} emptyMessage="Žádné VPS servery" />
                </div>
            </div>

            {/* Modal: VPS create/edit */}
            <GlassModal
                open={showCreate || !!editVps}
                onClose={() => { setShowCreate(false); setEditVps(null); form.reset(); }}
                title={editVps ? `Upravit VPS — ${editVps.name}` : 'Nový VPS server'}
                maxWidth="max-w-lg"
            >
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label>Název *</Label>
                        <Input value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} placeholder="sss06.vas-server.cz" className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground" />
                        {form.errors.name && <p className="mt-1 text-xs text-red-400">{form.errors.name}</p>}
                    </div>
                    <div>
                        <Label>Zákazník</Label>
                        <Select value={form.data.customer_id} onValueChange={(v) => form.setData('customer_id', v === 'none' ? '' : v)}>
                            <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground"><SelectValue placeholder="Bez zákazníka" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Bez zákazníka</SelectItem>
                                {customers.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.company ? `${c.name} (${c.company})` : c.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Cena/rok (Kč)</Label>
                            <Input type="number" value={form.data.price_yearly} onChange={(e) => form.setData('price_yearly', e.target.value)} placeholder="2500" className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground" />
                        </div>
                        <div>
                            <Label>IP adresa</Label>
                            <Input value={form.data.ip_address} onChange={(e) => form.setData('ip_address', e.target.value)} placeholder="37.235.108.29" className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground font-mono" />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Úložiště (GB)</Label>
                            <Input type="number" value={form.data.storage_total_gb} onChange={(e) => form.setData('storage_total_gb', e.target.value)} placeholder="500" className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground" />
                        </div>
                        <div>
                            <Label>Stav</Label>
                            <Select value={form.data.status} onValueChange={(v) => form.setData('status', v)}>
                                <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="aktivni">Aktivní</SelectItem>
                                    <SelectItem value="neaktivni">Neaktivní</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div>
                        <Label>Expirace</Label>
                        <Input type="date" value={form.data.expires_at} onChange={(e) => form.setData('expires_at', e.target.value)} className="mt-1.5 bg-muted border-border text-foreground" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={form.data.auto_invoice}
                            onCheckedChange={(v) => form.setData('auto_invoice', v)}
                        />
                        <Label className="text-sm font-normal text-muted-foreground">Auto-fakturace</Label>
                    </div>
                    <div>
                        <Label>Poznámky</Label>
                        <Textarea value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} rows={3} className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none" />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" onClick={() => { setShowCreate(false); setEditVps(null); form.reset(); }} className="text-muted-foreground hover:text-foreground">Zrušit</Button>
                        <Button type="submit" disabled={form.processing} className="bg-primary hover:bg-primary/80 text-white">
                            {form.processing ? 'Ukládám...' : editVps ? 'Uložit změny' : 'Vytvořit VPS'}
                        </Button>
                    </div>
                </form>
            </GlassModal>

            {/* Modal: Delete VPS */}
            <ConfirmDialog
                open={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
                title="Smazat VPS server"
                message={
                    deleteTarget
                        ? `Opravdu chcete smazat VPS ${deleteTarget.name}?${deleteTarget.hostings_count > 0 ? ` Upozornění: Tento VPS obsahuje ${deleteTarget.hostings_count} přiřazených hostingů.` : ''}`
                        : ''
                }
                confirmLabel="Smazat"
                variant="danger"
            />
        </AuthenticatedLayout>
    );
}
