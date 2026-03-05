import { type ReactNode, useState } from 'react';
import { usePage } from '@inertiajs/react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import RunningTimerBar, { type RunningTimer } from '@/components/layout/RunningTimerBar';

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
    const { props } = usePage<{ runningTimer?: RunningTimer | null }>();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    return (
        <div className="flex h-screen bg-background">
            {/* Desktop sidebar */}
            <div className="hidden md:block dark">
                <Sidebar />
            </div>

            {/* Mobile overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}

            {/* Mobile sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 md:hidden dark ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Sidebar />
            </div>

            <div className="flex flex-1 flex-col overflow-hidden">
                <TopBar
                    breadcrumbs={breadcrumbs}
                    onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                />
                <RunningTimerBar timer={props.runningTimer ?? null} />
                <main className="flex-1 overflow-y-auto p-4 md:p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
