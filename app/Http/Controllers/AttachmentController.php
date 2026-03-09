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
            'file' => 'required|file|max:10240|mimes:pdf,jpg,jpeg,png,gif,webp,doc,docx,xls,xlsx,zip,txt,svg',
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

        // Verify the parent exists
        $type::findOrFail($id);

        $file = $request->file('file');
        $path = $file->store('attachments/' . $request->input('attachable_type') . '/' . $id, 'local');

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
        } catch (\Throwable $e) {
            Storage::disk('local')->delete($path);
            throw $e;
        }

        return back()->with('success', 'Soubor nahrán.');
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

    public function destroy(Attachment $attachment)
    {
        Storage::disk('local')->delete($attachment->path);
        $attachment->delete();

        return back()->with('success', 'Soubor smazán.');
    }
}
