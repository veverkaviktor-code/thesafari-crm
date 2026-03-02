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
        <div className="rounded-xl border border-white/5 bg-[#1a1a22] p-5">
            <h3 className="mb-4 text-sm font-semibold text-gray-300">Služby</h3>
            {subscriptions.length === 0 ? (
                <p className="text-sm text-gray-500">Žádné aktivní služby</p>
            ) : (
                <div className="space-y-3">
                    {subscriptions.map((sub) => (
                        <div
                            key={sub.id}
                            className="flex items-center justify-between rounded-lg bg-white/[0.03] p-3"
                        >
                            <div>
                                <p className="text-sm font-medium text-gray-300">
                                    {sub.name}
                                </p>
                                <p className="text-xs text-gray-500">
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
