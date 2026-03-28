import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    AtSign,
    Bell,
    Calculator,
    CalendarCheck,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    ExternalLink,
    FileText,
    Globe,
    HardDrive,
    LayoutDashboard,
    MessageSquare,
    ScrollText,
    Server,
    Settings,
    TrendingUp,
    Users,
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface NavItem {
    label: string;
    href: string;
    icon: React.ElementType;
    external?: boolean;
}

interface NavGroup {
    label: string;
    icon: React.ElementType;
    children: NavItem[];
}

type NavEntry = NavItem | NavGroup;

function isNavGroup(entry: NavEntry): entry is NavGroup {
    return 'children' in entry;
}

const mainNav: NavEntry[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Zákazníci', href: '/zakaznici', icon: Users },
    { label: 'Zakázky', href: '/zakazky', icon: ClipboardList },
    { label: 'Faktury', href: '/faktury', icon: FileText },
    { label: 'Finance', href: '/finance', icon: TrendingUp },
    { label: 'Zprávy', href: '/zpravy', icon: MessageSquare },
    {
        label: 'Webové služby',
        icon: Globe,
        children: [
            { label: 'Domény', href: '/domeny', icon: AtSign },
            { label: 'Hostingy', href: '/hostingy', icon: Server },
            { label: 'VPS', href: '/vps', icon: HardDrive },
        ],
    },
    { label: 'Kalkulátor', href: '/kalkulator', icon: Calculator },
    { label: 'To Do', href: '/planovac', icon: CalendarCheck },
    { label: 'Notifikace', href: '/notifikace', icon: Bell },
    { label: 'Logy', href: '/logy', icon: ScrollText },
];

const bottomNav: NavItem[] = [
    { label: 'VPS Panel', href: 'https://webje.cz/vpsc', icon: ExternalLink, external: true },
    { label: 'Nastavení', href: '/nastaveni', icon: Settings },
];

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(() => {
        try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
    });
    const { url, props: pageProps } = usePage<{ notifications?: { unread_count: number; new_tickets_count: number } }>();
    const unreadCount = pageProps.notifications?.unread_count ?? 0;
    const newTicketsCount = pageProps.notifications?.new_tickets_count ?? 0;

    const isActive = (href: string) => {
        if (href === '/dashboard') return url === '/dashboard' || url === '/';
        return url.startsWith(href);
    };

    const isGroupActive = (group: NavGroup) =>
        group.children.some((child) => isActive(child.href));

    return (
        <TooltipProvider>
            <aside
                className={cn(
                    'flex h-screen flex-col border-r border-border bg-background transition-all duration-300 ease-in-out',
                    collapsed ? 'w-[68px]' : 'w-[240px]',
                )}
            >
                {/* Logo + collapse button */}
                <div className={cn(
                    'flex h-16 items-center border-b border-border',
                    collapsed ? 'justify-center px-0' : 'px-4'
                )}>
                    {!collapsed && (
                        <div className="flex flex-1 items-center overflow-hidden px-1">
                            <img
                                src="/logo-dark.svg"
                                alt="The Safari"
                                className="h-7"
                            />
                        </div>
                    )}
                    <button
                        onClick={() => {
                            const next = !collapsed;
                            setCollapsed(next);
                            try { localStorage.setItem('sidebar-collapsed', String(next)); } catch {}
                        }}
                        className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border bg-accent text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
                        )}
                        title={collapsed ? 'Rozbalit' : 'Sbalit'}
                    >
                        {collapsed ? (
                            <ChevronRight className="h-3.5 w-3.5" />
                        ) : (
                            <ChevronLeft className="h-3.5 w-3.5" />
                        )}
                    </button>
                </div>

                {/* Main navigation */}
                <nav className="flex-1 space-y-0.5 overflow-hidden px-3 py-4">
                    {mainNav.map((entry) => {
                        if (isNavGroup(entry)) {
                            return (
                                <CollapsibleNavGroup
                                    key={entry.label}
                                    group={entry}
                                    collapsed={collapsed}
                                    isActive={isActive}
                                    isGroupActive={isGroupActive(entry)}
                                />
                            );
                        }
                        const item = entry as NavItem;
                        return (
                            <NavLink
                                key={item.href}
                                item={item}
                                active={isActive(item.href)}
                                collapsed={collapsed}
                                badge={item.href === '/notifikace' ? unreadCount : item.href === '/zpravy' ? newTicketsCount : 0}
                            />
                        );
                    })}
                </nav>

                {/* Bottom section */}
                <div className="space-y-0.5 border-t border-border px-3 py-4">
                    {bottomNav.map((item) => (
                        <NavLink
                            key={item.href}
                            item={item}
                            active={isActive(item.href)}
                            collapsed={collapsed}
                            badge={0}
                        />
                    ))}
                </div>
            </aside>
        </TooltipProvider>
    );
}

function CollapsibleNavGroup({
    group,
    collapsed,
    isActive,
    isGroupActive,
}: {
    group: NavGroup;
    collapsed: boolean;
    isActive: (href: string) => boolean;
    isGroupActive: boolean;
}) {
    const [open, setOpen] = useState(isGroupActive);
    const Icon = group.icon;

    // When sidebar is collapsed, show tooltip with children links
    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={() => setOpen(!open)}
                        className={cn(
                            'group relative flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                            isGroupActive
                                ? 'bg-accent text-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                        )}
                    >
                        {isGroupActive && (
                            <span className="absolute -left-3 top-1.5 h-5 w-0.5 rounded-r bg-primary" />
                        )}
                        <span className="shrink-0">
                            <Icon className="h-4 w-4" />
                        </span>
                    </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8} className="space-y-1 p-2">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">{group.label}</p>
                    {group.children.map((child) => (
                        <Link
                            key={child.href}
                            href={child.href}
                            className={cn(
                                'flex items-center gap-2 rounded px-2 py-1 text-xs transition-colors',
                                isActive(child.href)
                                    ? 'bg-accent text-foreground font-medium'
                                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                            )}
                        >
                            <child.icon className="h-3 w-3" />
                            {child.label}
                        </Link>
                    ))}
                </TooltipContent>
            </Tooltip>
        );
    }

    return (
        <div>
            <button
                onClick={() => setOpen(!open)}
                className={cn(
                    'group relative flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                    isGroupActive
                        ? 'bg-accent text-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
            >
                {isGroupActive && (
                    <span className="absolute -left-3 top-1.5 h-5 w-0.5 rounded-r bg-primary" />
                )}
                <span className="shrink-0">
                    <Icon className="h-4 w-4" />
                </span>
                <span className="flex flex-1 items-center justify-between whitespace-nowrap">
                    {group.label}
                    <ChevronDown className={cn(
                        'h-3 w-3 text-muted-foreground transition-transform duration-200',
                        open && 'rotate-180',
                    )} />
                </span>
            </button>
            {open && (
                <div className="mt-0.5 space-y-0.5 pl-4">
                    {group.children.map((child) => (
                        <NavLink
                            key={child.href}
                            item={child}
                            active={isActive(child.href)}
                            collapsed={false}
                            badge={0}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function NavLink({
    item,
    active,
    collapsed,
    badge = 0,
}: {
    item: NavItem;
    active: boolean;
    collapsed: boolean;
    badge?: number;
}) {
    const Icon = item.icon;

    const sharedClassName = cn(
        'group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
        active
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
    );

    const innerContent = (
        <>
            {/* Active indicator */}
            {active && (
                <span className="absolute -left-3 top-1.5 h-5 w-0.5 rounded-r bg-primary" />
            )}

            {/* Icon with collapsed badge */}
            <span className="relative shrink-0">
                <Icon className="h-4 w-4" />
                {collapsed && badge > 0 && (
                    <span className="absolute -right-1.5 -top-1.5 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-red-500 px-0.5 text-[9px] font-bold text-white">
                        {badge > 9 ? '9+' : badge}
                    </span>
                )}
            </span>

            <span
                className={cn(
                    'flex flex-1 items-center justify-between whitespace-nowrap transition-all duration-300',
                    collapsed && 'w-0 opacity-0',
                )}
            >
                {item.label}
                {!collapsed && badge > 0 && (
                    <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500/15 px-1 text-[10px] font-semibold text-red-400">
                        {badge > 99 ? '99+' : badge}
                    </span>
                )}
            </span>
        </>
    );

    const linkContent = item.external ? (
        <a
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={sharedClassName}
        >
            {innerContent}
        </a>
    ) : (
        <Link href={item.href} className={sharedClassName}>
            {innerContent}
        </Link>
    );

    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                    {badge > 0 && ` (${badge})`}
                </TooltipContent>
            </Tooltip>
        );
    }

    return linkContent;
}
