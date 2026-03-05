import { router } from '@inertiajs/react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, CreditCard, FileWarning, Globe, MessageSquare } from 'lucide-react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
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

interface PaginatedNotifications {
    data: Notification[];
    current_page: number;
    last_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface Props {
    notifications: PaginatedNotifications;
    filter: string;
}

const typeIcons: Record<string, React.ElementType> = {
    invoice_overdue: FileWarning,
    payment_received: CreditCard,
    subscription_expiring: Globe,
    new_ticket: MessageSquare,
};

const typeColors: Record<string, string> = {
    invoice_overdue: 'text-red-400',
    payment_received: 'text-emerald-400',
    subscription_expiring: 'text-amber-400',
    new_ticket: 'text-blue-400',
};

const typeBgColors: Record<string, string> = {
    invoice_overdue: 'bg-red-500/10',
    payment_received: 'bg-emerald-500/10',
    subscription_expiring: 'bg-amber-500/10',
    new_ticket: 'bg-blue-500/10',
};

export default function NotificationsIndex({ notifications, filter }: Props) {
    const handleMarkAllRead = () => {
        router.post('/notifikace/read-all', {}, { preserveScroll: true });
    };

    const handleNotificationClick = (notification: Notification) => {
        if (notification.read_at === null) {
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
        } else {
            router.visit(notification.data.link);
        }
    };

    const handlePageChange = (page: number) => {
        const params: Record<string, string> = { page: String(page) };
        if (filter === 'unread') params.filter = 'unread';
        router.get('/notifikace', params, { preserveScroll: true });
    };

    return (
        <AuthenticatedLayout
            title="Notifikace"
            breadcrumbs={[{ label: 'Notifikace' }]}
        >
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                            Notifikace
                        </h1>
                        {notifications.total > 0 && (
                            <p className="mt-1 text-sm text-muted-foreground">
                                {notifications.from}–{notifications.to} z {notifications.total} celkem
                            </p>
                        )}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleMarkAllRead}
                        className="gap-2 border-border bg-card text-muted-foreground hover:text-foreground"
                    >
                        <CheckCheck className="h-4 w-4" />
                        Označit vše jako přečtené
                    </Button>
                </div>

                {/* Filter chips */}
                <div className="flex items-center gap-2">
                    <a
                        href="/notifikace"
                        className={cn(
                            'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                            filter !== 'unread'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                        )}
                    >
                        Vše
                    </a>
                    <a
                        href="/notifikace?filter=unread"
                        className={cn(
                            'rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                            filter === 'unread'
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                        )}
                    >
                        Nepřečtené
                    </a>
                </div>

                {/* Notification list */}
                {notifications.data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-20">
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent">
                            <Bell className="h-7 w-7 text-muted-foreground/50" />
                        </div>
                        <div className="text-center">
                            <p className="font-medium text-foreground">Žádné notifikace</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {filter === 'unread'
                                    ? 'Všechny notifikace jsou přečtené.'
                                    : 'Zatím jste neobdrželi žádné notifikace.'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                        {notifications.data.map((notification, index) => {
                            const Icon = typeIcons[notification.data.type] ?? Bell;
                            const iconColor = typeColors[notification.data.type] ?? 'text-muted-foreground';
                            const iconBg = typeBgColors[notification.data.type] ?? 'bg-accent';
                            const isUnread = notification.read_at === null;
                            const isLast = index === notifications.data.length - 1;

                            return (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={cn(
                                        'flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-accent/40',
                                        isUnread
                                            ? 'border-l-2 border-primary bg-accent/20'
                                            : 'border-l-2 border-transparent opacity-70',
                                        !isLast && 'border-b border-border',
                                    )}
                                >
                                    {/* Icon */}
                                    <div
                                        className={cn(
                                            'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                                            iconBg,
                                        )}
                                    >
                                        <Icon className={cn('h-4 w-4', iconColor)} />
                                    </div>

                                    {/* Content */}
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-start justify-between gap-3">
                                            <p
                                                className={cn(
                                                    'text-sm',
                                                    isUnread
                                                        ? 'font-semibold text-foreground'
                                                        : 'font-medium text-foreground/80',
                                                )}
                                            >
                                                {notification.data.title}
                                            </p>
                                            <span className="shrink-0 text-xs text-muted-foreground/60">
                                                {format(new Date(notification.created_at), 'd. M. yyyy HH:mm', { locale: cs })}
                                            </span>
                                        </div>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            {notification.data.message}
                                        </p>
                                    </div>

                                    {/* Unread dot */}
                                    {isUnread && (
                                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {notifications.last_page > 1 && (
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Strana {notifications.current_page} z {notifications.last_page}
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={notifications.current_page <= 1}
                                onClick={() => handlePageChange(notifications.current_page - 1)}
                                className="gap-1.5 border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40"
                            >
                                <ChevronLeft className="h-4 w-4" />
                                Předchozí
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={notifications.current_page >= notifications.last_page}
                                onClick={() => handlePageChange(notifications.current_page + 1)}
                                className="gap-1.5 border-border bg-card text-muted-foreground hover:text-foreground disabled:opacity-40"
                            >
                                Další
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AuthenticatedLayout>
    );
}
