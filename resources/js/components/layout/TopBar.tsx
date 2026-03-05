import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
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
}

export default function TopBar({ breadcrumbs = [] }: TopBarProps) {
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

                {/* Search trigger */}
                <div className="mx-auto w-full max-w-md">
                    <button
                        onClick={() => setSearchOpen(true)}
                        className="relative flex h-9 w-full items-center rounded-lg border border-border bg-secondary pl-9 pr-14 text-sm text-muted-foreground transition-colors hover:border-primary/30 hover:bg-accent"
                    >
                        <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
                        <span>Hledat...</span>
                        <kbd className="pointer-events-none absolute right-3 rounded border border-border bg-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            ⌘K
                        </kbd>
                    </button>
                </div>

                {/* Right section */}
                <div className="flex items-center gap-1">
                    <NotificationBell />
                    <UserMenu />
                </div>
            </header>

            <SearchPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
        </>
    );
}
