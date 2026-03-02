import { useForm } from '@inertiajs/react';
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
import { CalendarIcon, ArrowLeft } from 'lucide-react';
import { router } from '@inertiajs/react';

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface Props {
    customers: Customer[];
    type?: string;
}

export default function NeniwebCreate({ customers, type: initialType }: Props) {
    const { data, setData, post, processing, errors } = useForm({
        type: initialType || 'domena',
        customer_id: '',
        name: '',
        provider: '',
        server: '',
        price_yearly: '',
        starts_at: format(new Date(), 'yyyy-MM-dd'),
        expires_at: '',
        auto_renew: true,
        status: 'aktivni',
        notes: '',
    });

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/neniweb');
    }

    const isDomain = data.type === 'domena';

    return (
        <AuthenticatedLayout
            title={isDomain ? 'Nová doména' : 'Nový hosting'}
            breadcrumbs={[
                { label: 'Neniweb', href: '/neniweb' },
                { label: isDomain ? 'Nová doména' : 'Nový hosting' },
            ]}
        >
            <div className="p-6 max-w-2xl mx-auto">
                <Button
                    variant="ghost"
                    onClick={() => router.visit('/neniweb')}
                    className="text-gray-400 hover:text-gray-200 mb-4"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Zpět
                </Button>

                <div className="bg-[#1a1a22] rounded-xl border border-white/5 p-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Type */}
                        <div>
                            <Label className="text-gray-300">Typ</Label>
                            <Select value={data.type} onValueChange={(v) => setData('type', v)}>
                                <SelectTrigger className="mt-1.5 bg-[#111116] border-white/10 text-gray-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a22] border-white/10">
                                    <SelectItem value="domena">Doména</SelectItem>
                                    <SelectItem value="hosting">Hosting</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.type && <p className="mt-1 text-xs text-red-400">{errors.type}</p>}
                        </div>

                        {/* Customer */}
                        <div>
                            <Label className="text-gray-300">Zákazník</Label>
                            <Select value={data.customer_id} onValueChange={(v) => setData('customer_id', v)}>
                                <SelectTrigger className="mt-1.5 bg-[#111116] border-white/10 text-gray-200">
                                    <SelectValue placeholder="Vyberte zákazníka" />
                                </SelectTrigger>
                                <SelectContent className="bg-[#1a1a22] border-white/10">
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
                            <Label className="text-gray-300">{isDomain ? 'Název domény' : 'Název hostingu'}</Label>
                            <Input
                                value={data.name}
                                onChange={(e) => setData('name', e.target.value)}
                                placeholder={isDomain ? 'example.cz' : 'Hosting example.cz'}
                                className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600"
                            />
                            {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                        </div>

                        {/* Provider / Server */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-gray-300">{isDomain ? 'Registrár' : 'Poskytovatel'}</Label>
                                <Input
                                    value={data.provider}
                                    onChange={(e) => setData('provider', e.target.value)}
                                    placeholder={isDomain ? 'WEDOS, Forpsi...' : 'WEDOS, VPS...'}
                                    className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600"
                                />
                            </div>
                            {!isDomain && (
                                <div>
                                    <Label className="text-gray-300">Server</Label>
                                    <Input
                                        value={data.server}
                                        onChange={(e) => setData('server', e.target.value)}
                                        placeholder="37.235.108.29"
                                        className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600"
                                    />
                                </div>
                            )}
                            {isDomain && (
                                <div>
                                    <Label className="text-gray-300">Roční cena (Kč)</Label>
                                    <Input
                                        type="number"
                                        value={data.price_yearly}
                                        onChange={(e) => setData('price_yearly', e.target.value)}
                                        placeholder="250"
                                        className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600"
                                    />
                                </div>
                            )}
                        </div>

                        {!isDomain && (
                            <div>
                                <Label className="text-gray-300">Roční cena (Kč)</Label>
                                <Input
                                    type="number"
                                    value={data.price_yearly}
                                    onChange={(e) => setData('price_yearly', e.target.value)}
                                    placeholder="1200"
                                    className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600"
                                />
                            </div>
                        )}

                        {/* Dates */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label className="text-gray-300">Začátek</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="mt-1.5 w-full justify-start text-left bg-[#111116] border-white/10 text-gray-200 hover:bg-[#111116]"
                                        >
                                            <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                                            {data.starts_at
                                                ? format(new Date(data.starts_at), 'd. M. yyyy', { locale: cs })
                                                : 'Vyberte datum'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-[#1a1a22] border-white/10">
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
                                <Label className="text-gray-300">Expirace</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="mt-1.5 w-full justify-start text-left bg-[#111116] border-white/10 text-gray-200 hover:bg-[#111116]"
                                        >
                                            <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                                            {data.expires_at
                                                ? format(new Date(data.expires_at), 'd. M. yyyy', { locale: cs })
                                                : 'Vyberte datum'}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 bg-[#1a1a22] border-white/10">
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
                                <Label className="text-gray-300">Auto-renew</Label>
                            </div>
                            <div>
                                <Label className="text-gray-300">Stav</Label>
                                <Select value={data.status} onValueChange={(v) => setData('status', v)}>
                                    <SelectTrigger className="mt-1.5 bg-[#111116] border-white/10 text-gray-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-[#1a1a22] border-white/10">
                                        <SelectItem value="aktivni">Aktivní</SelectItem>
                                        <SelectItem value="neaktivni">Neaktivní</SelectItem>
                                        <SelectItem value="expirovana">Expirovaná</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Notes */}
                        <div>
                            <Label className="text-gray-300">Poznámky</Label>
                            <Textarea
                                value={data.notes}
                                onChange={(e) => setData('notes', e.target.value)}
                                rows={3}
                                className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600 resize-none"
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => router.visit('/neniweb')}
                                className="text-gray-400"
                            >
                                Zrušit
                            </Button>
                            <Button
                                type="submit"
                                disabled={processing}
                                className="bg-[#D97706] hover:bg-[#B45309] text-white"
                            >
                                Uložit
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
