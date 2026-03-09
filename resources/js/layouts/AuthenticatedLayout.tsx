import { type ReactNode, useEffect, useState } from 'react';
import { Head, usePage } from '@inertiajs/react';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import RunningTimerBar, { type RunningTimer } from '@/components/layout/RunningTimerBar';
import { CheckCircle2, XCircle, X } from 'lucide-react';

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
    title,
    breadcrumbs = [],
}: AuthenticatedLayoutProps) {
    const { props } = usePage<{
        runningTimer?: RunningTimer | null;
        flash?: { success?: string; error?: string };
    }>();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [flashMsg, setFlashMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (props.flash?.success) {
            setFlashMsg({ type: 'success', text: props.flash.success });
        } else if (props.flash?.error) {
            setFlashMsg({ type: 'error', text: props.flash.error });
        } else {
            setFlashMsg(null);
            return;
        }
        const timer = setTimeout(() => setFlashMsg(null), 5000);
        return () => clearTimeout(timer);
    }, [props.flash?.success, props.flash?.error]);

    return (
        <>
        {title && <Head title={title} />}
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
                {flashMsg && (
                    <div className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium ${
                        flashMsg.type === 'success'
                            ? 'bg-emerald-500/15 text-emerald-400 border-b border-emerald-500/20'
                            : 'bg-red-500/15 text-red-400 border-b border-red-500/20'
                    }`}>
                        {flashMsg.type === 'success'
                            ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                            : <XCircle className="h-4 w-4 shrink-0" />
                        }
                        <span className="flex-1">{flashMsg.text}</span>
                        <button onClick={() => setFlashMsg(null)} className="shrink-0 opacity-60 hover:opacity-100 transition-opacity">
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
                <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6">
                    {children}
                    <footer className="mt-12 border-t border-border pt-4 pb-2 text-center text-xs text-muted-foreground/50">
                        The Safari HQ &middot; v1.0.1
                    </footer>
                </main>
            </div>
        </div>
        </>
    );
}
