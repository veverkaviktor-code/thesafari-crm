import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    FileText,
    Globe,
    LayoutDashboard,
    MessageSquare,
    Settings,
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
}

const mainNav: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Zákazníci', href: '/zakaznici', icon: Users },
    { label: 'Zakázky', href: '/zakazky', icon: ClipboardList },
    { label: 'Faktury', href: '/faktury', icon: FileText },
    { label: 'Požadavky', href: '/pozadavky', icon: MessageSquare },
    { label: 'Neniweb', href: '/neniweb', icon: Globe },
];

const bottomNav: NavItem[] = [
    { label: 'Nastavení', href: '/nastaveni', icon: Settings },
];

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const { url } = usePage();

    const isActive = (href: string) => {
        if (href === '/dashboard') return url === '/dashboard' || url === '/';
        return url.startsWith(href);
    };

    return (
        <TooltipProvider>
            <aside
                className={cn(
                    'flex h-screen flex-col border-r border-[#F5F0E8]/[0.05] bg-[#0f0e0c] transition-all duration-300 ease-in-out',
                    collapsed ? 'w-[68px]' : 'w-[240px]',
                )}
            >
                {/* Logo + collapse button */}
                <div className={cn(
                    'flex h-16 items-center border-b border-[#F5F0E8]/[0.05]',
                    collapsed ? 'justify-center px-0' : 'px-4'
                )}>
                    {!collapsed && (
                        <div className="flex flex-1 items-center gap-3 overflow-hidden">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#D97706] text-sm font-bold text-white">
                                S
                            </div>
                            <span className="whitespace-nowrap text-sm font-semibold text-[#F5F0E8]">
                                The Safari HQ
                            </span>
                        </div>
                    )}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[#F5F0E8]/[0.08] bg-[#F5F0E8]/[0.04] text-[#9C9585] transition-colors hover:bg-[#F5F0E8]/[0.08] hover:text-[#F5F0E8]',
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
                    {mainNav.map((item) => (
                        <NavLink
                            key={item.href}
                            item={item}
                            active={isActive(item.href)}
                            collapsed={collapsed}
                        />
                    ))}
                </nav>

                {/* Bottom section */}
                <div className="space-y-0.5 border-t border-[#F5F0E8]/[0.05] px-3 py-4">
                    {bottomNav.map((item) => (
                        <NavLink
                            key={item.href}
                            item={item}
                            active={isActive(item.href)}
                            collapsed={collapsed}
                        />
                    ))}
                </div>
            </aside>
        </TooltipProvider>
    );
}

function NavLink({
    item,
    active,
    collapsed,
}: {
    item: NavItem;
    active: boolean;
    collapsed: boolean;
}) {
    const Icon = item.icon;

    const linkContent = (
        <Link
            href={item.href}
            className={cn(
                'group relative flex h-9 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors',
                active
                    ? 'bg-[#F5F0E8]/[0.06] text-[#F5F0E8]'
                    : 'text-[#9C9585] hover:bg-[#F5F0E8]/[0.04] hover:text-[#F5F0E8]',
            )}
        >
            {/* Active indicator */}
            {active && (
                <span className="absolute -left-3 top-1.5 h-5 w-0.5 rounded-r bg-[#D97706]" />
            )}
            <Icon className="h-4 w-4 shrink-0" />
            <span
                className={cn(
                    'whitespace-nowrap transition-all duration-300',
                    collapsed && 'w-0 opacity-0',
                )}
            >
                {item.label}
            </span>
        </Link>
    );

    if (collapsed) {
        return (
            <Tooltip>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                    {item.label}
                </TooltipContent>
            </Tooltip>
        );
    }

    return linkContent;
}
