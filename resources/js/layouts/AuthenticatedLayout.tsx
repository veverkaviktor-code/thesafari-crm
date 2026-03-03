import { type ReactNode } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

interface Breadcrumb {
    label: string;
    href?: string;
}

interface AuthenticatedLayoutProps {
    children: ReactNode;
    title?: string;
    breadcrumbs?: Breadcrumb[];
}

export default function AuthenticatedLayout({
    children,
    breadcrumbs = [],
}: AuthenticatedLayoutProps) {
    return (
        <div className="flex h-screen bg-background">
            <div className="dark">
                <Sidebar />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
                <TopBar breadcrumbs={breadcrumbs} />
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
        </div>
    );
}
