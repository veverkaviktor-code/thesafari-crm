import { type ReactNode } from 'react';
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

    return (
        <div className="flex h-screen bg-background">
            <div className="dark">
                <Sidebar />
            </div>
            <div className="flex flex-1 flex-col overflow-hidden">
                <TopBar breadcrumbs={breadcrumbs} />
                <RunningTimerBar timer={props.runningTimer ?? null} />
                <main className="flex-1 overflow-y-auto p-6">{children}</main>
            </div>
        </div>
    );
}
