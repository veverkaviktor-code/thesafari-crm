<?php

namespace App\Http\Controllers;

use App\Models\SubscriptionFolder;
use Illuminate\Http\Request;

class SubscriptionFolderController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'color' => ['nullable', 'string', 'max:7'],
        ]);

        $maxOrder = SubscriptionFolder::max('sort_order') ?? 0;

        SubscriptionFolder::create([
            ...$validated,
            'sort_order' => $maxOrder + 1,
        ]);

        return back()->with('success', 'Složka vytvořena.');
    }

    public function update(Request $request, SubscriptionFolder $folder)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'color' => ['nullable', 'string', 'max:7'],
        ]);

        $folder->update($validated);

        return back()->with('success', 'Složka aktualizována.');
    }

    public function toggleCollapse(SubscriptionFolder $folder)
    {
        $folder->update(['is_collapsed' => !$folder->is_collapsed]);

        return back();
    }

    public function destroy(SubscriptionFolder $folder)
    {
        // Unlink subscriptions before deleting
        $folder->subscriptions()->update(['folder_id' => null]);
        $folder->delete();

        return back()->with('success', 'Složka smazána.');
    }
}
