import { useState } from 'react';
import {
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    format,
    isSameMonth,
    isSameDay,
    isToday,
} from 'date-fns';
import { cs } from 'date-fns/locale';
import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn, formatCurrency } from '@/lib/utils';

interface CalendarEvent {
    id: number;
    title: string;
    date: string;
    type: 'task' | 'subscription' | 'invoice';
    priority?: string;
    subtype?: string;
    total?: number;
}

interface CalendarGridProps {
    events: CalendarEvent[];
    onTaskClick?: (taskId: number) => void;
}

const DOT_COLORS: Record<CalendarEvent['type'], string> = {
    task: 'bg-amber-500',
    invoice: 'bg-blue-500',
    subscription: 'bg-emerald-500',
};

const EVENT_TYPE_LABELS: Record<CalendarEvent['type'], string> = {
    task: 'Úkol',
    invoice: 'Faktura',
    subscription: 'Předplatné',
};

const DAY_HEADERS = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];

export default function CalendarGrid({ events, onTaskClick }: CalendarGridProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

    const eventsByDate = events.reduce<Record<string, CalendarEvent[]>>((acc, ev) => {
        if (!acc[ev.date]) acc[ev.date] = [];
        acc[ev.date].push(ev);
        return acc;
    }, {});

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* Navigation header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth((d) => subMonths(d, 1))}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                <h3 className="text-sm font-semibold capitalize text-foreground">
                    {format(currentMonth, 'LLLL yyyy', { locale: cs })}
                </h3>

                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCurrentMonth((d) => addMonths(d, 1))}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-border">
                {DAY_HEADERS.map((day) => (
                    <div
                        key={day}
                        className="py-2 text-center text-xs font-medium text-muted-foreground"
                    >
                        {day}
                    </div>
                ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7">
                {days.map((day, idx) => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const dayEvents = eventsByDate[dateKey] ?? [];
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isDayToday = isToday(day);
                    const hasEvents = dayEvents.length > 0;
                    const isLastRow = idx >= days.length - 7;

                    const cell = (
                        <div
                            className={cn(
                                'min-h-[80px] p-1.5 border-b border-r border-border',
                                isLastRow && 'border-b-0',
                                (idx + 1) % 7 === 0 && 'border-r-0',
                                !isCurrentMonth && 'opacity-40',
                                isDayToday && 'bg-accent/30',
                            )}
                        >
                            {/* Day number */}
                            <div className="flex items-start justify-between">
                                <span
                                    className={cn(
                                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                                        isDayToday
                                            ? 'bg-primary text-primary-foreground ring-2 ring-primary/30'
                                            : 'text-foreground/70',
                                    )}
                                >
                                    {format(day, 'd')}
                                </span>
                            </div>

                            {/* Event dots */}
                            {hasEvents && (
                                <div className="mt-1 flex flex-wrap gap-1">
                                    {dayEvents.slice(0, 5).map((ev, i) => (
                                        <span
                                            key={i}
                                            className={cn(
                                                'block h-1.5 w-1.5 rounded-full',
                                                DOT_COLORS[ev.type],
                                            )}
                                        />
                                    ))}
                                    {dayEvents.length > 5 && (
                                        <span className="text-[9px] text-muted-foreground leading-none mt-0.5">
                                            +{dayEvents.length - 5}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    );

                    if (!hasEvents) return <div key={dateKey}>{cell}</div>;

                    return (
                        <Popover key={dateKey}>
                            <PopoverTrigger asChild>
                                <div className="cursor-pointer transition-colors hover:bg-accent/20">
                                    {cell}
                                </div>
                            </PopoverTrigger>
                            <PopoverContent
                                className="w-64 p-3 bg-card border-border shadow-xl"
                                align="start"
                                side="bottom"
                            >
                                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    {format(day, 'd. MMMM yyyy', { locale: cs })}
                                </p>
                                <div className="space-y-1.5">
                                    {dayEvents.map((ev) => (
                                        <button
                                            key={`${ev.type}-${ev.id}`}
                                            type="button"
                                            onClick={() => {
                                                if (ev.type === 'task' && onTaskClick) {
                                                    onTaskClick(ev.id);
                                                } else if (ev.type === 'invoice') {
                                                    router.visit(`/faktury/${ev.id}`);
                                                } else if (ev.type === 'subscription') {
                                                    router.visit(`/neniweb/${ev.id}`);
                                                }
                                            }}
                                            className="flex w-full items-start gap-2 rounded-md p-1.5 text-left text-sm transition-colors hover:bg-accent cursor-pointer"
                                        >
                                            <span
                                                className={cn(
                                                    'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                                                    DOT_COLORS[ev.type],
                                                )}
                                            />
                                            <div className="min-w-0">
                                                <p className="truncate font-medium text-foreground leading-tight">
                                                    {ev.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {EVENT_TYPE_LABELS[ev.type]}
                                                    {ev.total !== undefined && ` · ${formatCurrency(ev.total)}`}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </PopoverContent>
                        </Popover>
                    );
                })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-5 border-t border-border px-5 py-3">
                <span className="text-xs text-muted-foreground">Legenda:</span>
                {Object.entries(DOT_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1.5">
                        <span className={cn('h-2 w-2 rounded-full', color)} />
                        <span className="text-xs text-muted-foreground">
                            {EVENT_TYPE_LABELS[type as CalendarEvent['type']]}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
