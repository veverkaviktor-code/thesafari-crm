import { Link } from '@inertiajs/react';
import { Server } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

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
    subscriptions: Subscription[];
    vpsServers?: VpsServer[];
}

const statusMap: Record<string, { label: string; className: string }> = {
    aktivni: { label: 'Aktivní', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
    pozastaveno: { label: 'Pozastaveno', className: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    zruseno: { label: 'Zrušeno', className: 'bg-red-500/15 text-red-400 border-red-500/25' },
};

const typeLabels: Record<string, string> = {
    hosting: 'Hosting',
    domena: 'Doména',
    sluzba: 'Služba',
};

export default function CustomerServices({ subscriptions, vpsServers = [] }: Props) {
    const hasItems = subscriptions.length > 0 || vpsServers.length > 0;
    const totalCount = subscriptions.length + vpsServers.length;

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground/70">
                Služby {totalCount > 0 && <span className="text-muted-foreground">({totalCount})</span>}
            </h3>
            {!hasItems ? (
                <p className="text-sm text-muted-foreground">Žádné aktivní služby</p>
            ) : (
                <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1">
                    {vpsServers.map((vps) => (
                        <div
                            key={`vps-${vps.id}`}
                            className="flex items-center justify-between rounded-lg bg-accent p-3"
                        >
                            <div className="flex items-center gap-2">
                                <Server className="h-4 w-4 text-amber-500" />
                                <div>
                                    <p className="text-sm font-medium text-foreground/70">
                                        {vps.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        VPS &middot; {vps.hostings_count} hostingů &middot; {formatCurrency(vps.price_yearly)}/rok
                                    </p>
                                </div>
                            </div>
                            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                vps.status === 'aktivni'
                                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25'
                                    : 'bg-zinc-500/15 text-zinc-400 border-zinc-500/25'
                            }`}>
                                {vps.status === 'aktivni' ? 'Aktivní' : 'Neaktivní'}
                            </span>
                        </div>
                    ))}
                    {subscriptions.map((sub) => {
                        const statusInfo = statusMap[sub.status];
                        return (
                            <Link
                                key={sub.id}
                                href={`/neniweb/${sub.id}`}
                                className="flex items-center justify-between rounded-lg bg-accent p-3 transition-colors hover:bg-accent/80"
                            >
                                <div>
                                    <p className="text-sm font-medium text-foreground/70">
                                        {sub.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {typeLabels[sub.type] ?? sub.type}
                                        {sub.expires_at && (
                                            <>
                                                {' '}
                                                &middot; do{' '}
                                                {new Date(
                                                    sub.expires_at,
                                                ).toLocaleDateString('cs-CZ')}
                                            </>
                                        )}
                                    </p>
                                </div>
                                {statusInfo && (
                                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${statusInfo.className}`}>
                                        {statusInfo.label}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
