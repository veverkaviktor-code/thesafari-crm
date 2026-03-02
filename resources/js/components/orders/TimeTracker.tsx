import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Clock, Pause, Play, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface TimeEntry {
    id: number;
    started_at: string;
    stopped_at: string | null;
    description: string | null;
    duration_minutes: number;
    hourly_rate: number | null;
    cost: number;
}

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
    }).format(v);

function formatDuration(totalSeconds: number): string {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

function formatHoursMinutes(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m} min`;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

interface Props {
    orderId: number;
    timeEntries: TimeEntry[];
    runningTimer: TimeEntry | null;
    totalTimeMinutes: number;
    totalTimeCost: number;
}

export default function TimeTracker({
    orderId,
    timeEntries,
    runningTimer,
    totalTimeMinutes,
    totalTimeCost,
}: Props) {
    const [elapsed, setElapsed] = useState(0);
    const [description, setDescription] = useState('');
    const [hourlyRate, setHourlyRate] = useState('500');
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isRunning = !!runningTimer;

    // Calculate and update elapsed time for running timer
    useEffect(() => {
        if (runningTimer) {
            const startTime = new Date(runningTimer.started_at).getTime();
            const updateElapsed = () => {
                const now = Date.now();
                setElapsed(Math.floor((now - startTime) / 1000));
            };
            updateElapsed();
            intervalRef.current = setInterval(updateElapsed, 1000);
            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        } else {
            setElapsed(0);
        }
    }, [runningTimer]);

    const handleStart = () => {
        router.post(
            `/zakazky/${orderId}/time-entries`,
            {
                description: description || null,
                hourly_rate: Number(hourlyRate) || null,
            },
            { preserveScroll: true },
        );
    };

    const handleStop = () => {
        if (!runningTimer) return;
        router.put(
            `/zakazky/${orderId}/time-entries/${runningTimer.id}/stop`,
            {},
            { preserveScroll: true },
        );
    };

    const handleDelete = (entryId: number) => {
        router.delete(`/zakazky/${orderId}/time-entries/${entryId}`, {
            preserveScroll: true,
        });
    };

    return (
        <div className="rounded-xl border border-[#F5F0E8]/[0.05] bg-[#16140f] p-5">
            <h3 className="mb-4 text-sm font-semibold text-[#F5F0E8]/70">
                Sledování času
            </h3>

            {/* Timer display + controls */}
            <div className="mb-4 flex flex-col items-center gap-4">
                {/* Timer circle */}
                <button
                    onClick={isRunning ? handleStop : handleStart}
                    className={cn(
                        'group flex h-24 w-24 items-center justify-center rounded-full border-2 transition-all',
                        isRunning
                            ? 'animate-pulse border-[#D97706] bg-[#D97706]/10 hover:bg-[#D97706]/20'
                            : 'border-[#F5F0E8]/[0.06] bg-[#F5F0E8]/[0.04] hover:border-[#D97706] hover:bg-[#D97706]/10',
                    )}
                >
                    {isRunning ? (
                        <Pause className="h-8 w-8 text-[#D97706]" />
                    ) : (
                        <Play className="h-8 w-8 text-[#9C9585] transition-colors group-hover:text-[#D97706]" />
                    )}
                </button>

                {/* Time display */}
                <div className="text-center">
                    <p
                        className={cn(
                            'font-mono text-3xl font-bold',
                            isRunning ? 'text-[#D97706]' : 'text-[#6B6560]',
                        )}
                    >
                        {formatDuration(elapsed)}
                    </p>
                    {isRunning && (
                        <p className="mt-1 text-xs text-[#6B6560]">
                            Probíhá měření...
                        </p>
                    )}
                </div>

                {/* Input fields (show when not running) */}
                {!isRunning && (
                    <div className="flex w-full gap-2">
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Popis práce..."
                            className="border-[#F5F0E8]/[0.06] bg-[#F5F0E8]/[0.04]"
                        />
                        <div className="relative w-28 shrink-0">
                            <Input
                                value={hourlyRate}
                                onChange={(e) => setHourlyRate(e.target.value)}
                                type="number"
                                min="0"
                                className="border-[#F5F0E8]/[0.06] bg-[#F5F0E8]/[0.04] pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#6B6560]">
                                Kč/h
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Time entries list */}
            {timeEntries.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-medium text-[#6B6560]">
                        Historie
                    </h4>
                    {timeEntries.map((entry) => (
                        <div
                            key={entry.id}
                            className="flex items-center justify-between rounded-lg bg-white/[0.03] p-3"
                        >
                            <div className="flex items-center gap-3">
                                <Clock className="h-3.5 w-3.5 shrink-0 text-[#6B6560]" />
                                <div>
                                    <p className="text-sm text-[#F5F0E8]/70">
                                        {entry.description || 'Bez popisu'}
                                    </p>
                                    <p className="text-xs text-[#6B6560]">
                                        {new Date(
                                            entry.started_at,
                                        ).toLocaleDateString('cs-CZ')}{' '}
                                        &middot;{' '}
                                        {formatHoursMinutes(
                                            entry.duration_minutes,
                                        )}
                                        {entry.hourly_rate
                                            ? ` &middot; ${entry.hourly_rate} Kč/h`
                                            : ''}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white">
                                    {formatCurrency(entry.cost)}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="text-[#6B6560] hover:text-red-400"
                                    onClick={() => handleDelete(entry.id)}
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Totals */}
            <div className="mt-4 space-y-2 border-t border-[#F5F0E8]/[0.05] pt-3">
                <div className="flex items-center justify-between">
                    <span className="text-sm text-[#9C9585]">Celkem hodin</span>
                    <span className="text-sm font-medium text-white">
                        {formatHoursMinutes(totalTimeMinutes)}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-sm text-[#9C9585]">
                        Celkem za čas
                    </span>
                    <span className="text-sm font-semibold text-[#D97706]">
                        {formatCurrency(totalTimeCost)}
                    </span>
                </div>
            </div>
        </div>
    );
}
