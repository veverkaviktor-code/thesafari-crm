import { useCallback, useEffect, useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { Link } from '@inertiajs/react';
import NotificationBell from '@/components/layout/NotificationBell';
import UserMenu from '@/components/layout/UserMenu';
import SearchPalette from '@/components/layout/SearchPalette';

interface Breadcrumb {
    label: string;
    href?: string;
}

interface TopBarProps {
    breadcrumbs?: Breadcrumb[];
    onMenuClick?: () => void;
}

export default function TopBar({ breadcrumbs = [], onMenuClick }: TopBarProps) {
    const [searchOpen, setSearchOpen] = useState(false);

    const toggleSearch = useCallback(() => {
        setSearchOpen((prev) => !prev);
    }, []);

    // Global ⌘K shortcut
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                toggleSearch();
            }
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [toggleSearch]);

    return (
        <>
            <header className="flex h-14 shrink-0 items-center gap-2 overflow-hidden border-b border-border bg-background px-3 sm:h-16 sm:gap-4 sm:px-6">
                {/* Hamburger — mobile only */}
                {onMenuClick && (
                    <button
                        onClick={onMenuClick}
                        className="shrink-0 p-1.5 text-muted-foreground hover:text-foreground md:hidden"
                        aria-label="Otevřít menu"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                )}

                {/* Breadcrumbs — truncated on mobile */}
                <nav className="flex min-w-0 items-center gap-1.5 text-sm">
                    {breadcrumbs.map((crumb, i) => (
                        <span
                            key={crumb.label}
                            className={`flex items-center gap-1.5 ${
                                i === breadcrumbs.length - 1 ? 'min-w-0 overflow-hidden' : 'shrink-0'
                            }`}
                        >
                            {i > 0 && <span className="shrink-0 text-muted-foreground">/</span>}
                            {crumb.href ? (
                                <Link
                                    href={crumb.href!}
                                    className="shrink-0 whitespace-nowrap text-muted-foreground transition-colors hover:text-foreground"
                                >
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span className="truncate text-foreground/80">{crumb.label}</span>
                            )}
                        </span>
                    ))}
                </nav>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Search trigger — icon on mobile, full bar on sm+ */}
                <button
                    onClick={() => setSearchOpen(true)}
                    className="relative flex h-9 shrink-0 items-center rounded-lg border border-border bg-secondary px-2.5 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent sm:w-full sm:max-w-md sm:pl-9 sm:pr-14"
                >
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground sm:absolute sm:left-3" />
                    <span className="ml-2 hidden sm:inline">Hledat...</span>
                    <kbd className="pointer-events-none absolute right-3 hidden rounded border border-border bg-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline">
                        ⌘K
                    </kbd>
                </button>

                {/* Right section */}
                <div className="flex shrink-0 items-center gap-1">
                    <NotificationBell />
                    <UserMenu />
                </div>
            </header>

            <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
}
