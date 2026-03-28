import { Link } from '@inertiajs/react';
import { AtSign, HardDrive, Server } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface HostingItem {
    id: number;
    name: string;
    status: string;
    expires_at: string | null;
}

interface DomainItem {
    id: number;
    name: string;
    status: string;
    is_registered_by_us: boolean;
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
    hostings: HostingItem[];
    domains: DomainItem[];
    vpsServers?: VpsServer[];
}

const statusMap: Record<string, { label: string; className: string }> = {
    aktivni: { label: 'Aktivní', className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25' },
    pozastaveno: { label: 'Pozastaveno', className: 'bg-amber-500/15 text-amber-400 border-amber-500/25' },
    zruseno: { label: 'Zrušeno', className: 'bg-red-500/15 text-red-400 border-red-500/25' },
};

export default function CustomerServices({ hostings, domains, vpsServers = [] }: Props) {
    const totalCount = hostings.length + domains.length + vpsServers.length;

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground/70">
                Služby {totalCount > 0 && <span className="text-muted-foreground">({totalCount})</span>}
            </h3>
            {totalCount === 0 ? (
                <p className="text-sm text-muted-foreground">Žádné aktivní služby</p>
            ) : (
                <div className="max-h-[400px] space-y-4 overflow-y-auto pr-1">
                    {/* VPS Servery */}
                    {vpsServers.length > 0 && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <HardDrive className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-xs font-medium text-muted-foreground">VPS ({vpsServers.length})</span>
                            </div>
                            <div className="space-y-2">
                                {vpsServers.map((vps) => (
                                    <Link
                                        key={`vps-${vps.id}`}
                                        href="/vps"
                                        className="flex items-center justify-between rounded-lg bg-accent p-3 transition-colors hover:bg-accent/80"
                                    >
                                        <div className="flex items-center gap-2">
                                            <HardDrive className="h-4 w-4 text-amber-500" />
                                            <div>
                                                <p className="text-sm font-medium text-foreground/70">
                                                    {vps.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {vps.hostings_count} hostingů &middot; {formatCurrency(vps.price_yearly)}/rok
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
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Hostingy */}
                    {hostings.length > 0 && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <Server className="h-3.5 w-3.5 text-blue-400" />
                                <span className="text-xs font-medium text-muted-foreground">Hostingy ({hostings.length})</span>
                            </div>
                            <div className="space-y-2">
                                {hostings.map((hosting) => {
                                    const statusInfo = statusMap[hosting.status];
                                    return (
                                        <Link
                                            key={`h-${hosting.id}`}
                                            href={`/hostingy/${hosting.id}`}
                                            className="flex items-center justify-between rounded-lg bg-accent p-3 transition-colors hover:bg-accent/80"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-foreground/70">
                                                    {hosting.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Hosting
                                                    {hosting.expires_at && (
                                                        <>
                                                            {' '}&middot; do{' '}
                                                            {new Date(hosting.expires_at).toLocaleDateString('cs-CZ')}
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
                        </div>
                    )}

                    {/* Domény */}
                    {domains.length > 0 && (
                        <div>
                            <div className="flex items-center gap-1.5 mb-2">
                                <AtSign className="h-3.5 w-3.5 text-emerald-400" />
                                <span className="text-xs font-medium text-muted-foreground">Domény ({domains.length})</span>
                            </div>
                            <div className="space-y-2">
                                {domains.map((domain) => {
                                    const statusInfo = statusMap[domain.status];
                                    return (
                                        <Link
                                            key={`d-${domain.id}`}
                                            href={`/domeny/${domain.id}`}
                                            className="flex items-center justify-between rounded-lg bg-accent p-3 transition-colors hover:bg-accent/80"
                                        >
                                            <div>
                                                <p className="text-sm font-medium text-foreground/70">
                                                    {domain.name}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {domain.is_registered_by_us ? 'Naše doména' : 'Doména zákazníka'}
                                                    {domain.expires_at && (
                                                        <>
                                                            {' '}&middot; do{' '}
                                                            {new Date(domain.expires_at).toLocaleDateString('cs-CZ')}
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
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
