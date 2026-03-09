import { router } from '@inertiajs/react';
import { FileText, Package, Ticket, ChevronRight } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn, formatCurrency } from '@/lib/utils';

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

interface TicketItem {
    id: number;
    subject: string;
    status: string;
    priority: string;
    created_at: string;
}

interface Props {
    orders: Order[];
    invoices: Invoice[];
    tickets: TicketItem[];
}

const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('cs-CZ');

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

const ticketStatusConfig: Record<string, { label: string; className: string }> = {
    novy: { label: 'Nový', className: 'bg-blue-500/15 text-blue-500 border-blue-500/25' },
    v_reseni: { label: 'V řešení', className: 'bg-amber-500/15 text-amber-500 border-amber-500/25' },
    ceka_na_zakaznika: { label: 'Čeká na zákazníka', className: 'bg-orange-500/15 text-orange-500 border-orange-500/25' },
    vyreseno: { label: 'Vyřešeno', className: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/25' },
    uzavreno: { label: 'Uzavřeno', className: 'bg-gray-500/15 text-muted-foreground border-gray-500/25' },
};

const priorityConfig: Record<string, { label: string; className: string }> = {
    low: { label: 'Nízká', className: 'bg-gray-500/15 text-muted-foreground border-gray-500/25' },
    medium: { label: 'Normální', className: 'bg-blue-500/15 text-blue-500 border-blue-500/25' },
    high: { label: 'Vysoká', className: 'bg-amber-500/15 text-amber-500 border-amber-500/25' },
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

export default function CustomerTabs({ orders, invoices, tickets }: Props) {
    return (
        <Tabs defaultValue="orders" className="rounded-xl border border-border bg-card">
            <TabsList className="w-full justify-start border-b border-border bg-transparent px-4 pt-2">
                <TabsTrigger
                    value="orders"
                    className="text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                    Zakázky ({orders.length})
                </TabsTrigger>
                <TabsTrigger
                    value="invoices"
                    className="text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                    Faktury ({invoices.length})
                </TabsTrigger>
                <TabsTrigger
                    value="tickets"
                    className="text-muted-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:shadow-none"
                >
                    Požadavky ({tickets.length})
                </TabsTrigger>
            </TabsList>

            {/* Orders */}
            <TabsContent value="orders" className="mt-0 p-4">
                {orders.length === 0 ? (
                    <EmptyState icon={Package} message="Žádné zakázky" />
                ) : (
                    <div className="space-y-3">
                        {orders.map((order) => {
                            const dl = deadlineInfo(order.deadline);
                            const statusCfg = orderStatusConfig[order.status] ?? orderStatusConfig.nova;
                            const divCfg = divisionConfig[order.division] ?? divisionConfig.tisk;
                            return (
                                <button
                                    key={order.id}
                                    onClick={() => router.visit(`/zakazky/${order.id}`)}
                                    className="group flex w-full items-center justify-between rounded-lg border border-border bg-accent/50 p-4 text-left transition-colors hover:bg-accent"
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
            </TabsContent>

            {/* Invoices */}
            <TabsContent value="invoices" className="mt-0 p-4">
                {invoices.length === 0 ? (
                    <EmptyState icon={FileText} message="Žádné faktury" />
                ) : (
                    <div className="space-y-3">
                        {invoices.map((invoice) => {
                            const statusCfg = invoiceStatusConfig[invoice.status] ?? invoiceStatusConfig.nova;
                            const isOverdue = invoice.status !== 'zaplacena' && new Date(invoice.due_date) < new Date();
                            return (
                                <button
                                    key={invoice.id}
                                    onClick={() => router.visit(`/faktury/${invoice.id}`)}
                                    className="group flex w-full items-center justify-between rounded-lg border border-border bg-accent/50 p-4 text-left transition-colors hover:bg-accent"
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
            </TabsContent>

            {/* Tickets */}
            <TabsContent value="tickets" className="mt-0 p-4">
                {tickets.length === 0 ? (
                    <EmptyState icon={Ticket} message="Žádné požadavky" />
                ) : (
                    <div className="space-y-3">
                        {tickets.map((ticket) => {
                            const statusCfg = ticketStatusConfig[ticket.status] ?? ticketStatusConfig.novy;
                            const prioCfg = priorityConfig[ticket.priority] ?? priorityConfig.normalni;
                            return (
                                <button
                                    key={ticket.id}
                                    onClick={() => router.visit(`/pozadavky/${ticket.id}`)}
                                    className="group flex w-full items-center justify-between rounded-lg border border-border bg-accent/50 p-4 text-left transition-colors hover:bg-accent"
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className="truncate font-medium text-foreground">
                                                {ticket.subject}
                                            </span>
                                            <Badge {...statusCfg} />
                                            <Badge {...prioCfg} />
                                        </div>
                                        <div className="mt-1.5 text-sm text-muted-foreground">
                                            {formatDate(ticket.created_at)}
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                                </button>
                            );
                        })}
                    </div>
                )}
            </TabsContent>
        </Tabs>
    );
}
