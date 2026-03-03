import { type FormEvent } from 'react';
import { type InertiaFormProps } from '@inertiajs/react';
import { format } from 'date-fns';
import { cs } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

export interface NeniwebFormData {
    type: string;
    customer_id: string;
    name: string;
    provider: string;
    server: string;
    price_yearly: string;
    starts_at: string;
    expires_at: string;
    auto_renew: boolean;
    status: string;
    notes: string;
}

export const defaultNeniwebData: NeniwebFormData = {
    type: 'domena',
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
};

interface Customer {
    id: number;
    name: string;
    company: string | null;
}

interface NeniwebFormProps {
    form: InertiaFormProps<NeniwebFormData>;
    onSubmit: (e: FormEvent) => void;
    submitLabel: string;
    customers: Customer[];
    onCancel?: () => void;
}

export default function NeniwebForm({
    form,
    onSubmit,
    submitLabel,
    customers,
    onCancel,
}: NeniwebFormProps) {
    const { data, setData, errors, processing } = form;

    const isDomain = data.type === 'domena';

    const handleCancel = () => {
        if (onCancel) {
            onCancel();
        } else {
            window.history.back();
        }
    };

    return (
        <form onSubmit={onSubmit} className="space-y-5">
            {/* Type */}
            <div>
                <Label className="text-muted-foreground">Typ</Label>
                <Select
                    value={data.type}
                    onValueChange={(v) => setData('type', v)}
                >
                    <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                        <SelectItem value="domena">Doména</SelectItem>
                        <SelectItem value="hosting">Hosting</SelectItem>
                    </SelectContent>
                </Select>
                {errors.type && (
                    <p className="mt-1 text-xs text-red-400">{errors.type}</p>
                )}
            </div>

            {/* Customer */}
            <div>
                <Label className="text-muted-foreground">Zákazník</Label>
                <Select
                    value={data.customer_id}
                    onValueChange={(v) => setData('customer_id', v)}
                >
                    <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                        <SelectValue placeholder="Vyberte zákazníka" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border">
                        {customers.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                                {c.company || c.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.customer_id && (
                    <p className="mt-1 text-xs text-red-400">
                        {errors.customer_id}
                    </p>
                )}
            </div>

            {/* Name */}
            <div>
                <Label className="text-muted-foreground">
                    {isDomain ? 'Název domény' : 'Název hostingu'}
                </Label>
                <Input
                    value={data.name}
                    onChange={(e) => setData('name', e.target.value)}
                    placeholder={
                        isDomain ? 'example.cz' : 'Hosting example.cz'
                    }
                    className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                />
                {errors.name && (
                    <p className="mt-1 text-xs text-red-400">{errors.name}</p>
                )}
            </div>

            {/* Provider / Server */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-muted-foreground">
                        {isDomain ? 'Registrár' : 'Poskytovatel'}
                    </Label>
                    <Input
                        value={data.provider}
                        onChange={(e) => setData('provider', e.target.value)}
                        placeholder={
                            isDomain ? 'WEDOS, Forpsi...' : 'WEDOS, VPS...'
                        }
                        className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                    />
                </div>
                {!isDomain && (
                    <div>
                        <Label className="text-muted-foreground">Server</Label>
                        <Input
                            value={data.server}
                            onChange={(e) =>
                                setData('server', e.target.value)
                            }
                            placeholder="37.235.108.29"
                            className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                )}
                {isDomain && (
                    <div>
                        <Label className="text-muted-foreground">Roční cena (Kč)</Label>
                        <Input
                            type="number"
                            value={data.price_yearly}
                            onChange={(e) =>
                                setData('price_yearly', e.target.value)
                            }
                            placeholder="250"
                            className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                )}
            </div>

            {!isDomain && (
                <div>
                    <Label className="text-muted-foreground">Roční cena (Kč)</Label>
                    <Input
                        type="number"
                        value={data.price_yearly}
                        onChange={(e) =>
                            setData('price_yearly', e.target.value)
                        }
                        placeholder="1200"
                        className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                    />
                </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label className="text-muted-foreground">Začátek</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="mt-1.5 w-full justify-start text-left bg-muted border-border text-foreground hover:bg-muted"
                            >
                                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                {data.starts_at
                                    ? format(
                                          new Date(data.starts_at),
                                          'd. M. yyyy',
                                          { locale: cs },
                                      )
                                    : 'Vyberte datum'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border">
                            <Calendar
                                mode="single"
                                selected={
                                    data.starts_at
                                        ? new Date(data.starts_at)
                                        : undefined
                                }
                                onSelect={(d) =>
                                    d &&
                                    setData(
                                        'starts_at',
                                        format(d, 'yyyy-MM-dd'),
                                    )
                                }
                                locale={cs}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div>
                    <Label className="text-muted-foreground">Expirace</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="mt-1.5 w-full justify-start text-left bg-muted border-border text-foreground hover:bg-muted"
                            >
                                <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                                {data.expires_at
                                    ? format(
                                          new Date(data.expires_at),
                                          'd. M. yyyy',
                                          { locale: cs },
                                      )
                                    : 'Vyberte datum'}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-card border-border">
                            <Calendar
                                mode="single"
                                selected={
                                    data.expires_at
                                        ? new Date(data.expires_at)
                                        : undefined
                                }
                                onSelect={(d) =>
                                    d &&
                                    setData(
                                        'expires_at',
                                        format(d, 'yyyy-MM-dd'),
                                    )
                                }
                                locale={cs}
                            />
                        </PopoverContent>
                    </Popover>
                    {errors.expires_at && (
                        <p className="mt-1 text-xs text-red-400">
                            {errors.expires_at}
                        </p>
                    )}
                </div>
            </div>

            {/* Auto-renew + Status */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 pt-6">
                    <Switch
                        checked={data.auto_renew}
                        onCheckedChange={(v) => setData('auto_renew', v)}
                    />
                    <Label className="text-muted-foreground">Auto-renew</Label>
                </div>
                <div>
                    <Label className="text-muted-foreground">Stav</Label>
                    <Select
                        value={data.status}
                        onValueChange={(v) => setData('status', v)}
                    >
                        <SelectTrigger className="mt-1.5 bg-muted border-border text-foreground">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border">
                            <SelectItem value="aktivni">Aktivní</SelectItem>
                            <SelectItem value="neaktivni">Neaktivní</SelectItem>
                            <SelectItem value="expirovana">Expirovaná</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Notes */}
            <div>
                <Label className="text-muted-foreground">Poznámky</Label>
                <Textarea
                    value={data.notes}
                    onChange={(e) => setData('notes', e.target.value)}
                    rows={3}
                    className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground resize-none"
                />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                    type="button"
                    variant="ghost"
                    onClick={handleCancel}
                    className="text-muted-foreground hover:text-foreground"
                >
                    Zrušit
                </Button>
                <Separator orientation="vertical" className="h-6 bg-border" />
                <Button
                    type="submit"
                    disabled={processing}
                    className="bg-primary hover:bg-primary/80 text-white"
                >
                    {processing ? 'Ukládám...' : submitLabel}
                </Button>
            </div>
        </form>
    );
}
