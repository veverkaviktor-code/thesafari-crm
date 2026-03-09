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
            className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center sm:p-6"
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
            }}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60" />

            {/* Modal — full screen on mobile, centered card on desktop */}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="glass-modal-title"
                className={`relative w-full ${maxWidth} flex flex-col overflow-hidden
                    h-[100dvh] sm:h-auto sm:max-h-[90vh]
                    sm:rounded-2xl
                    border-t border-border sm:border
                    bg-card
                    shadow-2xl shadow-black/50
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-8 sm:py-5">
                    <h2 id="glass-modal-title" className="text-lg font-semibold text-foreground">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-muted-foreground transition-all hover:bg-accent hover:text-foreground"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body — scrollable */}
                <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-8 sm:py-6">{children}</div>
            </div>
        </div>
    );
}
