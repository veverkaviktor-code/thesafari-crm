import { useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarIcon, ArrowLeft, Trash2 } from 'lucide-react';

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface Subscription {
    id: number;
    type: string;
    customer_id: number;
    name: string;
    provider: string | null;
    server: string | null;
    price_yearly: number;
    starts_at: string;
    expires_at: string;
    auto_renew: boolean;
    status: string;
    notes: string | null;
}

interface Props {
    subscription: Subscription;
    customers: Customer[];
}

export default function NeniwebEdit({ subscription, customers }: Props) {
    const { data, setData, put, processing, errors } = useForm({
        type: subscription.type,
        customer_id: String(subscription.customer_id),
        name: subscription.name,
        provider: subscription.provider || '',
        server: subscription.server || '',
        price_yearly: String(subscription.price_yearly),
        starts_at: subscription.starts_at,
        expires_at: subscription.expires_at,
        auto_renew: subscription.auto_renew,
        status: subscription.status,
        notes: subscription.notes || '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        put(`/neniweb/${subscription.id}`);
    }

    function handleDelete() {
        if (confirm('Opravdu chcete smazat tuto položku?')) {
            router.delete(`/neniweb/${subscription.id}`);
        }
    }

    const isDomain = data.type === 'domena';

    return (
        <AuthenticatedLayout
            title={`Upravit: ${subscription.name}`}
            breadcrumbs={[
                { label: 'Neniweb', href: '/neniweb' },
                { label: subscription.name },
            ]}
        >
            <div className="p-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                    <Button
                        variant="ghost"
                        onClick={() => router.visit('/neniweb')}
                        className="text-[#9C9585] hover:text-[#F5F0E8]/85"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Zpět
                    </Button>
                    <Button
                        variant="ghost"
                        onClick={handleDelete}
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Smazat
                    </Button>
                </div>

                <div className="bg-[#16140f] rounded-xl border border-[#F5F0E8]/[0.05] p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Type */}
                        <div>
                            <Label className="text-[#F5F0E8]/70">Typ</Label>
                            <Select value={data.type} onValueChange={(v) => setData('type', v)}>
                                <SelectTrigger className="mt-1.5 bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/85">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#16140f] border-[#F5F0E8]/[0.06]">
                                    <SelectItem value="domena">Doména</SelectItem>
                                    <SelectItem value="hosting">Hosting</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Customer */}
                        <div>
                            <Label className="text-[#F5F0E8]/70">Zákazník</Label>
                            <Select value={data.customer_id} onValueChange={(v) => setData('customer_id', v)}>
                                <SelectTrigger className="mt-1.5 bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/85">
                                    <SelectValue placeholder="Vyberte zákazníka" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#16140f] border-[#F5F0E8]/[0.06]">
                                    {customers.map((c) => (
                                        <SelectItem key={c.id} value={String(c.id)}>
                                            {c.company || c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {errors.customer_id && <p className="mt-1 text-xs text-red-400">{errors.customer_id}</p>}
                        </div>

                        {/* Name */}
                        <div>
                            <Label className="text-[#F5F0E8]/70">{isDomain ? 'Název domény' : 'Název hostingu'}</Label>
                            <Input
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                className="mt-1.5 bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/85"
                            />
                            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                        </div>

                        {/* Provider / Server */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-[#F5F0E8]/70">{isDomain ? 'Registrár' : 'Poskytovatel'}</Label>
                                <Input
                                    value={data.provider}
                                    onChange={(e) => setData('provider', e.target.value)}
                                    className="mt-1.5 bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/85"
                                />
                            </div>
                            <div>
                                <Label className="text-[#F5F0E8]/70">{isDomain ? 'Roční cena (Kč)' : 'Server'}</Label>
                                {isDomain ? (
                                    <Input
                                        type="number"
                                        value={data.price_yearly}
                                        onChange={(e) => setData('price_yearly', e.target.value)}
                                        className="mt-1.5 bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/85"
                                    />
                                ) : (
                                    <Input
                                        value={data.server}
                                        onChange={(e) => setData('server', e.target.value)}
                                        className="mt-1.5 bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/85"
                                    />
                                )}
                            </div>
                        </div>

                        {!isDomain && (
                            <div>
                                <Label className="text-[#F5F0E8]/70">Roční cena (Kč)</Label>
                                <Input
                                    type="number"
                                    value={data.price_yearly}
                                    onChange={(e) => setData('price_yearly', e.target.value)}
                                    className="mt-1.5 bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/85"
                                />
                            </div>
                        )}

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-[#F5F0E8]/70">Začátek</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="mt-1.5 w-full justify-start text-left bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/85 hover:bg-[#0f0e0c]"
                                        >
                                            <CalendarIcon className="h-4 w-4 mr-2 text-[#6B6560]" />
                                            {data.starts_at
                                                ? format(new Date(data.starts_at), 'd. M. yyyy', { locale: cs })
                                                : 'Vyberte datum'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-[#16140f] border-[#F5F0E8]/[0.06]">
                                        <Calendar
                                            mode="single"
                                            selected={data.starts_at ? new Date(data.starts_at) : undefined}
                                            onSelect={(d) => d && setData('starts_at', format(d, 'yyyy-MM-dd'))}
                                            locale={cs}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label className="text-[#F5F0E8]/70">Expirace</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="mt-1.5 w-full justify-start text-left bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/85 hover:bg-[#0f0e0c]"
                                        >
                                            <CalendarIcon className="h-4 w-4 mr-2 text-[#6B6560]" />
                                            {data.expires_at
                                                ? format(new Date(data.expires_at), 'd. M. yyyy', { locale: cs })
                                                : 'Vyberte datum'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-[#16140f] border-[#F5F0E8]/[0.06]">
                                        <Calendar
                                            mode="single"
                                            selected={data.expires_at ? new Date(data.expires_at) : undefined}
                                            onSelect={(d) => d && setData('expires_at', format(d, 'yyyy-MM-dd'))}
                                            locale={cs}
                                        />
                                    </PopoverContent>
                                </Popover>
                                {errors.expires_at && <p className="mt-1 text-xs text-red-400">{errors.expires_at}</p>}
                            </div>
                        </div>

                        {/* Auto-renew + Status */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center gap-3 pt-6">
                                <Switch
                                    checked={data.auto_renew}
                                    onCheckedChange={(v) => setData('auto_renew', v)}
                                />
                                <Label className="text-[#F5F0E8]/70">Auto-renew</Label>
                            </div>
                            <div>
                                <Label className="text-[#F5F0E8]/70">Stav</Label>
                                <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                                    <SelectTrigger className="mt-1.5 bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/85">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#16140f] border-[#F5F0E8]/[0.06]">
                                        <SelectItem value="aktivni">Aktivní</SelectItem>
                                        <SelectItem value="neaktivni">Neaktivní</SelectItem>
                                        <SelectItem value="expirovana">Expirovaná</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <Label className="text-[#F5F0E8]/70">Poznámky</Label>
                            <Textarea
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={3}
                                className="mt-1.5 bg-[#0f0e0c] border-[#F5F0E8]/[0.06] text-[#F5F0E8]/85 resize-none"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => router.visit('/neniweb')}
                                className="text-[#9C9585]"
                            >
                                Zrušit
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="bg-[#D97706] hover:bg-[#B45309] text-white"
                            >
                                Uložit změny
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
