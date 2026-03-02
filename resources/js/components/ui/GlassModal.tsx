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
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/60" />

            {/* Modal */}
            <div
                className={`relative w-full ${maxWidth} max-h-[90vh] flex flex-col rounded-2xl overflow-hidden
                    border border-[#F5F0E8]/[0.06]
                    bg-[#16140f]
                    shadow-2xl shadow-black/50
                `}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b border-[#F5F0E8]/[0.06] px-8 py-5">
                    <h2 className="text-lg font-semibold text-[#F5F0E8]">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-[#9C9585] transition-all hover:bg-[#F5F0E8]/[0.05] hover:text-[#F5F0E8]"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="overflow-y-auto px-8 py-6">{children}</div>
            </div>
        </div>
    );
}
