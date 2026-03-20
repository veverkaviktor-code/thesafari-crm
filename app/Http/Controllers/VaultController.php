<?php

namespace App\Http\Controllers;

use App\Models\VaultEntry;
use Illuminate\Http\Request;

class VaultController extends Controller
{
    public function index()
    {
        return VaultEntry::orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->map(function ($entry) {
                $entry->makeVisible('password');
                return $entry;
            });
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'nullable|string|max:255',
            'password' => 'nullable|string|max:500',
            'url' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
        ]);

        $validated['sort_order'] = VaultEntry::max('sort_order') + 1;

        VaultEntry::create($validated);

        return back()->with('success', 'Záznam přidán.');
    }

    public function update(Request $request, VaultEntry $vault)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'username' => 'nullable|string|max:255',
            'password' => 'nullable|string|max:500',
            'url' => 'nullable|string|max:500',
            'notes' => 'nullable|string|max:1000',
        ]);

        $vault->update($validated);

        return back()->with('success', 'Záznam upraven.');
    }

    public function destroy(VaultEntry $vault)
    {
        $vault->delete();

        return back()->with('success', 'Záznam smazán.');
    }
}
