import { Search } from 'lucide-react';
import { Link } from '@inertiajs/react';
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
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-[#F5F0E8]/[0.05] bg-[#0a0a08] px-6">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-sm">
                {breadcrumbs.map((crumb, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                        {i > 0 && <span className="text-[#6B6560]">/</span>}
                        {crumb.href ? (
                            <Link
                                href={crumb.href!}
                                className="text-[#9C9585] transition-colors hover:text-[#F5F0E8]"
                            >
                                {crumb.label}
                            </Link>
                        ) : (
                            <span className="text-[#F5F0E8]/80">{crumb.label}</span>
                        )}
                    </span>
                ))}
            </nav>

            {/* Search */}
            <div className="mx-auto w-full max-w-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6B6560]" />
                    <input
                        type="text"
                        placeholder="Hledat..."
                        className="h-9 w-full rounded-lg border border-[#F5F0E8]/[0.06] bg-[#0f0e0c] pl-9 pr-14 text-sm text-[#9C9585] placeholder-[#6B6560] outline-none transition-colors focus:border-[#D97706]/30 focus:ring-1 focus:ring-[#D97706]/20"
                        readOnly
                    />
                    <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-[#F5F0E8]/[0.08] bg-[#F5F0E8]/[0.04] px-1.5 py-0.5 text-[10px] font-medium text-[#6B6560]">
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
