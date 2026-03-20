import { useState } from 'react';
import { Link, router } from '@inertiajs/react';
import {
    AlertTriangle,
    ArrowRight,
    Bell,
    BellOff,
    Calendar,
    ChevronDown,
    ChevronUp,
    CreditCard,
    FileText,
    Globe,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Alert {
    type: 'danger' | 'warning' | 'info';
    icon: string;
    title: string;
    subtitle: string;
    link: string;
    website_id?: number;
}

export interface IgnoredAlert {
    website_id: number;
    name: string;
    type: string;
    ignored_at: string;
    link: string;
}

const iconMap: Record<string, { icon: typeof AlertTriangle; color: string }> = {
    order:        { icon: FileText,      color: 'text-amber-500' },
    invoice:      { icon: CreditCard,    color: 'text-red-500' },
    deadline:     { icon: Calendar,      color: 'text-orange-500' },
    website: { icon: Globe,         color: 'text-primary' },
    payment:      { icon: CreditCard,    color: 'text-rose-500' },
};

const typeBg: Record<string, string> = {
    danger: 'border-red-500/20 bg-red-500/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
    info: 'border-primary/20 bg-primary/5',
};

interface Props {
    alerts?: Alert[];
    ignoredAlerts?: IgnoredAlert[];
    /** How many to show before "show all" (default 3) */
    defaultVisible?: number;
    /** Max height for scrollable container (default "max-h-[480px]") */
    maxHeight?: string;
}

export default function AttentionAlerts({ alerts, ignoredAlerts, defaultVisible = 3, maxHeight = 'max-h-[480px]' }: Props) {
    const [items, setItems] = useState<Alert[]>(alerts ?? []);
    const [ignored, setIgnored] = useState<IgnoredAlert[]>(ignoredAlerts ?? []);
    const [expanded, setExpanded] = useState(false);
    const [showIgnored, setShowIgnored] = useState(false);
    const [processingId, setProcessingId] = useState<number | null>(null);

    const visibleItems = expanded ? items : items.slice(0, defaultVisible);
    const hasMore = items.length > defaultVisible;

    const handleIgnore = (e: React.MouseEvent, alert: Alert) => {
        e.preventDefault();
        e.stopPropagation();
        if (!alert.website_id) return;

        setProcessingId(alert.website_id);
        router.post(`/webove-sluzby/${alert.website_id}/toggle-ignore`, {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                const removed = items.find(a => a.website_id === alert.website_id);
                setItems(prev => prev.filter(a => a.website_id !== alert.website_id));
                if (removed) {
                    setIgnored(prev => [{
                        website_id: removed.website_id!,
                        name: removed.title.split(' — ')[0].split(' expiruje')[0],
                        type: removed.subtitle.split(' ·')[0],
                        ignored_at: 'Právě teď',
                        link: removed.link,
                    }, ...prev]);
                }
                setProcessingId(null);
            },
            onError: () => setProcessingId(null),
        });
    };

    const handleRestore = (ignoredAlert: IgnoredAlert) => {
        setProcessingId(ignoredAlert.website_id);
        router.post(`/webove-sluzby/${ignoredAlert.website_id}/toggle-ignore`, {}, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setIgnored(prev => prev.filter(a => a.website_id !== ignoredAlert.website_id));
                setProcessingId(null);
            },
            onError: () => setProcessingId(null),
        });
    };

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-muted-foreground">
                    Věnujte pozornost{items.length > 0 && (
                        <span className="ml-1 text-foreground">({items.length})</span>
                    )}
                </h3>
            </div>
            <div className={cn('space-y-2 overflow-y-auto overflow-x-hidden', expanded && maxHeight)}>
                {items.length === 0 && (
                    <div className="py-6 text-center">
                        <p className="text-sm text-muted-foreground">Vše v pořádku, žádné urgentní upozornění</p>
                    </div>
                )}
                {visibleItems.map((alert, i) => {
                    const config = iconMap[alert.icon] ?? iconMap.order;
                    const Icon = config.icon;
                    const isProcessing = processingId === alert.website_id;
                    return (
                        <div key={i} className="relative group">
                            <Link
                                href={alert.link}
                                className={cn(
                                    'flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50',
                                    typeBg[alert.type],
                                    isProcessing && 'opacity-50 pointer-events-none',
                                )}
                            >
                                <div className={cn(
                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                                    alert.type === 'danger' ? 'bg-red-500/10' : 'bg-amber-500/10',
                                )}>
                                    <Icon className={cn('h-4 w-4', config.color)} />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium text-foreground/90">
                                        {alert.title}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {alert.subtitle}
                                    </p>
                                </div>
                                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            </Link>
                            {alert.website_id && (
                                <button
                                    onClick={(e) => handleIgnore(e, alert)}
                                    title="Ignorovat upozornění"
                                    className={cn(
                                        'absolute right-10 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-muted-foreground transition-all',
                                        'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
                                        'hover:bg-accent hover:text-foreground',
                                    )}
                                >
                                    <BellOff className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Show all / Show less */}
            {hasMore && (
                <button
                    onClick={() => setExpanded(!expanded)}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                    {expanded ? (
                        <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            Zobrazit méně
                        </>
                    ) : (
                        <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            Zobrazit vše ({items.length})
                        </>
                    )}
                </button>
            )}

            {/* Ignored alerts section */}
            {ignored.length > 0 && (
                <div className="mt-3 border-t border-border pt-3">
                    <button
                        onClick={() => setShowIgnored(!showIgnored)}
                        className="flex w-full items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        <BellOff className="h-3 w-3" />
                        Ignorované ({ignored.length})
                        {showIgnored ? <ChevronUp className="ml-auto h-3 w-3" /> : <ChevronDown className="ml-auto h-3 w-3" />}
                    </button>
                    {showIgnored && (
                        <div className="mt-2 max-h-[240px] space-y-1.5 overflow-y-auto overflow-x-hidden">
                            {ignored.map((item) => {
                                const isProcessing = processingId === item.website_id;
                                return (
                                    <div
                                        key={item.website_id}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg border border-border/50 bg-accent/30 p-2.5 text-muted-foreground',
                                            isProcessing && 'opacity-50',
                                        )}
                                    >
                                        <BellOff className="h-3.5 w-3.5 shrink-0" />
                                        <Link href={item.link} className="min-w-0 flex-1 hover:text-foreground transition-colors">
                                            <p className="truncate text-sm">{item.name}</p>
                                            <p className="truncate text-[11px] opacity-70">{item.type} · ignorováno {item.ignored_at}</p>
                                        </Link>
                                        <button
                                            onClick={() => handleRestore(item)}
                                            title="Obnovit upozornění"
                                            className="shrink-0 rounded-md p-1 transition-colors hover:bg-accent hover:text-foreground"
                                        >
                                            <Bell className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
