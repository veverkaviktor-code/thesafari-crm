import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Login() {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/login');
    }

    return (
        <>
            <Head title="Prihlaseni" />
            <div className="flex min-h-screen items-center justify-center bg-[#0a0a08]">
                <Card className="w-full max-w-sm border-[#F5F0E8]/[0.06] bg-[#F5F0E8]/[0.04] backdrop-blur-xl">
                    <CardHeader className="text-center">
                        <CardTitle className="text-2xl font-bold text-white">
                            The Safari HQ
                        </CardTitle>
                        <p className="text-sm text-white/50">
                            Prihlaste se do systemu
                        </p>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-white/70">
                                    E-mail
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="admin@thesafari.cz"
                                    className="border-[#F5F0E8]/[0.06] bg-[#F5F0E8]/[0.04] text-white placeholder:text-white/30"
                                    autoFocus
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-400">{errors.email}</p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password" className="text-white/70">
                                    Heslo
                                </Label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    className="border-[#F5F0E8]/[0.06] bg-[#F5F0E8]/[0.04] text-white placeholder:text-white/30"
                                />
                                {errors.password && (
                                    <p className="text-sm text-red-400">{errors.password}</p>
                                )}
                            </div>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="w-full bg-amber-600 text-white hover:bg-amber-500"
                            >
                                {processing ? 'Prihlasuji...' : 'Prihlasit se'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
