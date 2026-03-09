import { Head, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ForgotPassword() {
    const { flash } = usePage<{ flash?: { type: string; message: string } }>().props;

    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/zapomenute-heslo');
    }

    return (
        <>
            <Head title="Zapomenuté heslo" />
            <div className="dark bg-background min-h-screen">
                <div className="flex min-h-screen items-center justify-center">
                    <Card className="w-full max-w-sm border-border bg-accent backdrop-blur-xl">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl font-bold text-foreground">
                                Obnovení hesla
                            </CardTitle>
                            <p className="text-sm text-muted-foreground">
                                Zadejte svůj e-mail a zašleme vám odkaz pro obnovení hesla.
                            </p>
                        </CardHeader>
                        <CardContent>
                            {flash?.message && (
                                <div className="mb-4 rounded-md border border-green-800 bg-green-950/40 px-4 py-3 text-sm text-green-400">
                                    {flash.message}
                                </div>
                            )}

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
                                        placeholder="vas@email.cz"
                                        className="border-border bg-accent text-foreground placeholder:text-muted-foreground"
                                        autoFocus
                                    />
                                    {errors.email && (
                                        <p className="text-sm text-red-400">{errors.email}</p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    disabled={processing}
                                    className="w-full bg-primary text-white hover:bg-primary/80"
                                >
                                    {processing ? 'Odesílám...' : 'Odeslat odkaz pro obnovení'}
                                </Button>

                                <div className="text-center">
                                    <a
                                        href="/login"
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Zpět na přihlášení
                                    </a>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}
