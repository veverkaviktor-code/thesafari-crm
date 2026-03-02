import { type ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface GlassModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    maxWidth?: string;
}

export default function GlassModal({
    open,
    onClose,
    title,
    children,
    maxWidth = 'max-w-6xl',
}: GlassModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-6"
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
            }}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-md" />

            {/* Modal — Liquid Glass */}
            <div
                className={`relative w-full ${maxWidth} max-h-[90vh] flex flex-col rounded-3xl overflow-hidden
                    border border-white/[0.08]
                    bg-gradient-to-b from-white/[0.07] to-white/[0.03]
                    backdrop-blur-3xl
                    shadow-[0_8px_64px_-16px_rgba(0,0,0,0.6),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_0_rgba(255,255,255,0.1)]
                `}
            >
                {/* Top highlight line — liquid glass shine */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />

                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/[0.06] px-8 py-5">
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-gray-400 transition-all hover:bg-white/[0.06] hover:text-white"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body (scrollable) */}
                <div className="overflow-y-auto px-8 py-6">{children}</div>
            </div>
        </div>
    );
}
