import { useState } from 'react';
import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Building2 } from 'lucide-react';
import Profile from './Profile';
import Company from './Company';

interface Props {
    user: {
        id: number;
        name: string;
        email: string;
        avatar: string | null;
    };
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
    tab?: string;
}

export default function SettingsIndex({ user, company, tab }: Props) {
    const [activeTab, setActiveTab] = useState(tab || 'profile');

    return (
        <AuthenticatedLayout
            title="Nastavení"
            breadcrumbs={[{ label: 'Nastavení' }]}
        >
            <div className="p-6 max-w-4xl mx-auto">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex gap-6">
                    {/* Side navigation */}
                    <TabsList className="flex flex-col h-auto bg-transparent border-0 w-[200px] shrink-0 gap-1">
                        <TabsTrigger
                            value="profile"
                            className="w-full justify-start px-3 py-2.5 text-gray-400 data-[state=active]:bg-[#1a1a22] data-[state=active]:text-gray-100 data-[state=active]:border data-[state=active]:border-white/5 rounded-lg"
                        >
                            <User className="h-4 w-4 mr-2" />
                            Profil
                        </TabsTrigger>
                        <TabsTrigger
                            value="company"
                            className="w-full justify-start px-3 py-2.5 text-gray-400 data-[state=active]:bg-[#1a1a22] data-[state=active]:text-gray-100 data-[state=active]:border data-[state=active]:border-white/5 rounded-lg"
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
