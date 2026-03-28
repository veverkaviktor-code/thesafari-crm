import { useState } from 'react';
import { router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import ExpirationBadge from '@/components/shared/ExpirationBadge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { formatCurrency } from '@/lib/utils';
import {
    Globe,
    ArrowLeft,
    Pencil,
    Trash2,
    FileText,
    HardDrive,
    DollarSign,
    ExternalLink,
    Server,
} from 'lucide-react';

/* ─────── Types ─────── */

interface Invoice {
    id: number;
    invoice_number: string;
    issue_date: string;
    due_date: string;
    status: string;
    total: number;
}

interface Domain {
    id: number;
    customer_id: number | null;
    hosting_id: number | null;
    name: string;
    registrar: 'vas-hosting' | 'wedos' | 'external';
    expires_at: string | null;
    is_registered_by_us: boolean;
    sell_yearly: string;
    cost_yearly: string;
    auto_invoice: boolean;
    ip_address: string | null;
    dns_servers: any[] | null;
    owner_name: string | null;
    setup_date: string | null;
    synced_at: string | null;
    status: 'aktivni' | 'pozastaveno' | 'zruseno';
    notes: string | null;
    customer: { id: number; name: string; company: string | null } | null;
    hosting: { id: number; name: string } | null;
    invoices: Invoice[];
    days_until_expiry?: number | null;
    urgency?: string;
    yearly_margin?: number;
}

interface Props {
    domain: Domain;
}

/* ─────── Config maps ─────── */

const statusMap: Record<string, { label: string; variant: 'active' | 'inactive' | 'cancelled' }> = {
    aktivni: { label: 'Aktivní', variant: 'active' },
    pozastaveno: { label: 'Pozastaveno', variant: 'inactive' },
    zruseno: { label: 'Zrušeno', variant: 'cancelled' },
};

const registrarConfig: Record<string, { label: string; className: string }> = {
    'vas-hosting': { label: 'vas-hosting', className: 'bg-blue-500/15 text-blue-400 border-blue-500/25' },
    wedos: { label: 'Wedos', className: 'bg-orange-500/15 text-orange-400 border-orange-500/25' },
    external: { label: 'Externí', className: 'bg-muted text-muted-foreground border-border' },
};

const invoiceStatusConfig: Record<string, { label: string; className: string }> = {
    vystavena: { label: 'Vystavena', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    odeslana: { label: 'Odeslána', className: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    zaplacena: { label: 'Zaplacená', className: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    po_splatnosti: { label: 'Po splatnosti', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
    storno: { label: 'Storno', className: 'bg-muted text-muted-foreground border-border' },
};

/* ─────── Small components ─────── */

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-1.5">
            <span className="text-sm text-muted-foreground">{label}</span>
            <span className="text-sm text-foreground text-right">{children}</span>
        </div>
    );
}

function SectionHeader({ icon: Icon, title, count, action }: {
    icon: React.ElementType;
    title: string;
    count?: number;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                {count !== undefined && (
                    <span className="text-xs text-muted-foreground">({count})</span>
                )}
            </div>
            {action}
        </div>
    );
}

/* ─────── Main Component ─────── */

export default function DomainShow({ domain }: Props) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [blacklistOnDelete, setBlacklistOnDelete] = useState(false);

    const statusInfo = statusMap[domain.status];
    const regConfig = registrarConfig[domain.registrar] ?? registrarConfig.external;
    const sell = parseFloat(domain.sell_yearly) || 0;
    const cost = parseFloat(domain.cost_yearly) || 0;
    const margin = sell - cost;

    return (
        <AuthenticatedLayout
            title={domain.name}
            breadcrumbs={[
                { label: 'Domény', href: '/domeny' },
                { label: domain.name },
            ]}
        >
            <div className="p-6 space-y-6 max-w-6xl mx-auto">
                {/* ═══════ HEADER ═══════ */}
                <div className="space-y-2">
                    {/* Row 1: Actions top-right */}
                    <div className="flex items-center justify-end gap-2">
                        {domain.is_registered_by_us && domain.customer && !domain.hosting_id && (
                            <Button
                                onClick={() => router.post(`/domeny/${domain.id}/faktura`)}
                                className="bg-amber-600 text-white hover:bg-amber-700 border-0"
                                size="sm"
                            >
                                <FileText className="h-3.5 w-3.5 mr-1.5" />
                                Vystavit fakturu
                            </Button>
                        )}
                        <Button
                            onClick={() => router.visit(`/domeny/${domain.id}/edit`)}
                            className="bg-[#ad9d8e]/15 text-[#ad9d8e] hover:bg-[#ad9d8e]/25 border border-[#ad9d8e]/25"
                            size="sm"
                        >
                            <Pencil className="h-3.5 w-3.5 mr-1.5" />
                            Upravit
                        </Button>
                        <Button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/25"
                            size="sm"
                        >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Smazat
                        </Button>
                    </div>

                    {/* Row 2: Back + Name + Badges */}
                    <div className="flex items-center gap-3">
                        <Button
                            variant="ghost"
                            onClick={() => router.visit('/domeny')}
                            className="text-muted-foreground hover:text-foreground shrink-0 -ml-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Globe className="h-6 w-6 text-amber-500 shrink-0" />
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">{domain.name}</h1>
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${regConfig.className}`}>
                            {regConfig.label}
                        </span>
                        {statusInfo && <StatusBadge status={statusInfo.variant} label={statusInfo.label} />}
                        <ExpirationBadge expiresAt={domain.expires_at} />
                    </div>

                    {/* Row 3: Customer + Hosting link */}
                    <div className="pl-10 flex items-center gap-4">
                        {domain.customer && (
                            <a
                                href={`/zakaznici/${domain.customer.id}`}
                                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                            >
                                {domain.customer.company || domain.customer.name}
                            </a>
                        )}
                        {domain.hosting && (
                            <a
                                href={`/hostingy/${domain.hosting.id}`}
                                className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                            >
                                <HardDrive className="h-3 w-3" />
                                Hosting: {domain.hosting.name}
                            </a>
                        )}
                    </div>
                </div>

                {/* ═══════ CARDS ═══════ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Card: Registrace domény */}
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <SectionHeader icon={Globe} title="Registrace domény" />
                        <div className="px-5 py-4 space-y-1">
                            <InfoRow label="Registrátor">
                                <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${regConfig.className}`}>
                                    {regConfig.label}
                                </span>
                            </InfoRow>
                            <InfoRow label="Expirace">
                                {domain.expires_at ? (
                                    <ExpirationBadge expiresAt={domain.expires_at} />
                                ) : (
                                    <span className="text-muted-foreground/50">Nenastaveno</span>
                                )}
                            </InfoRow>
                            {domain.owner_name && (
                                <InfoRow label="Vlastník">
                                    <span>{domain.owner_name}</span>
                                </InfoRow>
                            )}
                            {domain.dns_servers && domain.dns_servers.length > 0 && (
                                <InfoRow label="DNS servery">
                                    <span className="font-mono text-xs">
                                        {domain.dns_servers.join(', ')}
                                    </span>
                                </InfoRow>
                            )}
                            {domain.ip_address && (
                                <InfoRow label="IP adresa">
                                    <span className="font-mono text-xs">{domain.ip_address}</span>
                                </InfoRow>
                            )}
                            {domain.setup_date && (
                                <InfoRow label="Datum registrace">
                                    <span>{format(new Date(domain.setup_date), 'd. M. yyyy', { locale: cs })}</span>
                                </InfoRow>
                            )}
                            {domain.synced_at && (
                                <InfoRow label="Poslední sync">
                                    <span className="text-xs">{format(new Date(domain.synced_at), 'd. M. yyyy HH:mm', { locale: cs })}</span>
                                </InfoRow>
                            )}
                        </div>
                    </div>

                    {/* Card: Cena (only if is_registered_by_us) */}
                    {domain.is_registered_by_us && (sell > 0 || cost > 0) ? (
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                            <SectionHeader icon={DollarSign} title="Cena" />
                            <div className="px-5 py-4 space-y-1">
                                <InfoRow label="Prodejní cena">
                                    <span className="font-medium text-foreground">{sell > 0 ? formatCurrency(sell) : '—'}</span>
                                </InfoRow>
                                <InfoRow label="Nákladová cena">
                                    <span className="font-medium text-foreground">{cost > 0 ? formatCurrency(cost) : '—'}</span>
                                </InfoRow>
                                <InfoRow label="Marže">
                                    <span className={`font-semibold ${margin > 0 ? 'text-emerald-400' : margin < 0 ? 'text-red-400' : 'text-foreground'}`}>
                                        {formatCurrency(margin)}
                                    </span>
                                </InfoRow>
                                <div className="flex items-center gap-2 text-sm pt-3 mt-2 border-t border-border">
                                    <Switch
                                        checked={domain.auto_invoice}
                                        onCheckedChange={(v) => router.put(`/domeny/${domain.id}`, { auto_invoice: v }, { preserveScroll: true })}
                                        className="scale-90"
                                    />
                                    <span className="text-muted-foreground">Auto-fakturace</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-card border border-border rounded-lg px-5 py-8 text-center">
                            <DollarSign className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
                            <p className="text-sm text-muted-foreground">
                                {domain.is_registered_by_us ? 'Bez cenových údajů' : 'Externí doména — nefakturujeme'}
                            </p>
                        </div>
                    )}
                </div>

                {/* ═══════ INVOICES ═══════ */}
                {domain.invoices && domain.invoices.length > 0 && (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <SectionHeader icon={FileText} title="Faktury" count={domain.invoices.length} />
                        <div className="divide-y divide-border">
                            {domain.invoices.map((inv) => {
                                const invStatus = invoiceStatusConfig[inv.status] ?? invoiceStatusConfig.vystavena;
                                return (
                                    <a
                                        key={inv.id}
                                        href={`/faktury/${inv.id}`}
                                        className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-medium text-foreground">{inv.invoice_number}</span>
                                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${invStatus.className}`}>
                                                {invStatus.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-medium text-foreground">{formatCurrency(Number(inv.total))}</span>
                                            <span className="text-xs text-muted-foreground">
                                                {format(new Date(inv.issue_date), 'd. M. yyyy', { locale: cs })}
                                            </span>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* ═══════ NOTES ═══════ */}
                {domain.notes && (
                    <div className="bg-card border border-border rounded-lg px-5 py-4">
                        <h3 className="text-sm font-semibold text-foreground mb-2">Poznámky</h3>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{domain.notes}</p>
                    </div>
                )}
            </div>

            <ConfirmDialog
                open={showDeleteConfirm}
                onClose={() => { setShowDeleteConfirm(false); setBlacklistOnDelete(false); }}
                onConfirm={() => router.delete(`/domeny/${domain.id}`, { data: { blacklist: blacklistOnDelete } })}
                title="Smazat doménu"
                message={`Opravdu chcete smazat doménu "${domain.name}"?`}
            >
                <label className="flex items-center gap-2 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={blacklistOnDelete}
                        onChange={(e) => setBlacklistOnDelete(e.target.checked)}
                        className="rounded border-border bg-background text-primary focus:ring-primary/50 h-4 w-4"
                    />
                    <span className="text-xs text-muted-foreground">
                        Přidat do výjimek syncu (nebude se znovu objevovat při synchronizaci)
                    </span>
                </label>
            </ConfirmDialog>
        </AuthenticatedLayout>
    );
}
