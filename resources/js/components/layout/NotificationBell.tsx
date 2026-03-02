import { Bell } from 'lucide-react';

interface NotificationBellProps {
    count?: number;
}

export default function NotificationBell({ count = 0 }: NotificationBellProps) {
    return (
        <button
            className="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-white/5 hover:text-white"
            aria-label="Notifikace"
        >
            <Bell className="h-5 w-5" />
            {count > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                    {count > 99 ? '99+' : count}
                </span>
            )}
        </button>
    );
}
