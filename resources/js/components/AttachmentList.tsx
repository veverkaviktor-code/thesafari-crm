import { router } from '@inertiajs/react';
import { Download, Trash2, FileText, FileSpreadsheet, Archive, File as FileIcon, ExternalLink } from 'lucide-react';
import { formatFileSize, formatDate } from '@/lib/utils';

export interface AttachmentData {
    id: number;
    filename: string;
    description: string | null;
    mime_type: string | null;
    size: number;
    created_at: string;
}

interface Props {
    attachments: AttachmentData[];
    readOnly?: boolean;
}

function getFileIcon(mime: string | null) {
    if (!mime) return FileIcon;
    if (mime.includes('pdf')) return FileText;
    if (mime.includes('spreadsheet') || mime.includes('excel')) return FileSpreadsheet;
    if (mime.includes('zip')) return Archive;
    return FileIcon;
}

function isImage(mime: string | null): boolean {
    if (!mime) return false;
    return mime.startsWith('image/');
}

function isPdf(mime: string | null): boolean {
    return mime === 'application/pdf';
}

function handleDelete(id: number) {
    if (!confirm('Opravdu smazat tento soubor?')) return;
    router.delete(`/attachments/${id}`, { preserveScroll: true });
}

export default function AttachmentList({ attachments, readOnly = false }: Props) {
    if (attachments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-white/30">
                <FileIcon className="mb-2 h-8 w-8" />
                <p className="text-sm">Žádné soubory</p>
            </div>
        );
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {attachments.map(att => {
                const Icon = getFileIcon(att.mime_type);
                const previewUrl = `/attachments/${att.id}/preview`;

                return (
                    <div key={att.id} className="overflow-hidden rounded-lg border border-white/10 bg-white/5">
                        {/* Preview area */}
                        <a
                            href={previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block"
                        >
                            {isPdf(att.mime_type) ? (
                                <div className="relative h-48 w-full bg-white">
                                    <iframe
                                        src={previewUrl + '#toolbar=0&navpanes=0'}
                                        className="h-full w-full pointer-events-none"
                                        title={att.filename}
                                    />
                                    <div className="absolute inset-0" />
                                </div>
                            ) : isImage(att.mime_type) ? (
                                <div className="flex h-48 items-center justify-center bg-white/5 p-2">
                                    <img
                                        src={previewUrl}
                                        alt={att.filename}
                                        className="max-h-full max-w-full object-contain"
                                    />
                                </div>
                            ) : (
                                <div className="flex h-24 items-center justify-center bg-white/5">
                                    <Icon className="h-10 w-10 text-white/20" />
                                </div>
                            )}
                        </a>

                        {/* Info + actions */}
                        <div className="px-3 py-2">
                            <p className="truncate text-sm font-medium text-white/80" title={att.filename}>
                                {att.filename}
                            </p>
                            {att.description && (
                                <p className="mt-0.5 truncate text-xs text-white/40">{att.description}</p>
                            )}
                            <div className="mt-1 flex items-center justify-between">
                                <span className="text-xs text-white/30">
                                    {formatFileSize(att.size)} · {formatDate(att.created_at)}
                                </span>
                                <div className="flex gap-1">
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
                                        title="Otevřít"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </a>
                                    <a
                                        href={`/attachments/${att.id}/download`}
                                        className="rounded p-1 text-white/40 hover:bg-white/10 hover:text-white"
                                        title="Stáhnout"
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                    </a>
                                    {!readOnly && (
                                        <button
                                            onClick={() => handleDelete(att.id)}
                                            className="rounded p-1 text-white/40 hover:bg-red-500/20 hover:text-red-400"
                                            title="Smazat"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
