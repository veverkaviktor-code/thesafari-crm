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
            <Head title="Přihlášení" />
            <div className="dark bg-background min-h-screen">
                <div className="flex min-h-screen items-center justify-center">
                    <Card className="w-full max-w-sm border-border bg-accent backdrop-blur-xl">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold text-foreground">
                                The Safari HQ
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Přihlaste se do systému
                            </p>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="email" className="text-muted-foreground">
                                        E-mail
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        placeholder="admin@thesafari.cz"
                                        className="border-border bg-accent text-foreground placeholder:text-muted-foreground"
                                        autoFocus
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-red-400">{errors.email}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-muted-foreground">
                                        Heslo
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        className="border-border bg-accent text-foreground placeholder:text-muted-foreground"
                                    />
                                    {errors.password && (
                                        <p className="text-sm text-red-400">{errors.password}</p>
                                    )}
                                </div>
                                <div className="flex items-center justify-between">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={data.remember}
                                            onChange={(e) => setData('remember', e.target.checked)}
                                            className="rounded border-border"
                                        />
                                        <span className="text-sm text-muted-foreground">Zapamatovat si</span>
                                    </label>
                                    <a
                                        href="/zapomenute-heslo"
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Zapomenuté heslo?
                                    </a>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full bg-primary text-white hover:bg-primary/80"
                                >
                                    {processing ? 'Přihlašuji...' : 'Přihlásit se'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
