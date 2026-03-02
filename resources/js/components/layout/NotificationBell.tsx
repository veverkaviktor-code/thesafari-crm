import { Bell } from 'lucide-react';

interface NotificationBellProps {
    count?: number;
}

export default function NotificationBell({ count = 0 }: NotificationBellProps) {
    return (
        <button
            className="relative rounded-lg p-2 text-[#9C9585] transition-colors hover:bg-white/5 hover:text-[#F5F0E8]"
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
