import StatusBadge, { type Status } from '@/components/ui/StatusBadge';

interface Subscription {
    id: number;
    service_type: string;
    name: string;
    status: Status;
    expires_at: string | null;
}

interface Props {
    subscriptions: Subscription[];
}

export default function CustomerServices({ subscriptions }: Props) {
    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground/70">Služby</h3>
            {subscriptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">Žádné aktivní služby</p>
            ) : (
                <div className="space-y-3">
                    {subscriptions.map((sub) => (
                        <div
                            key={sub.id}
                            className="flex items-center justify-between rounded-lg bg-accent p-3"
                        >
                            <div>
                                <p className="text-sm font-medium text-foreground/70">
                                    {sub.name}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    {sub.service_type}
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
                            <StatusBadge status={sub.status} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
