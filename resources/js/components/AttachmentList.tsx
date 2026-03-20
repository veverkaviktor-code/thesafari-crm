import { router } from '@inertiajs/react';
import { Download, Trash2, FileText, FileSpreadsheet, Archive, File as FileIcon, ExternalLink, Image as ImageIcon } from 'lucide-react';
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
    if (mime.startsWith('image/')) return ImageIcon;
    if (mime.includes('spreadsheet') || mime.includes('excel')) return FileSpreadsheet;
    if (mime.includes('zip')) return Archive;
    return FileIcon;
}

function handleDelete(id: number) {
    if (!confirm('Opravdu smazat tento soubor?')) return;
    router.delete(`/attachments/${id}`, { preserveScroll: true });
}

export default function AttachmentList({ attachments, readOnly = false }: Props) {
    if (attachments.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
                <FileIcon className="mb-2 h-8 w-8" />
                <p className="text-sm">Žádné soubory</p>
            </div>
        );
    }

    return (
        <div className="space-y-1.5">
            {attachments.map(att => {
                const Icon = getFileIcon(att.mime_type);
                const previewUrl = `/attachments/${att.id}/preview`;

                return (
                    <div key={att.id} className="flex items-center gap-3 rounded-lg bg-accent px-3 py-2">
                        {/* Icon */}
                        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />

                        {/* Name + meta */}
                        <div className="min-w-0 flex-1">
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block truncate text-sm font-medium text-foreground hover:text-primary"
                                title={att.filename}
                            >
                                {att.filename}
                            </a>
                            <p className="text-xs text-muted-foreground">
                                {formatFileSize(att.size)} · {formatDate(att.created_at)}
                                {att.description && ` · ${att.description}`}
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex shrink-0 gap-0.5">
                            <a
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="rounded p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                                title="Otevřít"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                            <a
                                href={`/attachments/${att.id}/download`}
                                className="rounded p-1.5 text-muted-foreground hover:bg-background hover:text-foreground"
                                title="Stáhnout"
                            >
                                <Download className="h-3.5 w-3.5" />
                            </a>
                            {!readOnly && (
                                <button
                                    onClick={() => handleDelete(att.id)}
                                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                    title="Smazat"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
