import { useState } from "react";
import { useForm } from "@inertiajs/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Camera, Building2 } from "lucide-react";

interface Props {
    company: {
        id?: number;
        company_name: string;
        ico: string | null;
        dic: string | null;
        address: {
            street: string;
            city: string;
            zip: string;
            country: string;
        } | null;
        logo_path: string | null;
        bank_account: string | null;
        bank_iban: string | null;
        email_from: string | null;
    };
}

export default function Company({ company }: Props) {
    const [logoPreview, setLogoPreview] = useState<string | null>(
        company.logo_path ? `/storage/${company.logo_path}` : null
    );

    const { data, setData, put, processing, errors } = useForm({
        company_name: company.company_name || "",
        ico: company.ico || "",
        dic: company.dic || "",
        address: {
            street: company.address?.street || "",
            city: company.address?.city || "",
            zip: company.address?.zip || "",
            country: company.address?.country || "CZ",
        },
        bank_account: company.bank_account || "",
        bank_iban: company.bank_iban || "",
        email_from: company.email_from || "",
        logo: null as File | null,
    });

    function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (file) {
            setData("logo", file);
            const reader = new FileReader();
            reader.onload = (ev) => setLogoPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        }
    }

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        put("/nastaveni/firma", { preserveScroll: true, forceFormData: true });
    }

    return (
        <div className="space-y-6">
            <div className="bg-card rounded-xl border border-border p-6">
                <h2 className="text-lg font-semibold text-foreground mb-1">Firemní údaje</h2>
                <p className="text-sm text-muted-foreground mb-6">Tyto údaje se zobrazují na fakturách.</p>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Logo */}
                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            {logoPreview ? (
                                <img
                                    src={logoPreview}
                                    alt="Logo"
                                    className="h-20 w-20 rounded-xl object-contain bg-muted border border-border p-2"
                                />
                            ) : (
                                <div className="h-20 w-20 rounded-xl bg-muted border border-border flex items-center justify-center">
                                    <Building2 className="h-8 w-8 text-muted-foreground" />
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
                            <p className="text-sm font-medium text-muted-foreground">Logo firmy</p>
                            <p className="text-xs text-muted-foreground">PNG nebo SVG, max 2 MB</p>
                        </div>
                    </div>

                    <Separator className="bg-border" />

                    {/* Company name + ICO + DIC */}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <Label className="text-muted-foreground">Název firmy</Label>
                            <Input
                                value={data.company_name}
                                onChange={(e) => setData("company_name", e.target.value)}
                                placeholder="The Safari s.r.o."
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                            {errors.company_name && <p className="mt-1 text-xs text-red-400">{errors.company_name}</p>}
                        </div>
                        <div>
                            <Label className="text-muted-foreground">IČO</Label>
                            <Input
                                value={data.ico}
                                onChange={(e) => setData("ico", e.target.value)}
                                placeholder="12345678"
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                        <div>
                            <Label className="text-muted-foreground">DIČ</Label>
                            <Input
                                value={data.dic}
                                onChange={(e) => setData("dic", e.target.value)}
                                placeholder="Nepovinné (neplátce DPH)"
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>

                    <Separator className="bg-border" />

                    {/* Address */}
                    <div>
                        <Label className="text-muted-foreground">Ulice a číslo popisné</Label>
                        <Input
                            value={data.address.street}
                            onChange={(e) => setData("address", { ...data.address, street: e.target.value })}
                            placeholder="Dlouhá 123"
                            className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground">Město</Label>
                            <Input
                                value={data.address.city}
                                onChange={(e) => setData("address", { ...data.address, city: e.target.value })}
                                placeholder="Praha"
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                        <div>
                            <Label className="text-muted-foreground">PSČ</Label>
                            <Input
                                value={data.address.zip}
                                onChange={(e) => setData("address", { ...data.address, zip: e.target.value })}
                                placeholder="110 00"
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>

                    <Separator className="bg-border" />

                    {/* Banking */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground">Číslo účtu</Label>
                            <Input
                                value={data.bank_account}
                                onChange={(e) => setData("bank_account", e.target.value)}
                                placeholder="1234567890/3030"
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                        <div>
                            <Label className="text-muted-foreground">IBAN</Label>
                            <Input
                                value={data.bank_iban}
                                onChange={(e) => setData("bank_iban", e.target.value)}
                                placeholder="CZ..."
                                className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>

                    <Separator className="bg-border" />

                    {/* Email */}
                    <div>
                        <Label className="text-muted-foreground">Email odesílatele (faktury, upomínky)</Label>
                        <Input
                            type="email"
                            value={data.email_from}
                            onChange={(e) => setData("email_from", e.target.value)}
                            placeholder="info@thesafari.cz"
                            className="mt-1.5 bg-muted border-border text-foreground placeholder:text-muted-foreground"
                        />
                    </div>

                    <div className="flex justify-end pt-2">
                        <Button
                            type="submit"
                            disabled={processing}
                            className="bg-primary hover:bg-primary/80 text-white"
                        >
                            Uložit firemní údaje
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
