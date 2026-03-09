import { type FormEvent, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Download, Paperclip, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatDate } from '@/lib/utils';

interface Attachment {
    id: number;
    filename: string;
    description: string | null;
    mime_type: string | null;
    size: number;
    created_at: string;
}

interface Props {
    orderId: number;
    attachments: Attachment[];
}

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(0) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
}

export default function OrderAttachments({ orderId, attachments }: Props) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setSelectedFile(file);
    };

    const handleUpload = (e: FormEvent) => {
        e.preventDefault();
        if (!selectedFile) return;

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('description', description);
        formData.append('attachable_type', 'order');
        formData.append('attachable_id', String(orderId));

        setUploading(true);
        router.post('/attachments', formData, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                setSelectedFile(null);
                setDescription('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            },
            onFinish: () => setUploading(false),
        });
    };

    const handleDelete = (attachmentId: number) => {
        router.delete(`/attachments/${attachmentId}`, {
            preserveScroll: true,
        });
    };

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2">
                <Paperclip className="h-4 w-4 text-primary/60" />
                <h3 className="text-sm font-semibold text-foreground/70">Přílohy</h3>
            </div>

            {/* Upload form */}
            <form onSubmit={handleUpload} className="mb-4 space-y-2 rounded-lg border border-border bg-accent p-3">
                <div className="flex items-center gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        id={`attachment-input-${orderId}`}
                    />
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="shrink-0 border border-border text-muted-foreground hover:text-foreground"
                    >
                        <Upload className="h-3.5 w-3.5" />
                        <span className="ml-1.5">Vybrat soubor</span>
                    </Button>
                    <span className="truncate text-sm text-muted-foreground">
                        {selectedFile ? selectedFile.name : 'Žádný soubor nevybrán'}
                    </span>
                </div>
                <div className="flex gap-2">
                    <Input
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Popis přílohy (volitelné)"
                        className="border-border bg-card text-sm"
                    />
                    <Button
                        type="submit"
                        size="sm"
                        disabled={!selectedFile || uploading}
                        className="shrink-0 bg-primary text-white hover:bg-primary/80"
                    >
                        {uploading ? 'Nahrávám...' : 'Nahrát'}
                    </Button>
                </div>
            </form>

            {/* Attachments list */}
            {attachments.length === 0 ? (
                <p className="text-sm text-muted-foreground">Žádné přílohy</p>
            ) : (
                <div className="space-y-2">
                    {attachments.map((attachment) => (
                        <div
                            key={attachment.id}
                            className="flex items-center justify-between rounded-lg border-l-2 border-primary/40 bg-accent py-2.5 pl-3 pr-3"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium text-foreground">
                                        {attachment.filename}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {attachment.description && (
                                            <span>{attachment.description} &middot; </span>
                                        )}
                                        {formatFileSize(attachment.size)} &middot; {formatDate(attachment.created_at)}
                                    </p>
                                </div>
                            </div>
                            <div className="ml-2 flex shrink-0 items-center gap-1">
                                <Button
                                    asChild
                                    variant="ghost"
                                    size="icon-xs"
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    <a
                                        href={`/attachments/${attachment.id}/download`}
                                        download
                                    >
                                        <Download className="h-3.5 w-3.5" />
                                    </a>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon-xs"
                                    className="text-muted-foreground hover:text-red-400"
                                    onClick={() => handleDelete(attachment.id)}
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
