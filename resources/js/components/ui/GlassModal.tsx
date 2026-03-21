import { type ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface GlassModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    maxWidth?: string;
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

export default function GlassModal({
    open,
    onClose,
    title,
    children,
    maxWidth = 'max-w-6xl',
}: GlassModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const dialogRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';

        // Auto-focus na první focusable element
        const timer = setTimeout(() => {
            const first = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE)?.[0];
            first?.focus();
        }, 50);

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
            clearTimeout(timer);
        };
    }, [open, onClose]);

    if (!open) return null;

    const handleFocusTrap = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key !== 'Tab') return;
        const focusable = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
            if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
            }
        } else {
            if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }
    };

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
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="glass-modal-title"
                onKeyDown={handleFocusTrap}
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
                        aria-label="Zavřít"
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
