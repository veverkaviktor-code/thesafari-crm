import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { router } from '@inertiajs/react';
import { Upload, X, File as FileIcon } from 'lucide-react';
import { formatFileSize } from '@/lib/utils';

interface Props {
    attachableType: string;
    attachableId: number;
}

export default function FileUploader({ attachableType, attachableId }: Props) {
    const [files, setFiles] = useState<File[]>([]);
    const [description, setDescription] = useState('');
    const [uploading, setUploading] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    function handleDragOver(e: DragEvent) {
        e.preventDefault();
        setDragOver(true);
    }

    function handleDragLeave(e: DragEvent) {
        e.preventDefault();
        setDragOver(false);
    }

    function handleDrop(e: DragEvent) {
        e.preventDefault();
        setDragOver(false);
        const dropped = Array.from(e.dataTransfer.files);
        setFiles(prev => [...prev, ...dropped].slice(0, 5));
    }

    function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
        if (e.target.files) {
            const selected = Array.from(e.target.files);
            setFiles(prev => [...prev, ...selected].slice(0, 5));
        }
        if (inputRef.current) inputRef.current.value = '';
    }

    function removeFile(index: number) {
        setFiles(prev => prev.filter((_, i) => i !== index));
    }

    function upload() {
        if (files.length === 0) return;

        const formData = new FormData();
        files.forEach(f => formData.append('files[]', f));
        formData.append('attachable_type', attachableType);
        formData.append('attachable_id', String(attachableId));
        if (description) formData.append('description', description);

        setUploading(true);
        router.post('/attachments', formData, {
            preserveScroll: true,
            onSuccess: () => {
                setFiles([]);
                setDescription('');
            },
            onFinish: () => setUploading(false),
        });
    }

    return (
        <div className="space-y-3">
            {/* Drop zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors ${
                    dragOver
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                }`}
            >
                <Upload className="mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-foreground/70">
                    Přetáhněte soubory sem nebo klikněte
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                    Max 5 souborů, 10 MB každý
                </p>
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.svg,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.zip,.txt"
                />
            </div>

            {/* Selected files list */}
            {files.length > 0 && (
                <div className="space-y-1.5">
                    {files.map((file, i) => (
                        <div key={i} className="flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm">
                            <FileIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1 truncate text-foreground">{file.name}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                                className="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Description + Upload button */}
            {files.length > 0 && (
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Popis příloh (volitelné)"
                        className="flex-1 rounded-md border border-border bg-accent px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:outline-none"
                    />
                    <button
                        onClick={upload}
                        disabled={uploading}
                        className="shrink-0 rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
                    >
                        {uploading ? 'Nahrávám...' : 'Nahrát'}
                    </button>
                </div>
            )}
        </div>
    );
}
