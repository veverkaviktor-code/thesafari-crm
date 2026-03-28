import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import {
    AlertTriangle,
    Banknote,
    CheckCircle2,
    Clock,
    CreditCard,
    Download,
    ExternalLink,
    FileText,
    Landmark,
    Mail,
    Pencil,
    RefreshCw,
} from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import InvoiceStatusBadge, {
    type InvoiceStatus,
} from '@/components/invoices/InvoiceStatusBadge';

interface BankTransaction {
    id: number;
    date: string;
    amount: number;
    variable_symbol: string | null;
    counter_account: string | null;
    counter_account_name: string | null;
    description: string | null;
}

interface InvoiceItem {
    id: number;
    description: string;
    quantity: number;
    unit: string;
    unit_price: number;
    total_price: number;
}

interface Invoice {
    id: number;
    invoice_number: string;
    variable_symbol: string;
    issue_date: string;
    due_date: string;
    paid_at: string | null;
    status: InvoiceStatus;
    payment_method: string;
    total: number;
    notes: string | null;
    reminder_count: number;
    last_reminder_at: string | null;
    customer: {
        id: number;
        name: string;
        company: string | null;
        ico: string | null;
        dic: string | null;
        billing_street: string | null;
        billing_city: string | null;
        billing_zip: string | null;
    };
    order: { id: number; title: string } | null;
    items: InvoiceItem[];
    hostings?: Array<{
        id: number;
        name: string;
        expires_at: string | null;
    }>;
    domains?: Array<{
        id: number;
        name: string;
        is_registered_by_us: boolean;
        expires_at: string | null;
    }>;
    bank_transaction?: BankTransaction;
}

interface Activity {
    id: number;
    description: string;
    created_at: string;
    properties: {
        old?: Record<string, unknown>;
        attributes?: Record<string, unknown>;
    };
}

interface EmailLogEntry {
    id: number;
    type: string;
    subject: string;
    recipient_email: string;
    status: 'sent' | 'failed';
    error_message: string | null;
    sent_at: string | null;
}

interface Props {
    invoice: Invoice & { sent_at: string | null };
    company: {
        name: string;
        ico: string;
        dic: string;
        street: string;
        city: string;
        zip: string;
        bank_account: string;
    } | null;
    unmatchedTransactions: BankTransaction[];
    activities: Activity[];
    emailLogs?: EmailLogEntry[];
}

const formatDate = (d: string) =>
    format(new Date(d), 'd. MMMM yyyy', { locale: cs });

const formatTimeline = (d: string) =>
    format(new Date(d), 'd. M. yyyy HH:mm', { locale: cs });

const STATUS_LABELS: Record<string, string> = {
    vystavena: 'Vystavena',
    odeslana: 'Odeslaná',
    zaplacena: 'Zaplacena',
    po_splatnosti: 'Po splatnosti',
};

interface TimelineItem {
    key: string;
    date: Date;
    label: string;
    icon: React.ElementType;
    dotColor: string;
    iconColor: string;
}

export default function Show({ invoice, company, unmatchedTransactions, activities, emailLogs }: Props) {
    const co = company ?? {
        name: 'The Safari s.r.o.',
        ico: '',
        dic: '',
        street: '',
        city: '',
        zip: '',
        bank_account: '',
    };

    const [selectedBankTx, setSelectedBankTx] = useState('');
    const [matchingBank, setMatchingBank] = useState(false);

    const handleMarkPaid = (method: 'banka' | 'hotovost') => {
        router.post(`/faktury/${invoice.id}/paid`, { payment_method: method }, { preserveScroll: true });
    };

    const handleSendEmail = () => {
        router.post(`/faktury/${invoice.id}/send`, {}, { preserveScroll: true });
    };

    const handleMatchBank = () => {
        if (!selectedBankTx) return;
        setMatchingBank(true);
        router.post(
            `/faktury/${invoice.id}/match-bank`,
            { bank_transaction_id: selectedBankTx },
            {
                preserveScroll: true,
                onSuccess: () => setMatchingBank(false),
                onError: () => setMatchingBank(false),
            },
        );
    };

    const timelineItems: TimelineItem[] = [];

    // a) Vystavena — vždy
    timelineItems.push({
        key: 'issued',
        date: new Date(invoice.issue_date),
        label: 'Faktura vystavena',
        icon: FileText,
        dotColor: 'bg-emerald-500',
        iconColor: 'text-emerald-400',
    });

    // b) Odeslána e-mailem
    if (invoice.sent_at) {
        timelineItems.push({
            key: 'sent',
            date: new Date(invoice.sent_at),
            label: 'Odeslána e-mailem',
            icon: Mail,
            dotColor: 'bg-blue-500',
            iconColor: 'text-blue-400',
        });
    }

    // c) Upomínky — jen jedna položka s počtem
    if (invoice.reminder_count > 0 && invoice.last_reminder_at) {
        const rc = invoice.reminder_count;
        const reminderLabel =
            rc === 1
                ? '1. upomínka odeslána'
                : rc === 2
                  ? '2. upomínka odeslána'
                  : `${rc}. upomínka odeslána`;
        const reminderDot =
            rc >= 3 ? 'bg-red-500' : rc >= 2 ? 'bg-amber-500' : 'bg-yellow-500';
        const reminderIcon =
            rc >= 3 ? 'text-red-400' : rc >= 2 ? 'text-amber-400' : 'text-yellow-500';
        timelineItems.push({
            key: 'reminder',
            date: new Date(invoice.last_reminder_at),
            label: reminderLabel,
            icon: AlertTriangle,
            dotColor: reminderDot,
            iconColor: reminderIcon,
        });
    }

    // d) Zaplacena
    if (invoice.paid_at) {
        const method =
            invoice.payment_method === 'barter' ? 'barterem' : invoice.payment_method === 'banka' ? 'převodem' : 'hotovostí';
        timelineItems.push({
            key: 'paid',
            date: new Date(invoice.paid_at),
            label: `Zaplacena ${method}`,
            icon: CheckCircle2,
            dotColor: 'bg-emerald-500',
            iconColor: 'text-emerald-400',
        });
    }

    // e) Spárována s bankou
    if (invoice.bank_transaction) {
        timelineItems.push({
            key: 'bank',
            date: new Date(invoice.bank_transaction.date),
            label: 'Spárována s bankovní transakcí',
            icon: Landmark,
            dotColor: 'bg-emerald-500',
            iconColor: 'text-emerald-400',
        });
    }

    // f) E-mail logy (odesláno, upomínky, poděkování)
    const emailTypeLabels: Record<string, string> = {
        invoice: 'Faktura odeslána e-mailem',
        reminder_1: '1. upomínka odeslána',
        reminder_2: '2. upomínka odeslána',
        reminder_3: '3. upomínka (poslední) odeslána',
        payment_thanks: 'Poděkování za úhradu odesláno',
    };
    (emailLogs ?? []).forEach((log) => {
        const label = log.status === 'failed'
            ? `${emailTypeLabels[log.type] ?? log.type} — SELHALO`
            : emailTypeLabels[log.type] ?? log.subject;
        timelineItems.push({
            key: `email-${log.id}`,
            date: log.sent_at ? new Date(log.sent_at) : new Date(),
            label: `${label} → ${log.recipient_email}`,
            icon: Mail,
            dotColor: log.status === 'failed' ? 'bg-red-500' : 'bg-blue-500',
            iconColor: log.status === 'failed' ? 'text-red-400' : 'text-blue-400',
        });
    });

    // g) Změny stavu z activity_log
    activities.forEach((activity) => {
        const newStatus =
            activity.properties?.attributes?.['status'] as string | undefined;
        const label = newStatus
            ? `Stav změněn na: ${STATUS_LABELS[newStatus] ?? newStatus}`
            : activity.description;
        timelineItems.push({
            key: `activity-${activity.id}`,
            date: new Date(activity.created_at),
            label,
            icon: RefreshCw,
            dotColor: 'bg-muted-foreground',
            iconColor: 'text-muted-foreground',
        });
    });

    // Seřadit desc (nejnovější nahoře)
    timelineItems.sort((a, b) => b.date.getTime() - a.date.getTime());

    return (
        <AuthenticatedLayout
            title={`Faktura ${invoice.invoice_number}`}
            breadcrumbs={[
                { label: 'Faktury', href: '/faktury' },
                { label: invoice.invoice_number },
            ]}
        >
            <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            {/* Levý sloupec — stávající obsah */}
            <div className="space-y-6">
                {/* Actions bar */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-semibold text-foreground">
                            {invoice.invoice_number}
                        </h1>
                        <InvoiceStatusBadge status={invoice.status} />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            asChild
                            size="sm"
                            className="bg-[#ad9d8e] text-white hover:bg-[#ad9d8e]/90 border-0"
                        >
                            <a
                                href={`/faktury/${invoice.id}/pdf`}
                                download
                            >
                                <Download className="h-4 w-4" />
                                Stáhnout PDF
                            </a>
                        </Button>
                        <Button
                            size="sm"
                            className="bg-[#ad9d8e] text-white hover:bg-[#ad9d8e]/90 border-0"
                            onClick={handleSendEmail}
                        >
                            <Mail className="h-4 w-4" />
                            Odeslat e-mailem
                        </Button>
                        {invoice.status !== 'zaplacena' && (
                            <div className="flex items-center gap-1">
                                <Button
                                    size="sm"
                                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                                    onClick={() => handleMarkPaid('banka')}
                                >
                                    <CreditCard className="h-4 w-4" />
                                    Zaplaceno převodem
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-emerald-600/30 text-emerald-400 hover:bg-emerald-600/10 hover:text-emerald-300"
                                    onClick={() => handleMarkPaid('hotovost')}
                                >
                                    <Banknote className="h-4 w-4" />
                                    Hotově
                                </Button>
                            </div>
                        )}
                        <Button
                            asChild
                            size="icon-sm"
                            className="bg-[#ad9d8e]/15 text-[#ad9d8e] hover:bg-[#ad9d8e]/25 border border-[#ad9d8e]/25"
                        >
                            <Link href={`/faktury/${invoice.id}/upravit`}>
                                <Pencil className="h-4 w-4" />
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Invoice card */}
                <div className="rounded-xl border border-border bg-card p-8">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-foreground">
                                FAKTURA
                            </h2>
                            <p className="text-sm text-primary">
                                {invoice.invoice_number}
                            </p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-foreground">
                                {co.name}
                            </p>
                            {co.street && (
                                <p className="text-xs text-muted-foreground">
                                    {co.street}, {co.zip} {co.city}
                                </p>
                            )}
                            {co.ico && (
                                <p className="text-xs text-muted-foreground">
                                    IČO: {co.ico}
                                    {co.dic ? ` | DIČ: ${co.dic}` : ''}
                                </p>
                            )}
                        </div>
                    </div>

                    <Separator className="my-6 bg-border" />

                    {/* Customer + Dates */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <div>
                            <p className="mb-1 text-xs font-medium text-muted-foreground">
                                ODBĚRATEL
                            </p>
                            <p className="text-sm font-semibold text-foreground">
                                {invoice.customer.name}
                            </p>
                            {invoice.customer.company && (
                                <p className="text-xs text-muted-foreground">
                                    {invoice.customer.company}
                                </p>
                            )}
                            {invoice.customer.billing_street && (
                                <p className="text-xs text-muted-foreground">
                                    {invoice.customer.billing_street},{' '}
                                    {invoice.customer.billing_zip}{' '}
                                    {invoice.customer.billing_city}
                                </p>
                            )}
                            {invoice.customer.ico && (
                                <p className="text-xs text-muted-foreground">
                                    IČO: {invoice.customer.ico}
                                    {invoice.customer.dic
                                        ? ` | DIČ: ${invoice.customer.dic}`
                                        : ''}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Datum vystavení
                                </span>
                                <span className="text-muted-foreground">
                                    {formatDate(invoice.issue_date)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Datum splatnosti
                                </span>
                                <span className="text-muted-foreground">
                                    {formatDate(invoice.due_date)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Variabilní symbol
                                </span>
                                <span className="text-muted-foreground">
                                    {invoice.variable_symbol}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Způsob platby
                                </span>
                                <span className="text-muted-foreground">
                                    {invoice.payment_method === 'barter'
                                        ? 'Barter'
                                        : invoice.payment_method === 'banka'
                                        ? 'Bankovní převod'
                                        : 'Hotovost'}
                                </span>
                            </div>
                            {co.bank_account && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Číslo účtu
                                    </span>
                                    <span className="text-muted-foreground">
                                        {co.bank_account}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {invoice.reminder_count > 0 && (
                        <div className="mt-6 flex justify-end">
                            <div className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
                                invoice.reminder_count >= 3
                                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                    : invoice.reminder_count >= 2
                                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                        : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                            }`}>
                                <span>{invoice.reminder_count === 1 ? 'Připomínka odeslána' : invoice.reminder_count === 2 ? '2. upomínka odeslána' : 'Poslední upomínka odeslána'}</span>
                                {invoice.last_reminder_at && (
                                    <span className="opacity-60 text-xs">
                                        {new Date(invoice.last_reminder_at).toLocaleDateString('cs-CZ')}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    <Separator className="my-6 bg-border" />

                    {/* Items table */}
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border text-left text-xs text-muted-foreground">
                                <th className="pb-2 font-medium">Popis</th>
                                <th className="pb-2 text-right font-medium">
                                    Množství
                                </th>
                                <th className="pb-2 text-right font-medium">
                                    Cena/ks
                                </th>
                                <th className="pb-2 text-right font-medium">
                                    Celkem
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {invoice.items.map((item) => (
                                <tr
                                    key={item.id}
                                    className="border-b border-border"
                                >
                                    <td className="py-3 text-muted-foreground">
                                        {item.description}
                                    </td>
                                    <td className="py-3 text-right text-muted-foreground">
                                        {item.quantity} {item.unit}
                                    </td>
                                    <td className="py-3 text-right text-muted-foreground">
                                        {formatCurrency(item.unit_price)}
                                    </td>
                                    <td className="py-3 text-right font-medium text-muted-foreground">
                                        {formatCurrency(item.total_price)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Total */}
                    <div className="mt-4 flex justify-end">
                        <div className="w-48 space-y-1">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Základ</span>
                                <span className="text-muted-foreground">
                                    {formatCurrency(invoice.total)}
                                </span>
                            </div>
                            <Separator className="bg-border" />
                            <div className="flex justify-between">
                                <span className="text-sm font-medium text-muted-foreground">
                                    Celkem
                                </span>
                                <span className="text-lg font-bold text-primary">
                                    {formatCurrency(invoice.total)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    {invoice.notes && (
                        <>
                            <Separator className="my-6 bg-border" />
                            <p className="text-xs text-muted-foreground">
                                {invoice.notes}
                            </p>
                        </>
                    )}

                    {/* Linked order */}
                    {invoice.order && (
                        <>
                            <Separator className="my-6 bg-border" />
                            <p className="text-xs text-muted-foreground">
                                Zakázka:{' '}
                                <Link
                                    href={`/zakazky/${invoice.order.id}`}
                                    className="text-primary hover:underline"
                                >
                                    {invoice.order.title}
                                </Link>
                            </p>
                        </>
                    )}

                    {/* Linked services */}
                    {((invoice.hostings && invoice.hostings.length > 0) || (invoice.domains && invoice.domains.length > 0)) && (
                        <>
                            <Separator className="my-6 bg-border" />
                            <div>
                                <p className="text-xs text-muted-foreground mb-2">Služby:</p>
                                {invoice.hostings?.map((hosting) => (
                                    <div key={`h-${hosting.id}`} className="flex items-center gap-2 text-sm mb-1">
                                        <span className="text-blue-400">H</span>
                                        <Link
                                            href={`/hostingy/${hosting.id}`}
                                            className="text-primary hover:underline"
                                        >
                                            {hosting.name}
                                        </Link>
                                        <span className="text-muted-foreground text-xs">
                                            -- Hosting
                                            {hosting.expires_at && ` (exp. ${new Date(hosting.expires_at).toLocaleDateString('cs-CZ')})`}
                                        </span>
                                    </div>
                                ))}
                                {invoice.domains?.map((domain) => (
                                    <div key={`d-${domain.id}`} className="flex items-center gap-2 text-sm mb-1">
                                        <span className="text-emerald-400">D</span>
                                        <Link
                                            href={`/domeny/${domain.id}`}
                                            className="text-primary hover:underline"
                                        >
                                            {domain.name}
                                        </Link>
                                        <span className="text-muted-foreground text-xs">
                                            -- {domain.is_registered_by_us ? 'Naše doména' : 'Doména zákazníka'}
                                            {domain.expires_at && ` (exp. ${new Date(domain.expires_at).toLocaleDateString('cs-CZ')})`}
                                        </span>
                                    </div>
                                ))}
                                {invoice.status === 'zaplacena' && invoice.domains?.some(d => d.is_registered_by_us) && (
                                    <a
                                        href="https://portal.vas-hosting.cz"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-3 inline-flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400"
                                    >
                                        <ExternalLink className="h-4 w-4" />
                                        Obnovit domény u registrátora
                                    </a>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Spárovaná bankovní transakce */}
                {invoice.bank_transaction && (
                    <div className="rounded-lg border border-emerald-800/40 bg-emerald-950/20 p-4">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Landmark className="h-4 w-4 text-emerald-400" />
                            Spárovaná bankovní transakce
                        </h3>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                            <span className="text-muted-foreground">Datum:</span>
                            <span className="text-foreground">
                                {new Date(invoice.bank_transaction.date).toLocaleDateString('cs-CZ')}
                            </span>
                            <span className="text-muted-foreground">Částka:</span>
                            <span className="font-medium text-emerald-400">
                                {formatCurrency(invoice.bank_transaction.amount)}
                            </span>
                            <span className="text-muted-foreground">Od:</span>
                            <span className="text-foreground">
                                {invoice.bank_transaction.counter_account_name ||
                                    invoice.bank_transaction.counter_account ||
                                    '—'}
                            </span>
                            <span className="text-muted-foreground">VS:</span>
                            <span className="text-foreground">
                                {invoice.bank_transaction.variable_symbol || '—'}
                            </span>
                            {invoice.bank_transaction.description && (
                                <>
                                    <span className="text-muted-foreground">Poznámka:</span>
                                    <span className="text-foreground">
                                        {invoice.bank_transaction.description}
                                    </span>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* Manuální párování — zobrazit pouze pokud faktura není zaplacena a existují nespárované transakce */}
                {invoice.status !== 'zaplacena' && unmatchedTransactions.length > 0 && (
                    <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 p-4">
                        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Landmark className="h-4 w-4 text-amber-400" />
                            Spárovat s bankovní transakcí
                        </h3>
                        <div className="space-y-3">
                            <select
                                value={selectedBankTx}
                                onChange={(e) => setSelectedBankTx(e.target.value)}
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                                <option value="">Vyberte transakci...</option>
                                {unmatchedTransactions.map((tx) => (
                                    <option key={tx.id} value={tx.id}>
                                        {new Date(tx.date).toLocaleDateString('cs-CZ')} |{' '}
                                        {formatCurrency(tx.amount)} | VS:{' '}
                                        {tx.variable_symbol || '—'} |{' '}
                                        {tx.counter_account_name || tx.counter_account || '—'}
                                    </option>
                                ))}
                            </select>
                            <Button
                                size="sm"
                                disabled={!selectedBankTx || matchingBank}
                                onClick={handleMatchBank}
                                className="bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
                            >
                                <Landmark className="h-4 w-4" />
                                {matchingBank ? 'Páruji...' : 'Spárovat a označit jako zaplacenou'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>
            {/* Pravý sloupec — Activity Timeline */}
            <div className="lg:block">
                <div className="sticky top-24 rounded-xl border border-border bg-card p-5">
                    <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Historie
                    </h3>
                    {timelineItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Žádné záznamy.</p>
                    ) : (
                        <div className="relative border-l-2 border-border pl-0">
                            {timelineItems.map((item, idx) => {
                                const Icon = item.icon;
                                const isLast = idx === timelineItems.length - 1;
                                return (
                                    <div
                                        key={item.key}
                                        className={`relative pl-6 ${isLast ? 'pb-0' : 'pb-4'}`}
                                    >
                                        {/* Dot */}
                                        <div
                                            className={`absolute -left-[5px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-card ${item.dotColor}`}
                                        />
                                        {/* Connector line (skrytá za border-l-2 na rodiči, zde jen pro poslední item) */}
                                        {/* Content */}
                                        <div className="flex items-center gap-2 text-sm">
                                            <Icon className={`h-3.5 w-3.5 shrink-0 ${item.iconColor}`} />
                                            <span className="text-foreground leading-snug">
                                                {item.label}
                                            </span>
                                        </div>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                            {formatTimeline(item.date.toISOString())}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            </div>
            </div>
        </AuthenticatedLayout>
    );
}
