import { useState } from 'react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Mail, Activity, AlertTriangle, CheckCircle, XCircle, ScrollText } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface EmailLog {
    id: number;
    recipient_email: string;
    subject: string;
    type: string;
    status: string;
    error_message: string | null;
    sent_at: string;
    created_at: string;
    invoice?: { id: number; invoice_number: string } | null;
    customer?: { id: number; name: string; company: string | null } | null;
}

interface ActivityLog {
    id: number;
    description: string;
    subject_type: string | null;
    subject_id: number | null;
    causer_type: string;
    properties: Record<string, unknown>;
    created_at: string;
}

interface ErrorLog {
    timestamp: string;
    message: string;
}

interface Props {
    emailLogs: EmailLog[];
    activityLogs: ActivityLog[];
    errorLogs: ErrorLog[];
}

const typeBadge: Record<string, { label: string; className: string }> = {
    invoice: { label: 'Faktura', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/30' },
    reminder: { label: 'Upomínka', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
    payment_thanks: { label: 'Platba', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
    test: { label: 'Test', className: 'bg-gray-500/15 text-gray-400 border border-gray-500/30' },
};

function formatDateTime(dateStr: string): string {
    try {
        return format(new Date(dateStr), 'd. M. yyyy HH:mm', { locale: cs });
    } catch {
        return dateStr;
    }
}

function formatRelativeTime(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Právě teď';
    if (minutes < 60) return `Před ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Před ${hours} hod`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Včera';
    return `Před ${days} dny`;
}

export default function LogsIndex({ emailLogs, activityLogs, errorLogs }: Props) {
    const failedEmails = emailLogs.filter(e => e.status === 'failed').length;

    return (
        <AuthenticatedLayout
            title="Logy"
            breadcrumbs={[{ label: 'Logy' }]}
        >
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                        Systémové logy
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Přehled emailů, aktivity a systémových chyb
                    </p>
                </div>

                <Tabs defaultValue="email">
                    <TabsList className="bg-muted">
                        <TabsTrigger value="email" className="gap-2">
                            <Mail className="h-4 w-4" />
                            Emaily ({emailLogs.length})
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="gap-2">
                            <Activity className="h-4 w-4" />
                            Aktivita ({activityLogs.length})
                        </TabsTrigger>
                        <TabsTrigger value="errors" className="gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Chyby ({errorLogs.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Email Logs Tab */}
                    <TabsContent value="email">
                        <Card className="border-border bg-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Mail className="h-5 w-5 text-primary" />
                                    Historie odeslaných emailů
                                    {failedEmails > 0 && (
                                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
                                            {failedEmails} selhalo
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {emailLogs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-4 py-16">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
                                            <Mail className="h-7 w-7 text-muted-foreground/50" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-medium text-foreground">Zatím žádné emaily</p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Email logy se začnou zaznamenávat po odeslání prvního emailu.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b border-border text-left">
                                                    <th className="px-3 py-2.5 font-medium text-muted-foreground">Datum</th>
                                                    <th className="px-3 py-2.5 font-medium text-muted-foreground">Typ</th>
                                                    <th className="px-3 py-2.5 font-medium text-muted-foreground">Příjemce</th>
                                                    <th className="px-3 py-2.5 font-medium text-muted-foreground">Předmět</th>
                                                    <th className="px-3 py-2.5 font-medium text-muted-foreground">Faktura</th>
                                                    <th className="px-3 py-2.5 font-medium text-muted-foreground">Stav</th>
                                                    <th className="px-3 py-2.5 font-medium text-muted-foreground">Chyba</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {emailLogs.map((log) => {
                                                    const badge = typeBadge[log.type] ?? { label: log.type, className: 'bg-gray-500/15 text-gray-400 border border-gray-500/30' };
                                                    return (
                                                        <tr
                                                            key={log.id}
                                                            className={cn(
                                                                'border-b border-border/50 transition-colors hover:bg-accent/30',
                                                                log.status === 'failed' && 'bg-red-500/5',
                                                            )}
                                                        >
                                                            <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">
                                                                {formatDateTime(log.sent_at || log.created_at)}
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                <span className={cn('inline-flex rounded-md px-2 py-0.5 text-xs font-medium', badge.className)}>
                                                                    {badge.label}
                                                                </span>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-foreground">
                                                                <div>
                                                                    {log.customer?.name && (
                                                                        <span className="text-foreground">{log.customer.name}</span>
                                                                    )}
                                                                    <span className="block text-xs text-muted-foreground">
                                                                        {log.recipient_email}
                                                                    </span>
                                                                </div>
                                                            </td>
                                                            <td className="max-w-[300px] truncate px-3 py-2.5 text-foreground">
                                                                {log.subject}
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                {log.invoice ? (
                                                                    <a
                                                                        href={`/faktury/${log.invoice.id}`}
                                                                        className="text-primary hover:underline"
                                                                    >
                                                                        {log.invoice.invoice_number}
                                                                    </a>
                                                                ) : (
                                                                    <span className="text-muted-foreground">-</span>
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                {log.status === 'sent' ? (
                                                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400 border border-emerald-500/30">
                                                                        <CheckCircle className="h-3 w-3" />
                                                                        Odesláno
                                                                    </span>
                                                                ) : (
                                                                    <span className="inline-flex items-center gap-1 rounded-md bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400 border border-red-500/30">
                                                                        <XCircle className="h-3 w-3" />
                                                                        Selhalo
                                                                    </span>
                                                                )}
                                                            </td>
                                                            <td className="max-w-[200px] truncate px-3 py-2.5 text-xs text-red-400">
                                                                {log.error_message || ''}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Activity Logs Tab */}
                    <TabsContent value="activity">
                        <Card className="border-border bg-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <Activity className="h-5 w-5 text-primary" />
                                    Aktivita systému
                                    <span className="text-sm font-normal text-muted-foreground">(posledních 7 dní)</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {activityLogs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-4 py-16">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
                                            <Activity className="h-7 w-7 text-muted-foreground/50" />
                                        </div>
                                        <p className="font-medium text-foreground">Žádná aktivita</p>
                                    </div>
                                ) : (
                                    <div className="space-y-0">
                                        {activityLogs.map((log) => (
                                            <div
                                                key={log.id}
                                                className="flex items-start gap-3 border-b border-border/50 px-1 py-3 last:border-b-0"
                                            >
                                                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent">
                                                    <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <p className="text-sm text-foreground">
                                                            {log.description}
                                                            {log.subject_type && (
                                                                <span className="ml-1 text-muted-foreground">
                                                                    ({log.subject_type}
                                                                    {log.subject_id ? ` #${log.subject_id}` : ''})
                                                                </span>
                                                            )}
                                                        </p>
                                                        <span className="shrink-0 text-xs text-muted-foreground/60">
                                                            {formatRelativeTime(log.created_at)}
                                                        </span>
                                                    </div>
                                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                                        {log.causer_type}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Error Logs Tab */}
                    <TabsContent value="errors">
                        <Card className="border-border bg-card">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <AlertTriangle className="h-5 w-5 text-red-400" />
                                    Systémové chyby
                                    {errorLogs.length > 0 && (
                                        <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
                                            {errorLogs.length}
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {errorLogs.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center gap-4 py-16">
                                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10">
                                            <CheckCircle className="h-7 w-7 text-emerald-500/50" />
                                        </div>
                                        <div className="text-center">
                                            <p className="font-medium text-foreground">Žádné chyby</p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                                Systém běží bez chyb.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {errorLogs.map((error, index) => (
                                            <div
                                                key={index}
                                                className="rounded-lg border border-red-500/20 bg-red-500/5 p-3"
                                            >
                                                <div className="mb-1 flex items-center gap-2">
                                                    <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                                                    <span className="text-xs font-medium text-red-400">
                                                        {error.timestamp}
                                                    </span>
                                                </div>
                                                <pre className="whitespace-pre-wrap break-all font-mono text-xs text-red-300/80 leading-relaxed">
                                                    {error.message}
                                                </pre>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AuthenticatedLayout>
    );
}
