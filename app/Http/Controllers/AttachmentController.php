<?php

namespace App\Http\Controllers;

use App\Models\Attachment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class AttachmentController extends Controller
{
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
        if ($attachableType === 'order') {
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

    public function download(Attachment $attachment)
    {
        // NOTE: No ownership check here — single-admin CRM, all routes protected by auth middleware.
        // If multi-user support is added in the future, implement AttachmentPolicy with owner check.
        if (!Storage::disk('local')->exists($attachment->path)) {
            abort(404, 'Soubor nenalezen.');
        }

        return Storage::disk('local')->download($attachment->path, basename($attachment->filename));
    }

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

    public function destroy(Attachment $attachment)
    {
        Storage::disk('local')->delete($attachment->path);
        $attachment->delete();

        return back()->with('success', 'Soubor smazán.');
    }
}
