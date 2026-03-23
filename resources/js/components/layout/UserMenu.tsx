import { router, usePage } from '@inertiajs/react';
import { LogOut, Settings, User } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AuthUser {
    name: string;
    email: string;
    avatar_path: string | null;
}

export default function UserMenu() {
    const { auth } = usePage<{ auth: { user: AuthUser } }>().props;
    const user = auth?.user;

    const initials = user
        ? user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : '??';

    const handleLogout = () => {
        router.post('/logout');
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-accent">
                    {user?.avatar_path ? (
                        <img
                            src={`/storage/${user.avatar_path}`}
                            alt={user?.name ?? ''}
                            className="h-8 w-8 rounded-full object-cover"
                        />
                    ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                            {initials}
                        </div>
                    )}
                    <span className="hidden text-sm font-medium text-foreground/70 md:block">
                        {user?.name ?? 'Uživatel'}
                    </span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-48 border-border bg-popover text-popover-foreground/70"
            >
                <DropdownMenuItem
                    className="cursor-pointer gap-2 focus:bg-accent focus:text-accent-foreground"
                    onClick={() => router.visit('/nastaveni/profil')}
                >
                    <User className="h-4 w-4" />
                    Profil
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer gap-2 focus:bg-accent focus:text-accent-foreground"
                    onClick={() => router.visit('/nastaveni')}
                >
                    <Settings className="h-4 w-4" />
                    Nastavení
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem
                    className="cursor-pointer gap-2 text-red-400 focus:bg-accent focus:text-red-300"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    Odhlásit se
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
