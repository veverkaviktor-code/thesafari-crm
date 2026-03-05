import { useState } from "react";
import AuthenticatedLayout from "@/layouts/AuthenticatedLayout";
import { User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
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

const tabs = [
    { value: "profile", label: "Profil", icon: User, description: "Jméno, email a avatar" },
    { value: "company", label: "Firma", icon: Building2, description: "Firemní údaje a fakturace" },
];

export default function SettingsIndex({ user, company, tab }: Props) {
    const [activeTab, setActiveTab] = useState(tab || "profile");

    return (
        <AuthenticatedLayout
            title="Nastavení"
            breadcrumbs={[{ label: "Nastavení" }]}
        >
            <div className="p-6 max-w-5xl mx-auto">
                <div className="flex gap-8">
                    {/* Side navigation */}
                    <nav className="w-[220px] shrink-0 space-y-1">
                        {tabs.map((t) => {
                            const Icon = t.icon;
                            const isActive = activeTab === t.value;
                            return (
                                <button
                                    key={t.value}
                                    onClick={() => setActiveTab(t.value)}
                                    className={cn(
                                        "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors",
                                        isActive
                                            ? "bg-card border border-border text-foreground"
                                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                    )}
                                >
                                    <Icon className={cn("h-5 w-5 shrink-0", isActive ? "text-primary" : "")} />
                                    <div>
                                        <p className="text-sm font-medium">{t.label}</p>
                                        <p className="text-xs text-muted-foreground">{t.description}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </nav>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {activeTab === "profile" && <Profile user={user} />}
                        {activeTab === "company" && <Company company={company} />}
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
