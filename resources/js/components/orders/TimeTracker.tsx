import { useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Check, Clock, Pause, Pencil, Play, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatCurrency } from '@/lib/utils';

interface TimeEntry {
    id: number;
    started_at: string;
    stopped_at: string | null;
    description: string | null;
    duration_minutes: number;
    hourly_rate: number | null;
    billable_hours: number;
    cost: number;
}

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

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState({
        description: '',
        duration_minutes: '',
        hourly_rate: '',
    });

    const isRunning = !!runningTimer;

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

    const handleEditStart = (entry: TimeEntry) => {
        setEditingId(entry.id);
        setEditForm({
            description: entry.description ?? '',
            duration_minutes: String(entry.duration_minutes),
            hourly_rate: String(entry.hourly_rate ?? ''),
        });
    };

    const handleEditCancel = () => {
        setEditingId(null);
    };

    const handleUpdate = (entryId: number) => {
        router.put(
            `/zakazky/${orderId}/time-entries/${entryId}`,
            {
                description: editForm.description || null,
                duration_minutes: Number(editForm.duration_minutes),
                hourly_rate: Number(editForm.hourly_rate) || null,
            },
            {
                preserveScroll: true,
                onSuccess: () => setEditingId(null),
            },
        );
    };

    const editCost =
        (Number(editForm.duration_minutes) / 60) * Number(editForm.hourly_rate);

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-3 text-sm font-semibold text-foreground/70">
                Sledování času
            </h3>

            {/* Timer display + controls */}
            <div className="mb-4 flex items-center gap-4">
                {/* Timer button */}
                <button
                    onClick={isRunning ? handleStop : handleStart}
                    className={cn(
                        'group flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 transition-all',
                        isRunning
                            ? 'animate-pulse border-primary bg-primary/10 hover:bg-primary/20'
                            : 'border-border bg-accent hover:border-primary hover:bg-primary/10',
                    )}
                >
                    {isRunning ? (
                        <Pause className="h-5 w-5 text-primary" />
                    ) : (
                        <Play className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                    )}
                </button>

                {/* Time display */}
                <p
                    className={cn(
                        'shrink-0 font-mono text-xl font-bold',
                        isRunning ? 'text-primary' : 'text-muted-foreground',
                    )}
                >
                    {formatDuration(elapsed)}
                </p>

                {/* Input fields (show when not running) */}
                {!isRunning && (
                    <div className="flex min-w-0 flex-1 gap-2">
                        <Input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Popis práce..."
                            className="border-border bg-accent"
                        />
                        <div className="relative w-28 shrink-0">
                            <Input
                                value={hourlyRate}
                                onChange={(e) => setHourlyRate(e.target.value)}
                                type="number"
                                min="0"
                                className="border-border bg-accent pr-12"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                Kč/h
                            </span>
                        </div>
                    </div>
                )}

                {isRunning && (
                    <span className="text-xs text-muted-foreground">Měření...</span>
                )}
            </div>

            {/* Time entries list */}
            {timeEntries.length > 0 && (
                <div className="space-y-2">
                    <h4 className="text-xs font-medium text-muted-foreground">
                        Historie
                    </h4>
                    {timeEntries.map((entry) =>
                        editingId === entry.id ? (
                            <div
                                key={entry.id}
                                className="rounded-lg border border-primary/30 bg-accent p-3"
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') handleEditCancel();
                                }}
                            >
                                <div className="space-y-2">
                                    <Input
                                        value={editForm.description}
                                        onChange={(e) =>
                                            setEditForm((f) => ({
                                                ...f,
                                                description: e.target.value,
                                            }))
                                        }
                                        placeholder="Popis práce..."
                                        className="border-border bg-card text-sm"
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <div className="relative flex-1">
                                            <Input
                                                value={editForm.duration_minutes}
                                                onChange={(e) =>
                                                    setEditForm((f) => ({
                                                        ...f,
                                                        duration_minutes: e.target.value,
                                                    }))
                                                }
                                                type="number"
                                                min="0"
                                                className="border-border bg-card pr-10 text-sm"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                                min
                                            </span>
                                        </div>
                                        <div className="relative flex-1">
                                            <Input
                                                value={editForm.hourly_rate}
                                                onChange={(e) =>
                                                    setEditForm((f) => ({
                                                        ...f,
                                                        hourly_rate: e.target.value,
                                                    }))
                                                }
                                                type="number"
                                                min="0"
                                                className="border-border bg-card pr-12 text-sm"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                                Kč/h
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            Cena:{' '}
                                            <span className="font-medium text-primary">
                                                {formatCurrency(
                                                    isNaN(editCost) ? 0 : editCost,
                                                )}
                                            </span>
                                        </span>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon-xs"
                                                className="text-muted-foreground hover:text-foreground"
                                                onClick={handleEditCancel}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-xs"
                                                className="text-primary hover:text-primary/80"
                                                onClick={() => handleUpdate(entry.id)}
                                            >
                                                <Check className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div
                                key={entry.id}
                                className="flex items-center justify-between rounded-lg bg-accent p-3"
                            >
                                <div className="flex items-center gap-3">
                                    <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-foreground/70">
                                            {entry.description || 'Bez popisu'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(
                                                entry.started_at,
                                            ).toLocaleDateString('cs-CZ')}{' '}
                                            &middot;{' '}
                                            {formatHoursMinutes(
                                                entry.duration_minutes,
                                            )}
                                            {entry.billable_hours > 0
                                                ? ` → ${entry.billable_hours}h účtováno`
                                                : ''}
                                            {entry.hourly_rate
                                                ? ` · ${Number(entry.hourly_rate).toLocaleString('cs-CZ')} Kč/h`
                                                : ''}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">
                                        {formatCurrency(entry.cost)}
                                    </span>
                                    <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        className="text-muted-foreground hover:text-foreground"
                                        onClick={() => handleEditStart(entry)}
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-xs"
                                        className="text-muted-foreground hover:text-red-400"
                                        onClick={() => handleDelete(entry.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ),
                    )}
                </div>
            )}

            {/* Totals */}
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm text-muted-foreground">Odpracováno</span>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-foreground">
                        {formatHoursMinutes(totalTimeMinutes ?? 0)}
                    </span>
                    {(totalTimeCost ?? 0) > 0 && (
                        <span className="text-sm font-semibold text-primary">
                            {formatCurrency(totalTimeCost)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
