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
        <header className="flex h-16 shrink-0 items-center gap-4 border-b border-border bg-background px-6">
            {/* Breadcrumbs */}
            <nav className="flex items-center gap-1.5 text-sm">
                {breadcrumbs.map((crumb, i) => (
                    <span key={i} className="flex items-center gap-1.5">
                        {i > 0 && <span className="text-muted-foreground">/</span>}
                        {crumb.href ? (
                            <Link
                                href={crumb.href!}
                                className="text-muted-foreground transition-colors hover:text-foreground"
                            >
                                {crumb.label}
                            </Link>
                        ) : (
                            <span className="text-foreground/80">{crumb.label}</span>
                        )}
                    </span>
                ))}
            </nav>

            {/* Search */}
            <div className="mx-auto w-full max-w-md">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Hledat..."
                        className="h-9 w-full rounded-lg border border-border bg-secondary pl-9 pr-14 text-sm text-muted-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/30 focus:ring-1 focus:ring-ring/20"
                        readOnly
                    />
                    <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border bg-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
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
