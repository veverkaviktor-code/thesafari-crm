import { useEffect, useRef } from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning';
    processing?: boolean;
    children?: React.ReactNode;
}

export default function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title = 'Potvrzení',
    message,
    confirmLabel = 'Smazat',
    cancelLabel = 'Zrušit',
    variant = 'danger',
    processing = false,
    children,
}: ConfirmDialogProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };

        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';

        // Focus confirm button
        setTimeout(() => confirmRef.current?.focus(), 100);

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [open, onClose]);

    if (!open) return null;

    const isDanger = variant === 'danger';

    return (
        <div
            ref={overlayRef}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={(e) => {
                if (e.target === overlayRef.current) onClose();
            }}
        >
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60" />

            {/* Dialog */}
            <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                aria-describedby="confirm-dialog-message"
                className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/50"
            >
                <div className="flex items-start gap-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                        isDanger ? 'bg-red-500/15' : 'bg-amber-500/15'
                    }`}>
                        <AlertTriangle className={`h-5 w-5 ${isDanger ? 'text-red-400' : 'text-amber-400'}`} />
                    </div>
                    <div className="flex-1">
                        <h3 id="confirm-dialog-title" className="text-base font-semibold text-foreground">
                            {title}
                        </h3>
                        <p id="confirm-dialog-message" className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                            {message}
                        </p>
                        {children && <div className="mt-3">{children}</div>}
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={processing}
                        className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        ref={confirmRef}
                        onClick={onConfirm}
                        disabled={processing}
                        className={`rounded-xl px-4 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50 ${
                            isDanger
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-amber-600 hover:bg-amber-700'
                        }`}
                    >
                        {processing ? 'Zpracovávám...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}
