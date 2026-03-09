import { Link } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { FileText, Package, Server, ChevronRight } from 'lucide-react';
import { cn, formatCurrency, formatDate } from '@/lib/utils';

interface Order {
    id: number;
    title: string;
    division: string;
    status: string;
    price: number;
    deadline: string | null;
    created_at: string;
}

interface Invoice {
    id: number;
    invoice_number: string;
    status: string;
    total: number;
    due_date: string;
}

interface Subscription {
    id: number;
    type: 'hosting' | 'domena' | 'sluzba';
    name: string;
    status: string;
    expires_at: string | null;
}

interface VpsServer {
    id: number;
    name: string;
    status: string;
    price_yearly: number;
    hostings_count: number;
}

interface Props {
    orders: Order[];
    invoices: Invoice[];
    subscriptions: Subscription[];
    vpsServers: VpsServer[];
}

/* ── Status configs ── */

const orderStatusConfig: Record<string, { label: string; className: string }> = {
    nova: { label: 'Nová', className: 'bg-blue-500/15 text-blue-500 border-blue-500/25' },
    v_reseni: { label: 'V řešení', className: 'bg-amber-500/15 text-amber-500 border-amber-500/25' },
    hotovo: { label: 'Hotovo', className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25' },
    fakturovano: { label: 'Fakturováno', className: 'bg-violet-500/15 text-violet-500 border-violet-500/25' },
};

const divisionConfig: Record<string, { label: string; className: string }> = {
    tisk: { label: 'Tisk', className: 'bg-gray-500/15 text-muted-foreground border-gray-500/25' },
    reklama: { label: 'Reklama', className: 'bg-amber-500/15 text-amber-500 border-amber-500/25' },
    polepy: { label: 'Polepy', className: 'bg-blue-500/15 text-blue-500 border-blue-500/25' },
    montaze: { label: 'Montáže', className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25' },
    weby: { label: 'Weby', className: 'bg-violet-500/15 text-violet-500 border-violet-500/25' },
};

const invoiceStatusConfig: Record<string, { label: string; className: string }> = {
    nova: { label: 'Nová', className: 'bg-blue-500/15 text-blue-500 border-blue-500/25' },
    vystavena: { label: 'Vystavena', className: 'bg-indigo-500/15 text-indigo-500 border-indigo-500/25' },
    odeslana: { label: 'Odeslaná', className: 'bg-amber-500/15 text-amber-500 border-amber-500/25' },
    zaplacena: { label: 'Zaplacená', className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25' },
    po_splatnosti: { label: 'Po splatnosti', className: 'bg-red-500/15 text-red-500 border-red-500/25' },
    storno: { label: 'Storno', className: 'bg-gray-500/15 text-muted-foreground border-gray-500/25' },
};

const subscriptionStatusConfig: Record<string, { label: string; className: string }> = {
    aktivni: { label: 'Aktivní', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
    pozastaveno: { label: 'Pozastaveno', className: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    zruseno: { label: 'Zrušeno', className: 'bg-red-500/15 text-red-400 border-red-500/25' },
};

const typeLabels: Record<string, string> = {
    hosting: 'Hosting',
    domena: 'Doména',
    sluzba: 'Služba',
};

function Badge({ label, className }: { label: string; className: string }) {
    return (
        <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium', className)}>
            {label}
        </span>
    );
}

function deadlineInfo(deadline: string | null) {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - Date.now();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return { text: `Po termínu`, className: 'text-red-400' };
    if (days < 7) return { text: `Za ${days} ${days === 1 ? 'den' : days < 5 ? 'dny' : 'dní'}`, className: 'text-amber-400' };
    return { text: formatDate(deadline), className: 'text-muted-foreground' };
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
                <Icon className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">{message}</p>
        </div>
    );
}

export default function CustomerTabs({ orders, invoices, subscriptions, vpsServers }: Props) {
    const totalServices = subscriptions.length + vpsServers.length;

    return (
        <div className="grid gap-4 lg:grid-cols-3">
            {/* Zakazky */}
            <div className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold text-foreground">
                        Zakázky ({orders.length})
                    </h3>
                </div>
                <div className="p-4">
                    {orders.length === 0 ? (
                        <EmptyState icon={Package} message="Žádné zakázky" />
                    ) : (
                        <div className="space-y-2">
                            {orders.map((order) => {
                                const dl = deadlineInfo(order.deadline);
                                const statusCfg = orderStatusConfig[order.status] ?? orderStatusConfig.nova;
                                const divCfg = divisionConfig[order.division] ?? divisionConfig.tisk;
                                return (
                                    <button
                                        key={order.id}
                                        onClick={() => router.visit(`/zakazky/${order.id}`)}
                                        className="group flex w-full items-center justify-between rounded-lg border border-border bg-accent/50 p-3 text-left transition-colors hover:bg-accent"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="truncate font-medium text-foreground">
                                                    {order.title}
                                                </span>
                                                <Badge {...statusCfg} />
                                            </div>
                                            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                                                <Badge {...divCfg} />
                                                <span className="text-foreground/70">
                                                    {formatCurrency(order.price)}
                                                </span>
                                                {dl && (
                                                    <span className={dl.className}>
                                                        {dl.text}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Faktury */}
            <div className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold text-foreground">
                        Faktury ({invoices.length})
                    </h3>
                </div>
                <div className="p-4">
                    {invoices.length === 0 ? (
                        <EmptyState icon={FileText} message="Žádné faktury" />
                    ) : (
                        <div className="space-y-2">
                            {invoices.map((invoice) => {
                                const statusCfg = invoiceStatusConfig[invoice.status] ?? invoiceStatusConfig.nova;
                                const isOverdue = invoice.status !== 'zaplacena' && new Date(invoice.due_date) < new Date();
                                return (
                                    <button
                                        key={invoice.id}
                                        onClick={() => router.visit(`/faktury/${invoice.id}`)}
                                        className="group flex w-full items-center justify-between rounded-lg border border-border bg-accent/50 p-3 text-left transition-colors hover:bg-accent"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-foreground">
                                                    #{invoice.invoice_number}
                                                </span>
                                                <Badge {...statusCfg} />
                                            </div>
                                            <div className="mt-1.5 flex items-center gap-3 text-sm">
                                                <span className="font-medium text-foreground/70">
                                                    {formatCurrency(invoice.total)}
                                                </span>
                                                <span className={isOverdue ? 'text-red-400' : 'text-muted-foreground'}>
                                                    Splatnost: {formatDate(invoice.due_date)}
                                                </span>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Služby */}
            <div className="rounded-xl border border-border bg-card">
                <div className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold text-foreground">
                        Služby ({totalServices})
                    </h3>
                </div>
                <div className="p-4">
                    {totalServices === 0 ? (
                        <EmptyState icon={Server} message="Žádné aktivní služby" />
                    ) : (
                        <div className="space-y-2">
                            {vpsServers.map((vps) => (
                                <div
                                    key={`vps-${vps.id}`}
                                    className="flex items-center justify-between rounded-lg border border-border bg-accent/50 p-3"
                                >
                                    <div className="flex items-center gap-2">
                                        <Server className="h-4 w-4 text-amber-500" />
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {vps.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                VPS &middot; {vps.hostings_count} hostingů &middot; {formatCurrency(vps.price_yearly)}/rok
                                            </p>
                                        </div>
                                    </div>
                                    <Badge
                                        label={vps.status === 'aktivni' ? 'Aktivní' : 'Neaktivní'}
                                        className={vps.status === 'aktivni'
                                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                                            : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25'
                                        }
                                    />
                                </div>
                            ))}
                            {subscriptions.map((sub) => {
                                const statusInfo = subscriptionStatusConfig[sub.status];
                                return (
                                    <Link
                                        key={sub.id}
                                        href={`/neniweb/${sub.id}`}
                                        className="group flex items-center justify-between rounded-lg border border-border bg-accent/50 p-3 transition-colors hover:bg-accent"
                                    >
                                        <div>
                                            <p className="text-sm font-medium text-foreground">
                                                {sub.name}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                {typeLabels[sub.type] ?? sub.type}
                                                {sub.expires_at && (
                                                    <>
                                                        {' '}&middot; do{' '}
                                                        {new Date(sub.expires_at).toLocaleDateString('cs-CZ')}
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {statusInfo && <Badge {...statusInfo} />}
                                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                        </div>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
