import { useState } from "react";
import AuthenticatedLayout from "@/layouts/AuthenticatedLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Building2 } from "lucide-react";
import Profile from "./Profile";
import Company from "./Company";

interface Props {
    user: {
        id: number;
        name: string;
        email: string;
        avatar_path: string | null;
    };
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
    tab?: string;
}

export default function SettingsIndex({ user, company, tab }: Props) {
    const [activeTab, setActiveTab] = useState(tab || "profile");

    return (
        <AuthenticatedLayout
            title="Nastavení"
            breadcrumbs={[{ label: "Nastavení" }]}
        >
            <div className="p-6 max-w-4xl mx-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex gap-6">
                    {/* Side navigation */}
                    <TabsList className="flex flex-col h-auto bg-transparent border-0 w-[200px] shrink-0 gap-1">
                        <TabsTrigger
                            value="profile"
                            className="w-full justify-start px-3 py-2.5 text-[#9C9585] data-[state=active]:bg-[#16140f] data-[state=active]:text-[#F5F0E8] data-[state=active]:border data-[state=active]:border-[#F5F0E8]/[0.05] rounded-lg"
                        >
                            <User className="h-4 w-4 mr-2" />
                            Profil
                        </TabsTrigger>
                        <TabsTrigger
                            value="company"
                            className="w-full justify-start px-3 py-2.5 text-[#9C9585] data-[state=active]:bg-[#16140f] data-[state=active]:text-[#F5F0E8] data-[state=active]:border data-[state=active]:border-[#F5F0E8]/[0.05] rounded-lg"
                        >
                            <Building2 className="h-4 w-4 mr-2" />
                            Firma
                        </TabsTrigger>
                    </TabsList>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <TabsContent value="profile" className="mt-0">
                            <Profile user={user} />
                        </TabsContent>
                        <TabsContent value="company" className="mt-0">
                            <Company company={company} />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </AuthenticatedLayout>
    );
}
