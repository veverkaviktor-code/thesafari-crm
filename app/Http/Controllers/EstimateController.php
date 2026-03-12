<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Estimate;
use App\Models\EstimateItem;
use App\Models\EstimatePhoto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Inertia\Inertia;

class EstimateController extends Controller
{
    public function index(Request $request)
    {
        $query = Estimate::query()
            ->withCount('items')
            ->with('customer:id,name,company')
            ->latest();

        if ($request->boolean('trash')) {
            $query->onlyTrashed();
        }

        $estimates = $query->paginate(20)->withQueryString();
        $trashedCount = Estimate::onlyTrashed()->count();

        return Inertia::render('Estimates/Index', [
            'estimates'   => $estimates,
            'filters'     => $request->only(['search', 'status', 'trash']),
            'trashedCount' => $trashedCount,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $estimate = Estimate::create($validated);

        return redirect()->route('kalkulator.show', $estimate)
            ->with('success', 'Kalkulace vytvořena.');
    }

    public function show(Estimate $kalkulator)
    {
        $kalkulator->load([
            'items',
            'photos',
            'customer:id,name,company,email,phone',
        ]);

        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();

        return Inertia::render('Estimates/Show', [
            'estimate'  => $kalkulator,
            'customers' => $customers,
        ]);
    }

    public function update(Request $request, Estimate $kalkulator)
    {
        $validated = $request->validate([
            'name'        => 'sometimes|required|string|max:255',
            'customer_id' => 'sometimes|nullable|exists:customers,id',
            'deadline'    => 'sometimes|nullable|date',
            'notes'       => 'sometimes|nullable|string',
            'status'      => 'sometimes|nullable|in:draft,sent,accepted,rejected',
            'total_price' => 'sometimes|nullable|numeric|min:0',
        ]);

        $kalkulator->update($validated);

        return back()->with('success', 'Kalkulace aktualizována.');
    }

    public function destroy(Estimate $kalkulator)
    {
        $kalkulator->delete(); // soft delete

        return redirect()->route('kalkulator.index')
            ->with('success', 'Kalkulace přesunuta do koše.');
    }

    public function restore(int $id)
    {
        $estimate = Estimate::onlyTrashed()->findOrFail($id);
        $estimate->restore();

        return back()->with('success', 'Kalkulace obnovena.');
    }

    public function forceDelete(int $id)
    {
        $estimate = Estimate::onlyTrashed()->findOrFail($id);

        // Delete photo files from disk
        foreach ($estimate->photos as $photo) {
            Storage::disk('public')->delete($photo->path);
        }

        $estimate->forceDelete();

        return back()->with('success', 'Kalkulace trvale smazána.');
    }

    public function bulkDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        Estimate::whereIn('id', $request->ids)->each(fn ($e) => $e->delete());
        return back()->with('success', count($request->ids) . ' kalkulací přesunuto do koše.');
    }

    public function bulkRestore(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        Estimate::onlyTrashed()->whereIn('id', $request->ids)->each(fn ($e) => $e->restore());
        return back()->with('success', count($request->ids) . ' kalkulací obnoveno.');
    }

    public function bulkForceDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        $estimates = Estimate::onlyTrashed()->whereIn('id', $request->ids)->get();
        foreach ($estimates as $estimate) {
            foreach ($estimate->photos as $photo) {
                Storage::disk('public')->delete($photo->path);
            }
            $estimate->forceDelete();
        }
        return back()->with('success', $estimates->count() . ' kalkulací trvale smazáno.');
    }

    public function emptyTrash()
    {
        $estimates = Estimate::onlyTrashed()->get();
        foreach ($estimates as $estimate) {
            foreach ($estimate->photos as $photo) {
                Storage::disk('public')->delete($photo->path);
            }
            $estimate->forceDelete();
        }
        return back()->with('success', "Koš vysypán ({$estimates->count()} kalkulací trvale smazáno).");
    }

    // --- Items ---

    public function storeItem(Request $request, Estimate $kalkulator)
    {
        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'width'            => 'required|numeric|min:0.01',
            'height'           => 'required|numeric|min:0.01',
            'quantity'         => 'integer|min:1',
            'material'         => 'nullable|in:folie_polymericka,folie_lita,owv,banner,rezana',
            'lamination'       => 'nullable|in:matna,leskla',
            'is_external'      => 'boolean',
            'calculated_price' => 'nullable|numeric|min:0',
            'sort_order'       => 'integer|min:0',
        ]);

        $kalkulator->items()->create($validated);

        return back()->with('success', 'Položka přidána.');
    }

    public function updateItem(Request $request, Estimate $kalkulator, EstimateItem $item)
    {
        abort_if($item->estimate_id !== $kalkulator->id, 403);

        $validated = $request->validate([
            'name'             => 'required|string|max:255',
            'width'            => 'required|numeric|min:0.01',
            'height'           => 'required|numeric|min:0.01',
            'quantity'         => 'integer|min:1',
            'material'         => 'nullable|in:folie_polymericka,folie_lita,owv,banner,rezana',
            'lamination'       => 'nullable|in:matna,leskla',
            'is_external'      => 'boolean',
            'calculated_price' => 'nullable|numeric|min:0',
            'sort_order'       => 'integer|min:0',
        ]);

        $item->update($validated);

        return back()->with('success', 'Položka upravena.');
    }

    public function destroyItem(Estimate $kalkulator, EstimateItem $item)
    {
        abort_if($item->estimate_id !== $kalkulator->id, 403);

        $item->delete();

        return back()->with('success', 'Položka smazána.');
    }

    // --- Photos ---

    public function storePhoto(Request $request, Estimate $kalkulator)
    {
        $request->validate([
            'photo'             => 'required|image|max:10240',
            'estimate_item_id'  => 'nullable|integer',
        ]);

        // Validate item belongs to this estimate
        if ($request->estimate_item_id) {
            abort_if(
                !$kalkulator->items()->where('id', $request->estimate_item_id)->exists(),
                403,
                'Položka nepatří k této kalkulaci.'
            );
        }

        $file = $request->file('photo');
        $dir = "estimates/{$kalkulator->id}";

        // Convert to WebP if GD is available and file is an image
        $path = $this->convertAndStore($file, $dir);

        $kalkulator->photos()->create([
            'path'              => $path,
            'estimate_item_id'  => $request->estimate_item_id,
        ]);

        return back()->with('success', 'Fotka nahrána.');
    }

    public function destroyPhoto(Estimate $kalkulator, EstimatePhoto $photo)
    {
        abort_if($photo->estimate_id !== $kalkulator->id, 403);

        Storage::disk('public')->delete($photo->path);
        $photo->delete();

        return back()->with('success', 'Fotka smazána.');
    }

    // --- Private helpers ---

    /**
     * Convert uploaded image to WebP and store it.
     * Falls back to raw storage if GD/WebP not available.
     */
    private function convertAndStore($file, string $dir): string
    {
        if (!function_exists('imagecreatefromstring') || !function_exists('imagewebp')) {
            return $file->store($dir, 'public');
        }

        try {
            $imageData = file_get_contents($file->path());
            $image = @imagecreatefromstring($imageData);

            if (!$image) {
                return $file->store($dir, 'public');
            }

            // Preserve transparency for PNG
            imagepalettetotruecolor($image);
            imagealphablending($image, true);
            imagesavealpha($image, true);

            $filename = Str::uuid() . '.webp';
            $relativePath = "{$dir}/{$filename}";
            $tempPath = tempnam(sys_get_temp_dir(), 'webp');

            imagewebp($image, $tempPath, 80);
            imagedestroy($image);

            Storage::disk('public')->put($relativePath, file_get_contents($tempPath));
            @unlink($tempPath);

            return $relativePath;
        } catch (\Throwable) {
            return $file->store($dir, 'public');
        }
    }
}
