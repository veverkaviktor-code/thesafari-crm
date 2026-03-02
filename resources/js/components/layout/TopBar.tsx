import { Search } from 'lucide-react';
import NotificationBell from '@/components/layout/NotificationBell';
import UserMenu from '@/components/layout/UserMenu';

interface Breadcrumb {
    label: string;
    href?: string;
}

interface TopBarProps {
    breadcrumbs?: Breadcrumb[];
}

export default function TopBar({ breadcrumbs = [] }: TopBarProps) {
    return (
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-white/5 bg-[#0a0a0f] px-6">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-sm">
                {breadcrumbs.map((crumb, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                        {i > 0 && <span className="text-gray-600">/</span>}
                        {crumb.href ? (
                            <a
                                href={crumb.href}
                                className="text-gray-400 transition-colors hover:text-white"
                            >
                                {crumb.label}
                            </a>
                        ) : (
                            <span className="text-gray-300">{crumb.label}</span>
                        )}
                    </span>
                ))}
            </nav>

            {/* Search */}
            <div className="mx-auto w-full max-w-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Hledat..."
                        className="h-9 w-full rounded-lg border border-white/5 bg-white/5 pl-9 pr-14 text-sm text-gray-300 placeholder-gray-500 outline-none transition-colors focus:border-white/10 focus:bg-white/[0.07]"
                        readOnly
                    />
                    <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                        ⌘K
                    </kbd>
                </div>
            </div>

            {/* Right section */}
            <div className="flex items-center gap-1">
                <NotificationBell />
                <UserMenu />
            </div>
        </header>
    );
}
