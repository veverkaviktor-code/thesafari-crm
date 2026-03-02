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
                <button className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-white/5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D97706] text-sm font-semibold text-white">
                        {initials}
                    </div>
                    <span className="hidden text-sm font-medium text-gray-300 md:block">
                        {user?.name ?? 'Uživatel'}
                    </span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-48 border-white/10 bg-[#1a1a22] text-gray-300"
            >
                <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-white/5 focus:text-white">
                    <User className="h-4 w-4" />
                    Profil
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer gap-2 focus:bg-white/5 focus:text-white">
                    <Settings className="h-4 w-4" />
                    Nastavení
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                    className="cursor-pointer gap-2 text-red-400 focus:bg-white/5 focus:text-red-300"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    Odhlásit se
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
