import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
    token: string;
    email: string;
}

export default function ResetPassword({ token, email }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        token,
        email,
        password: '',
        password_confirmation: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/obnovit-heslo');
    }

    return (
        <>
            <Head title="Nastavení nového hesla" />
            <div className="dark bg-background min-h-screen">
                <div className="flex min-h-screen items-center justify-center">
                    <Card className="w-full max-w-sm border-border bg-accent backdrop-blur-xl">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold text-foreground">
                                Nové heslo
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Zadejte nové heslo pro váš účet.
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
                                        className="border-border bg-accent text-foreground placeholder:text-muted-foreground"
                                        autoComplete="username"
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-red-400">{errors.email}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-muted-foreground">
                                        Nové heslo
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        placeholder="Minimálně 8 znaků"
                                        className="border-border bg-accent text-foreground placeholder:text-muted-foreground"
                                        autoFocus
                                        autoComplete="new-password"
                                    />
                                    {errors.password && (
                                        <p className="text-sm text-red-400">{errors.password}</p>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="password_confirmation" className="text-muted-foreground">
                                        Potvrzení hesla
                                    </Label>
                                    <Input
                                        id="password_confirmation"
                                        type="password"
                                        value={data.password_confirmation}
                                        onChange={(e) => setData('password_confirmation', e.target.value)}
                                        placeholder="Zopakujte nové heslo"
                                        className="border-border bg-accent text-foreground placeholder:text-muted-foreground"
                                        autoComplete="new-password"
                                    />
                                    {errors.password_confirmation && (
                                        <p className="text-sm text-red-400">{errors.password_confirmation}</p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full bg-primary text-white hover:bg-primary/80"
                                >
                                    {processing ? 'Ukládám...' : 'Nastavit nové heslo'}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
