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
                <button className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-[#F5F0E8]/[0.04]">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#D97706] text-sm font-semibold text-white">
                        {initials}
                    </div>
                    <span className="hidden text-sm font-medium text-[#F5F0E8]/70 md:block">
                        {user?.name ?? 'Uživatel'}
                    </span>
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                className="w-48 border-[#F5F0E8]/[0.06] bg-[#16140f] text-[#F5F0E8]/70"
            >
                <DropdownMenuItem
                    className="cursor-pointer gap-2 focus:bg-[#F5F0E8]/[0.04] focus:text-white"
                    onClick={() => router.visit('/nastaveni/profil')}
                >
                    <User className="h-4 w-4" />
                    Profil
                </DropdownMenuItem>
                <DropdownMenuItem
                    className="cursor-pointer gap-2 focus:bg-[#F5F0E8]/[0.04] focus:text-white"
                    onClick={() => router.visit('/nastaveni')}
                >
                    <Settings className="h-4 w-4" />
                    Nastavení
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                    className="cursor-pointer gap-2 text-red-400 focus:bg-[#F5F0E8]/[0.04] focus:text-red-300"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    Odhlásit se
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
