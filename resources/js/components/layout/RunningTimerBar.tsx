import { useEffect, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RunningTimer {
    id: number;
    order_id: number;
    started_at: string;
    description: string | null;
    hourly_rate: number;
    order: {
        id: number;
        title: string;
        customer?: {
            id: number;
            name: string;
        };
    };
}

interface Props {
    timer: RunningTimer | null;
}

function formatElapsed(startedAt: string): string {
    const diff = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    const h = Math.floor(diff / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function RunningTimerBar({ timer }: Props) {
    const [elapsed, setElapsed] = useState(() =>
        timer ? formatElapsed(timer.started_at) : '00:00:00',
    );

    useEffect(() => {
        if (!timer) return;
        const interval = setInterval(() => {
            setElapsed(formatElapsed(timer.started_at));
        }, 1000);
        return () => clearInterval(interval);
    }, [timer]);

    if (!timer) return null;

    const handleStop = () => {
        router.put(`/zakazky/${timer.order_id}/time-entries/${timer.id}/stop`, {}, {
            preserveScroll: true,
        });
    };

    const customerName = timer.order.customer?.name;

    return (
        <div
            className="sticky top-0 z-40 flex items-center gap-4 px-4 py-2 shadow-sm"
            style={{ backgroundColor: '#628395' }}
        >
            {/* Pulse indicator */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span
                    className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                    style={{ backgroundColor: '#DFD5A5' }}
                />
                <span
                    className="relative inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: '#DFD5A5' }}
                />
            </span>

            {/* Customer + Order link */}
            <div className="flex items-baseline gap-1.5 truncate">
                {customerName && (
                    <span className="text-sm font-medium" style={{ color: '#DFD5A5' }}>
                        {customerName}
                        <span className="mx-1.5 opacity-50">/</span>
                    </span>
                )}
                <Link
                    href={`/zakazky/${timer.order_id}`}
                    className="truncate text-sm font-semibold text-white hover:underline"
                >
                    {timer.order.title}
                </Link>
            </div>

            {/* Description */}
            {timer.description && (
                <span className="hidden truncate text-sm sm:block" style={{ color: '#DFD5A5' }}>
                    — {timer.description}
                </span>
            )}

            <div className="ml-auto flex items-center gap-4">
                {/* Hourly rate */}
                <span className="hidden text-xs sm:block" style={{ color: '#DFD5A5' }}>
                    {new Intl.NumberFormat('cs-CZ').format(timer.hourly_rate)} Kč/hod
                </span>

                {/* Elapsed time */}
                <span className="font-mono text-sm font-bold tabular-nums text-white">
                    {elapsed}
                </span>

                {/* Stop button */}
                <Button
                    size="sm"
                    onClick={handleStop}
                    className="h-7 gap-1.5 border px-3 text-xs font-semibold text-white hover:opacity-90"
                    style={{
                        backgroundColor: '#CF995F',
                        borderColor: 'rgba(255,255,255,0.2)',
                    }}
                >
                    <Square className="h-3 w-3 fill-current" />
                    Stop
                </Button>
            </div>
        </div>
    );
}
