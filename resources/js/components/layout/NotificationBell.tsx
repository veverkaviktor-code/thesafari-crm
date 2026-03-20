import { useEffect } from 'react';
import { Link, router, usePage } from '@inertiajs/react';
import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Bell, Calculator, Check, CreditCard, FileWarning, Globe, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface Notification {
    id: string;
    type: string;
    data: {
        type: string;
        title: string;
        message: string;
        link: string;
    };
    read_at: string | null;
    created_at: string;
}

interface NotificationsSharedProp {
    unread_count: number;
    recent?: Notification[];
}

const typeIcons: Record<string, React.ElementType> = {
    invoice_overdue: FileWarning,
    payment_received: CreditCard,
    website_expiring: Globe,
    new_ticket: MessageSquare,
    estimate_inactive: Calculator,
};

const typeColors: Record<string, string> = {
    invoice_overdue: 'text-red-400',
    payment_received: 'text-emerald-400',
    website_expiring: 'text-amber-400',
    new_ticket: 'text-blue-400',
    estimate_inactive: 'text-orange-400',
};

export default function NotificationBell() {
    const pageProps = usePage<{ notifications?: NotificationsSharedProp }>().props;
    const notifications = pageProps.notifications;
    const unreadCount = notifications?.unread_count ?? 0;
    const recent = notifications?.recent ?? [];

    useEffect(() => {
        const interval = setInterval(() => {
            router.reload({ only: ['notifications'] });
        }, 60000);
        return () => clearInterval(interval);
    }, []);

    const handleMarkAllRead = () => {
        router.post('/notifikace/read-all', {}, { preserveScroll: true });
    };

    const handleNotificationClick = (notification: Notification) => {
        router.post(
            `/notifikace/${notification.id}/read`,
            {},
            {
                preserveScroll: true,
                onFinish: () => {
                    router.visit(notification.data.link);
                },
            },
        );
    };

    const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    className="relative rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    aria-label="Notifikace"
                >
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                            {badgeLabel}
                        </span>
                    )}
                </button>
            </PopoverTrigger>

            <PopoverContent
                align="end"
                sideOffset={8}
                className="w-80 rounded-xl border-border bg-card p-0 shadow-xl"
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <span className="text-sm font-semibold text-foreground">Notifikace</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleMarkAllRead}
                            className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <Check className="h-3.5 w-3.5" />
                            Označit vše
                        </Button>
                    )}
                </div>

                {/* List */}
                <div className="max-h-[340px] overflow-y-auto">
                    {recent.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
                            <Bell className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">Žádné notifikace</p>
                        </div>
                    ) : (
                        recent.slice(0, 5).map((notification) => {
                            const Icon = typeIcons[notification.data.type] ?? Bell;
                            const iconColor = typeColors[notification.data.type] ?? 'text-muted-foreground';
                            const isUnread = notification.read_at === null;

                            return (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={cn(
                                        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/60',
                                        isUnread && 'border-l-2 border-primary bg-accent/30',
                                    )}
                                >
                                    <div className={cn('mt-0.5 shrink-0', iconColor)}>
                                        <Icon className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={cn(
                                                'truncate text-sm',
                                                isUnread
                                                    ? 'font-semibold text-foreground'
                                                    : 'font-normal text-foreground/70',
                                            )}
                                        >
                                            {notification.data.title}
                                        </p>
                                        <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                                            {notification.data.message}
                                        </p>
                                        <p className="mt-1 text-[11px] text-muted-foreground/60">
                                            {formatDistanceToNow(new Date(notification.created_at), {
                                                addSuffix: true,
                                                locale: cs,
                                            })}
                                        </p>
                                    </div>
                                    {isUnread && (
                                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="border-t border-border px-4 py-2.5">
                    <Link
                        href="/notifikace"
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Zobrazit vše →
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
}
