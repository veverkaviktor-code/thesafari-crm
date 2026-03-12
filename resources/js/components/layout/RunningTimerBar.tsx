import { useEffect, useState } from 'react';
import { Link, router } from '@inertiajs/react';
import { Pause, Play, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface RunningTimer {
    id: number;
    order_id: number;
    started_at: string;
    description: string | null;
    hourly_rate: number;
    paused_at: string | null;
    total_paused_seconds: number;
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

function formatElapsed(startedAt: string, pausedAt: string | null, totalPausedSeconds: number): string {
    const totalSeconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
    let paused = totalPausedSeconds;
    if (pausedAt) {
        paused += Math.floor((Date.now() - new Date(pausedAt).getTime()) / 1000);
    }
    const effective = Math.max(0, totalSeconds - paused);
    const h = Math.floor(effective / 3600);
    const m = Math.floor((effective % 3600) / 60);
    const s = effective % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function RunningTimerBar({ timer }: Props) {
    const [elapsed, setElapsed] = useState(() =>
        timer ? formatElapsed(timer.started_at, timer.paused_at, timer.total_paused_seconds ?? 0) : '00:00:00',
    );

    const isPaused = !!timer?.paused_at;

    useEffect(() => {
        if (!timer) return;
        if (isPaused) {
            // When paused, calculate once and don't update
            setElapsed(formatElapsed(timer.started_at, timer.paused_at, timer.total_paused_seconds ?? 0));
            return;
        }
        const interval = setInterval(() => {
            setElapsed(formatElapsed(timer.started_at, timer.paused_at, timer.total_paused_seconds ?? 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [timer, isPaused]);

    if (!timer) return null;

    const handlePause = () => {
        router.put(`/zakazky/${timer.order_id}/time-entries/${timer.id}/pause`, {}, {
            preserveScroll: true,
        });
    };

    const handleResume = () => {
        router.put(`/zakazky/${timer.order_id}/time-entries/${timer.id}/resume`, {}, {
            preserveScroll: true,
        });
    };

    const handleStop = () => {
        router.put(`/zakazky/${timer.order_id}/time-entries/${timer.id}/stop`, {}, {
            preserveScroll: true,
        });
    };

    const customerName = timer.order.customer?.name;

    return (
        <div
            className="sticky top-0 z-40 flex items-center gap-4 px-4 py-2 shadow-sm"
            style={{ backgroundColor: isPaused ? '#4a5568' : '#628395' }}
        >
            {/* Pulse indicator — static when paused */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
                {!isPaused && (
                    <span
                        className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                        style={{ backgroundColor: '#DFD5A5' }}
                    />
                )}
                <span
                    className="relative inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: isPaused ? '#a0aec0' : '#DFD5A5' }}
                />
            </span>

            {/* Customer + Order link */}
            <div className="flex min-w-0 items-baseline gap-1.5 truncate">
                {customerName && (
                    <span className="hidden text-sm font-medium sm:inline" style={{ color: '#DFD5A5' }}>
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

            {/* Status label when paused */}
            {isPaused && (
                <span className="hidden text-xs font-medium text-amber-300 sm:block">PAUZA</span>
            )}

            <div className="ml-auto flex items-center gap-3">
                {/* Hourly rate */}
                <span className="hidden text-xs sm:block" style={{ color: '#DFD5A5' }}>
                    {new Intl.NumberFormat('cs-CZ').format(timer.hourly_rate)} Kč/hod
                </span>

                {/* Elapsed time */}
                <span className={`font-mono text-sm font-bold tabular-nums ${isPaused ? 'text-gray-300' : 'text-white'}`}>
                    {elapsed}
                </span>

                {/* Pause/Resume button */}
                {isPaused ? (
                    <Button
                        size="sm"
                        onClick={handleResume}
                        className="h-7 gap-1.5 border px-3 text-xs font-semibold text-white hover:opacity-90"
                        style={{
                            backgroundColor: '#48bb78',
                            borderColor: 'rgba(255,255,255,0.2)',
                        }}
                    >
                        <Play className="h-3 w-3 fill-current" />
                        Pokračovat
                    </Button>
                ) : (
                    <Button
                        size="sm"
                        onClick={handlePause}
                        className="h-7 gap-1.5 border px-3 text-xs font-semibold text-white hover:opacity-90"
                        style={{
                            backgroundColor: '#CF995F',
                            borderColor: 'rgba(255,255,255,0.2)',
                        }}
                    >
                        <Pause className="h-3 w-3 fill-current" />
                        Pauza
                    </Button>
                )}

                {/* Stop button */}
                <Button
                    size="sm"
                    onClick={handleStop}
                    className="h-7 gap-1.5 border px-3 text-xs font-semibold text-white hover:opacity-90"
                    style={{
                        backgroundColor: '#e53e3e',
                        borderColor: 'rgba(255,255,255,0.2)',
                    }}
                >
                    <Square className="h-3 w-3 fill-current" />
                    Hotovo
                </Button>
            </div>
        </div>
    );
}
