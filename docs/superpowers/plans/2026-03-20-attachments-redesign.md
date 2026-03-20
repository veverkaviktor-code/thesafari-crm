# Attachments Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Vylepšit systém příloh v CRM — drag & drop, multiple upload, PDF/SVG náhledy, přehledná FTP struktura, zákaznický agregátní pohled.

**Architecture:** Rozšíření stávajícího polymorphního `Attachment` modelu. Nové frontend komponenty `FileUploader.tsx` (D&D + multiple) a `AttachmentList.tsx` (grid s náhledy). Backend: rozšíření `store()` o multiple files, nový `preview()` endpoint, nová storage cesta `orders/{id}-{slug}/`. Zákazník agreguje přílohy ze svých zakázek přes eager-loaded relace.

**Tech Stack:** Laravel 12, Inertia.js, React 19, TypeScript, Tailwind 4

**Spec:** `docs/superpowers/specs/2026-03-20-attachments-redesign.md`

---

## Pre-deploy safety checklist

Před JAKÝMKOLIV deployem na VPS:
```bash
# 1. Záloha DB
ssh root@sss06.vas-server.cz "pg_dump -U safari_crm safari_crm > /root/backups/safari_crm_$(date +%Y%m%d_%H%M).sql"

# 2. Záloha storage souborů
ssh root@sss06.vas-server.cz "tar czf /root/backups/attachments_$(date +%Y%m%d_%H%M).tar.gz -C /var/www/hq.thesafari.cz/storage/app attachments"

# 3. Ověření verze
cd "/Users/viktorveverka/CLAUDE PROJECTS/thesafari/crm/" && git log --oneline -1
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && head -1 public/build/manifest.json"
```

---

## Task 1: Extrakce `formatFileSize` do `lib/utils.ts`

**Files:**
- Modify: `resources/js/lib/utils.ts`

- [ ] **Step 1: Přidat `formatFileSize` do utils.ts**

Na konec souboru `resources/js/lib/utils.ts`:
```typescript
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
```

- [ ] **Step 2: Commit**
```bash
git add resources/js/lib/utils.ts
git commit -m "refactor: extract formatFileSize to lib/utils.ts"
```

---

## Task 2: Backend — multiple upload + preview endpoint + nová storage cesta

**Files:**
- Modify: `app/Http/Controllers/AttachmentController.php`
- Modify: `routes/web.php`

- [ ] **Step 1: Přepsat `AttachmentController::store()` pro multiple upload**

Celý nový obsah `store()`:
```php
public function store(Request $request)
{
    $request->validate([
        'files' => 'required|array|min:1|max:5',
        'files.*' => 'file|max:10240|mimes:pdf,jpg,jpeg,png,gif,webp,doc,docx,xls,xlsx,zip,txt,svg',
        'attachable_type' => 'required|string|in:customer,order,ticket',
        'attachable_id' => 'required|integer',
        'description' => 'nullable|string|max:500',
    ]);

    $modelMap = [
        'customer' => \App\Models\Customer::class,
        'order' => \App\Models\Order::class,
        'ticket' => \App\Models\Ticket::class,
    ];

    $type = $modelMap[$request->input('attachable_type')];
    $id = $request->input('attachable_id');
    $model = $type::findOrFail($id);

    // Build storage directory — for orders use readable slug
    $attachableType = $request->input('attachable_type');
    if ($attachableType === 'order' && method_exists($model, 'getAttribute')) {
        $slug = \Illuminate\Support\Str::slug($model->title ?? 'order');
        $directory = "attachments/orders/{$id}-{$slug}";
    } else {
        $directory = "attachments/{$attachableType}/{$id}";
    }

    $count = 0;
    foreach ($request->file('files') as $file) {
        $filename = $file->getClientOriginalName();

        // Deduplicate filename if exists
        $destPath = $directory . '/' . $filename;
        if (Storage::disk('local')->exists($destPath)) {
            $name = pathinfo($filename, PATHINFO_FILENAME);
            $ext = $file->getClientOriginalExtension();
            $filename = $name . '_' . time() . '_' . uniqid() . '.' . $ext;
        }

        $path = $file->storeAs($directory, $filename, 'local');

        try {
            Attachment::create([
                'attachable_type' => $type,
                'attachable_id' => $id,
                'filename' => $file->getClientOriginalName(),
                'description' => $request->input('description'),
                'path' => $path,
                'mime_type' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);
            $count++;
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($path);
            throw $e;
        }
    }

    $msg = $count === 1 ? 'Soubor nahrán.' : "{$count} souborů nahráno.";
    return back()->with('success', $msg);
}
```

- [ ] **Step 2: Přidat `preview()` metodu do AttachmentController**

```php
public function preview(Attachment $attachment)
{
    if (!Storage::disk('local')->exists($attachment->path)) {
        abort(404);
    }

    $previewable = ['application/pdf', 'image/svg+xml', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    if (!in_array($attachment->mime_type, $previewable)) {
        return $this->download($attachment);
    }

    return response()->file(
        Storage::disk('local')->path($attachment->path),
        [
            'Content-Type' => $attachment->mime_type,
            'Content-Disposition' => 'inline; filename="' . $attachment->filename . '"',
        ]
    );
}
```

- [ ] **Step 3: Přidat preview route do `routes/web.php`**

V sekci attachment routes (za existující `attachments.download`):
```php
Route::get('attachments/{attachment}/preview', [AttachmentController::class, 'preview'])->name('attachments.preview');
```

- [ ] **Step 4: Commit**
```bash
git add app/Http/Controllers/AttachmentController.php routes/web.php
git commit -m "feat: multiple file upload, preview endpoint, organized storage"
```

---

## Task 3: Nová komponenta `FileUploader.tsx`

**Files:**
- Create: `resources/js/components/FileUploader.tsx`

- [ ] **Step 1: Vytvořit komponentu**

```tsx
import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import { router } from '@inertiajs/react';
import { Upload, X, FileIcon } from 'lucide-react';
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
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                setFiles([]);
                setDescription('');
                setUploading(false);
            },
            onError: () => setUploading(false),
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
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-white/20 hover:border-white/40'
                }`}
            >
                <Upload className="mb-2 h-6 w-6 text-white/40" />
                <p className="text-sm text-white/60">
                    Přetáhněte soubory sem nebo klikněte
                </p>
                <p className="mt-1 text-xs text-white/30">
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
                        <div key={i} className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-1.5 text-sm">
                            <FileIcon className="h-4 w-4 shrink-0 text-white/40" />
                            <span className="min-w-0 flex-1 truncate text-white/80">{file.name}</span>
                            <span className="shrink-0 text-xs text-white/40">{formatFileSize(file.size)}</span>
                            <button
                                onClick={() => removeFile(i)}
                                className="shrink-0 rounded p-0.5 text-white/40 hover:bg-white/10 hover:text-white"
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
                        className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white placeholder:text-white/30 focus:border-amber-500/50 focus:outline-none"
                    />
                    <button
                        onClick={upload}
                        disabled={uploading}
                        className="shrink-0 rounded-md bg-amber-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-500 disabled:opacity-50"
                    >
                        {uploading ? 'Nahrávám...' : 'Nahrát'}
                    </button>
                </div>
            )}
        </div>
    );
}
```

- [ ] **Step 2: Commit**
```bash
git add resources/js/components/FileUploader.tsx
git commit -m "feat: add FileUploader component with drag & drop + multiple files"
```

---

## Task 4: Nová komponenta `AttachmentList.tsx`

**Files:**
- Create: `resources/js/components/AttachmentList.tsx`

- [ ] **Step 1: Vytvořit komponentu**

```tsx
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

function isPreviewable(mime: string | null): boolean {
    if (!mime) return false;
    return ['application/pdf', 'image/svg+xml', 'image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mime);
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
                                        href={`/attachments/${att.id}/preview`}
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
```

- [ ] **Step 2: Commit**
```bash
git add resources/js/components/AttachmentList.tsx
git commit -m "feat: add AttachmentList component with PDF/SVG/image previews"
```

---

## Task 5: Integrace do Orders/Show.tsx

**Files:**
- Modify: `resources/js/Pages/Admin/Orders/Show.tsx`
- Delete: `resources/js/components/orders/OrderAttachments.tsx`

- [ ] **Step 1: V `Orders/Show.tsx` nahradit `OrderAttachments` za nové komponenty**

Změnit importy — nahradit:
```tsx
import OrderAttachments from '@/components/orders/OrderAttachments';
```
Za:
```tsx
import FileUploader from '@/components/FileUploader';
import AttachmentList, { type AttachmentData } from '@/components/AttachmentList';
```

Nahradit sekci kde se renderuje `<OrderAttachments>`:
```tsx
<OrderAttachments
    orderId={order.id}
    attachments={order.attachments ?? []}
/>
```
Za:
```tsx
{/* Přílohy */}
<div className="rounded-xl border border-white/10 bg-white/5 p-4">
    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white/70">
        <span>📎</span> Přílohy
    </h3>
    <FileUploader attachableType="order" attachableId={order.id} />
    <div className="mt-4">
        <AttachmentList attachments={(order.attachments ?? []) as AttachmentData[]} />
    </div>
</div>
```

- [ ] **Step 2: Smazat starý OrderAttachments soubor**
```bash
rm resources/js/components/orders/OrderAttachments.tsx
```

- [ ] **Step 3: Ověřit že nikde jinde se OrderAttachments neimportuje**
```bash
grep -r "OrderAttachments" resources/js/
```
Očekávaný výstup: žádné výsledky.

- [ ] **Step 4: Commit**
```bash
git add resources/js/Pages/Admin/Orders/Show.tsx resources/js/components/orders/OrderAttachments.tsx
git commit -m "feat: replace OrderAttachments with FileUploader + AttachmentList"
```

---

## Task 6: Zákaznický tab "Soubory"

**Files:**
- Modify: `app/Http/Controllers/CustomerController.php` (show method)
- Modify: `resources/js/Pages/Admin/Customers/Show.tsx` (přidat tab)

- [ ] **Step 1: V `CustomerController::show()` přidat eager load příloh**

Přidat load příloh přes zakázky. Po řádku `$customer->load(['subscriptions']);` přidat:
```php
// Aggregate attachments from all customer's orders
$orderAttachments = $customer->orders()
    ->with('attachments')
    ->get()
    ->flatMap(function ($order) {
        return $order->attachments->map(fn ($att) => array_merge(
            $att->only(['id', 'filename', 'description', 'mime_type', 'size', 'created_at']),
            ['order_id' => $order->id, 'order_title' => $order->title]
        ));
    })
    ->values();
```

V Inertia::render data přidat:
```php
'orderAttachments' => $orderAttachments,
```

- [ ] **Step 2: V `Customers/Show.tsx` přidat tab "Soubory"**

Přidat import:
```tsx
import AttachmentList, { type AttachmentData } from '@/components/AttachmentList';
```

Přidat prop do komponenty:
```tsx
interface Props {
    // ... existující props
    orderAttachments: (AttachmentData & { order_id: number; order_title: string })[];
}
```

V tabech (CustomerTabs nebo přímo v Show) přidat nový tab "Soubory". Obsah tabu:

```tsx
{/* Tab: Soubory */}
<div>
    {orderAttachments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-white/30">
            <FileIcon className="mb-2 h-8 w-8" />
            <p className="text-sm">Žádné soubory</p>
        </div>
    ) : (
        <>
            {Object.entries(
                orderAttachments.reduce((groups, att) => {
                    const key = att.order_id;
                    if (!groups[key]) groups[key] = { title: att.order_title, items: [] };
                    groups[key].items.push(att);
                    return groups;
                }, {} as Record<number, { title: string; items: typeof orderAttachments }>)
            ).map(([orderId, group]) => (
                <div key={orderId} className="mb-6">
                    <a
                        href={`/zakazky/${orderId}`}
                        className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-amber-500 hover:text-amber-400"
                    >
                        {group.title}
                    </a>
                    <AttachmentList attachments={group.items} readOnly />
                </div>
            ))}
        </>
    )}
</div>
```

- [ ] **Step 3: Commit**
```bash
git add app/Http/Controllers/CustomerController.php resources/js/Pages/Admin/Customers/Show.tsx
git commit -m "feat: add Soubory tab to customer detail — aggregates order attachments"
```

---

## Task 7: ForceDelete cleanup — ochrana proti orphan souborům

**Files:**
- Modify: `app/Models/Order.php`

- [ ] **Step 1: Přidat boot cleanup do Order modelu**

V `Order.php` přidat do `boot()` metody (nebo vytvořit pokud neexistuje):
```php
protected static function boot()
{
    parent::boot();

    static::deleting(function (Order $order) {
        if ($order->isForceDeleting()) {
            $order->attachments->each(function ($attachment) {
                \Illuminate\Support\Facades\Storage::disk('local')->delete($attachment->path);
                $attachment->delete();
            });
        }
    });
}
```

- [ ] **Step 2: Commit**
```bash
git add app/Models/Order.php
git commit -m "fix: cleanup attachments on order force delete — prevent orphan files"
```

---

## Task 8: VPS infrastruktura kontrola

**Files:** Žádné lokální změny — jen VPS konfigurace.

- [ ] **Step 1: Ověřit PHP limity na VPS**
```bash
ssh root@sss06.vas-server.cz "php -i | grep -E 'upload_max_filesize|post_max_size'"
```
Pokud `post_max_size` < 60M nebo `upload_max_filesize` < 10M:
```bash
ssh root@sss06.vas-server.cz "sed -i 's/upload_max_filesize = .*/upload_max_filesize = 10M/' /etc/php/8.3/fpm/php.ini && sed -i 's/post_max_size = .*/post_max_size = 60M/' /etc/php/8.3/fpm/php.ini && systemctl restart php8.3-fpm"
```

- [ ] **Step 2: Ověřit nginx client_max_body_size**
```bash
ssh root@sss06.vas-server.cz "grep client_max_body_size /etc/nginx/sites-enabled/hq.thesafari.cz* || echo 'NOT SET'"
```
Pokud není nastaveno, přidat do server bloku:
```
client_max_body_size 60m;
```

- [ ] **Step 3: Ověřit že storage adresář existuje a má správná práva**
```bash
ssh root@sss06.vas-server.cz "mkdir -p /var/www/hq.thesafari.cz/storage/app/attachments/orders && chown -R www-data:www-data /var/www/hq.thesafari.cz/storage/app/attachments"
```

---

## Task 9: Build, deploy, ověření

- [ ] **Step 1: Spustit pre-deploy safety checklist** (viz začátek plánu)

- [ ] **Step 2: Build**
```bash
cd "/Users/viktorveverka/CLAUDE PROJECTS/thesafari/crm/" && npm run build
```

- [ ] **Step 3: Deploy**
```bash
rsync -avz --include='app/***' --include='database/***' --include='resources/***' --include='routes/***' --exclude='*' ./ root@sss06.vas-server.cz:/var/www/hq.thesafari.cz/
rsync -avz --delete public/build/ root@sss06.vas-server.cz:/var/www/hq.thesafari.cz/public/build/
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && php artisan migrate --force && php artisan config:cache && php artisan route:cache && php artisan view:cache"
```

- [ ] **Step 4: Ověřit na produkci**
```bash
curl -s -o /dev/null -w "%{http_code}" https://hq.thesafari.cz/zakazky
```

- [ ] **Step 5: Manuální test**
1. Otevřít zakázku "Bannery" na hq.thesafari.cz
2. Přetáhnout PDF soubor do drop zóny → ověřit upload
3. Ověřit náhled PDF v kartě
4. Ověřit stáhnout + smazat tlačítka
5. Přejít na zákazníka CUBAGARÁŽ → tab Soubory → ověřit že se zobrazuje
6. Na VPS zkontrolovat FTP strukturu: `ls -la /var/www/hq.thesafari.cz/storage/app/attachments/orders/`

- [ ] **Step 6: Push na GitHub**
```bash
git push origin master
```
