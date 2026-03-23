<?php

namespace App\Http\Controllers;

use App\Models\Website;
use App\Models\WebsiteCredential;
use Illuminate\Http\Request;

class WebsiteCredentialController extends Controller
{
    public function store(Request $request, Website $website)
    {
        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'login' => 'nullable|string|max:255',
            'password' => 'nullable|string',
            'email' => 'nullable|email|max:255',
            'notes' => 'nullable|string',
        ]);

        $maxSort = $website->credentials()->max('sort_order') ?? 0;
        $validated['sort_order'] = $maxSort + 1;

        $website->credentials()->create($validated);

        return back()->with('success', 'Přístup přidán.');
    }

    public function update(Request $request, WebsiteCredential $credential)
    {
        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'login' => 'nullable|string|max:255',
            'password' => 'nullable|string',
            'email' => 'nullable|email|max:255',
            'notes' => 'nullable|string',
        ]);

        // Don't overwrite password if not provided
        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $credential->update($validated);

        return back()->with('success', 'Přístup upraven.');
    }

    public function destroy(WebsiteCredential $credential)
    {
        $credential->delete();

        return back()->with('success', 'Přístup smazán.');
    }
}
