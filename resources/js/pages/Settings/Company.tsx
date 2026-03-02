import { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Camera, Building2 } from 'lucide-react';

interface Props {
    company: {
        name: string;
        ico: string;
        address: string;
        city: string;
        zip: string;
        bank_account: string;
        bank_name: string;
        logo_path: string | null;
        phone: string;
        email: string;
        web: string;
    };
}

export default function Company({ company }: Props) {
    const [logoPreview, setLogoPreview] = useState<string | null>(company.logo_path);

    const { data, setData, post, processing, errors } = useForm({
        name: company.name || '',
        ico: company.ico || '',
        address: company.address || '',
        city: company.city || '',
        zip: company.zip || '',
        bank_account: company.bank_account || '',
        bank_name: company.bank_name || '',
        phone: company.phone || '',
        email: company.email || '',
        web: company.web || '',
        logo: null as File | null,
    });

    function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setData('logo', file);
            const reader = new FileReader();
            reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        post('/nastaveni/company', { preserveScroll: true });
    }

    return (
        <div className="bg-[#1a1a22] rounded-xl border border-white/5 p-6">
            <h2 className="text-lg font-semibold text-gray-100 mb-1">Firemní údaje</h2>
            <p className="text-sm text-gray-500 mb-6">Tyto údaje se zobrazují na fakturách.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Logo */}
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        {logoPreview ? (
                            <img
                                src={logoPreview}
                                alt="Logo"
                                className="h-20 w-20 rounded-xl object-contain bg-[#111116] border border-white/5 p-2"
                            />
                        ) : (
                            <div className="h-20 w-20 rounded-xl bg-[#111116] border border-white/5 flex items-center justify-center">
                                <Building2 className="h-8 w-8 text-gray-600" />
                            </div>
                        )}
                        <label className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                            <Camera className="h-5 w-5 text-white" />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoChange}
                                className="hidden"
                            />
                        </label>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-300">Logo firmy</p>
                        <p className="text-xs text-gray-500">PNG nebo SVG, max 2 MB</p>
                    </div>
                </div>

                <Separator className="bg-white/5" />

                {/* Company name + ICO */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-gray-300">Název firmy</Label>
                        <Input
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="The Safari s.r.o."
                            className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600"
                        />
                        {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
                    </div>
                    <div>
                        <Label className="text-gray-300">IČO</Label>
                        <Input
                            value={data.ico}
                            onChange={(e) => setData('ico', e.target.value)}
                            placeholder="12345678"
                            className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600"
                        />
                        {errors.ico && <p className="mt-1 text-xs text-red-400">{errors.ico}</p>}
                    </div>
                </div>

                {/* Address */}
                <div>
                    <Label className="text-gray-300">Ulice a číslo popisné</Label>
                    <Input
                        value={data.address}
                        onChange={(e) => setData('address', e.target.value)}
                        placeholder="Dlouhá 123"
                        className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-gray-300">Město</Label>
                        <Input
                            value={data.city}
                            onChange={(e) => setData('city', e.target.value)}
                            placeholder="Praha"
                            className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600"
                        />
                    </div>
                    <div>
                        <Label className="text-gray-300">PSČ</Label>
                        <Input
                            value={data.zip}
                            onChange={(e) => setData('zip', e.target.value)}
                            placeholder="110 00"
                            className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600"
                        />
                    </div>
                </div>

                <Separator className="bg-white/5" />

                {/* Bank */}
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label className="text-gray-300">Číslo účtu</Label>
                        <Input
                            value={data.bank_account}
                            onChange={(e) => setData('bank_account', e.target.value)}
                            placeholder="1234567890/3030"
                            className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600"
                        />
                    </div>
                    <div>
                        <Label className="text-gray-300">Název banky</Label>
                        <Input
                            value={data.bank_name}
                            onChange={(e) => setData('bank_name', e.target.value)}
                            placeholder="Air Bank"
                            className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600"
                        />
                    </div>
                </div>

                <Separator className="bg-white/5" />

                {/* Contact */}
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <Label className="text-gray-300">Telefon</Label>
                        <Input
                            value={data.phone}
                            onChange={(e) => setData('phone', e.target.value)}
                            placeholder="+420 123 456 789"
                            className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600"
                        />
                    </div>
                    <div>
                        <Label className="text-gray-300">E-mail</Label>
                        <Input
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="info@thesafari.cz"
                            className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600"
                        />
                    </div>
                    <div>
                        <Label className="text-gray-300">Web</Label>
                        <Input
                            value={data.web}
                            onChange={(e) => setData('web', e.target.value)}
                            placeholder="thesafari.cz"
                            className="mt-1.5 bg-[#111116] border-white/10 text-gray-200 placeholder:text-gray-600"
                        />
                    </div>
                </div>

                <div className="flex justify-end pt-2">
                    <Button
                        type="submit"
                        disabled={processing}
                        className="bg-[#D97706] hover:bg-[#B45309] text-white"
                    >
                        Uložit firemní údaje
                    </Button>
                </div>
            </form>
        </div>
    );
}
