import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Camera } from 'lucide-react';

interface Props {
    user: {
        id: number;
        name: string;
        email: string;
        avatar_path: string | null;
    };
}

export default function Profile({ user }: Props) {
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar_path ? `/storage/${user.avatar_path}` : null);

    const profileForm = useForm({
        name: user.name,
        email: user.email,
        avatar: null as File | null,
    });

    const passwordForm = useForm({
        current_password: '',
        password: '',
        password_confirmation: '',
    });

    function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            profileForm.setData('avatar', file);
            const reader = new FileReader();
            reader.onload = (ev) => setAvatarPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    }

    function handleProfileSubmit(e: React.FormEvent) {
        e.preventDefault();
        profileForm.put('/nastaveni/profil', { preserveScroll: true, forceFormData: true });
    }

    function handlePasswordSubmit(e: React.FormEvent) {
        e.preventDefault();
        passwordForm.put('/nastaveni/profil/heslo', {
            preserveScroll: true,
            onSuccess: () => passwordForm.reset(),
        });
    }

    const initials = user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="space-y-6">
            {/* Profile info */}
            <div className="bg-[#16140f] rounded-xl border border-[#F5F0E8]/[0.05] p-6">
                <h2 className="text-lg font-semibold text-[#F5F0E8] mb-4">Osobní údaje</h2>
                <form onSubmit={handleProfileSubmit} className="space-y-5">
                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt={user.name}
                                    className="h-20 w-20 rounded-full object-cover"
                                />
                            ) : (
                                <div className="h-20 w-20 rounded-full bg-[#D97706]/20 flex items-center justify-center">
                                    <span className="text-xl font-semibold text-[#D97706]">{initials}</span>
                                </div>
                            )}
                            <label className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                                <Camera className="h-5 w-5 text-white" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                    className="hidden"
                                />
                            </label>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-[#F5F0E8]/90">{user.name}</p>
                            <p className="text-xs text-[#6B6560]">{user.email}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-[#9C9585]">Jméno</Label>
                            <Input
                                value={profileForm.data.name}
                                onChange={(e) => profileForm.setData('name', e.target.value)}
                                className="mt-1.5 bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/90"
                            />
                            {profileForm.errors.name && (
                                <p className="mt-1 text-xs text-red-400">{profileForm.errors.name}</p>
                            )}
                        </div>
                        <div>
                            <Label className="text-[#9C9585]">E-mail</Label>
                            <Input
                                type="email"
                                value={profileForm.data.email}
                                onChange={(e) => profileForm.setData('email', e.target.value)}
                                className="mt-1.5 bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/90"
                            />
                            {profileForm.errors.email && (
                                <p className="mt-1 text-xs text-red-400">{profileForm.errors.email}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={profileForm.processing}
                            className="bg-[#D97706] hover:bg-[#B45309] text-white"
                        >
                            Uložit profil
                        </Button>
                    </div>
                </form>
            </div>

            {/* Password change */}
            <div className="bg-[#16140f] rounded-xl border border-[#F5F0E8]/[0.05] p-6">
                <h2 className="text-lg font-semibold text-[#F5F0E8] mb-4">Změna hesla</h2>
                <form onSubmit={handlePasswordSubmit} className="space-y-5">
                    <div>
                        <Label className="text-[#9C9585]">Současné heslo</Label>
                        <Input
                            type="password"
                            value={passwordForm.data.current_password}
                            onChange={(e) => passwordForm.setData('current_password', e.target.value)}
                            className="mt-1.5 bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/90"
                        />
                        {passwordForm.errors.current_password && (
                            <p className="mt-1 text-xs text-red-400">{passwordForm.errors.current_password}</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-[#9C9585]">Nové heslo</Label>
                            <Input
                                type="password"
                                value={passwordForm.data.password}
                                onChange={(e) => passwordForm.setData('password', e.target.value)}
                                className="mt-1.5 bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/90"
                            />
                            {passwordForm.errors.password && (
                                <p className="mt-1 text-xs text-red-400">{passwordForm.errors.password}</p>
                            )}
                        </div>
                        <div>
                            <Label className="text-[#9C9585]">Potvrzení hesla</Label>
                            <Input
                                type="password"
                                value={passwordForm.data.password_confirmation}
                                onChange={(e) => passwordForm.setData('password_confirmation', e.target.value)}
                                className="mt-1.5 bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/90"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={passwordForm.processing}
                            className="bg-[#D97706] hover:bg-[#B45309] text-white"
                        >
                            Změnit heslo
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
