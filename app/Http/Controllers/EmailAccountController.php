<?php

namespace App\Http\Controllers;

use App\Models\EmailAccount;
use App\Models\Hosting;
use Illuminate\Http\Request;

class EmailAccountController extends Controller
{
    public function store(Request $request, Hosting $hosting)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
            'quota_mb' => ['required', 'integer', 'min:100'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $hosting->emailAccounts()->create($validated);

        return back()->with('success', 'E-mail přidán.');
    }

    public function update(Request $request, EmailAccount $emailAccount)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'password' => ['nullable', 'string', 'max:255'],
            'quota_mb' => ['required', 'integer', 'min:100'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        // Don't overwrite password with null if not provided
        if ($validated['password'] === null || $validated['password'] === '') {
            unset($validated['password']);
        }

        $emailAccount->update($validated);

        return back()->with('success', 'E-mail aktualizován.');
    }

    public function destroy(EmailAccount $emailAccount)
    {
        $emailAccount->delete();

        return back()->with('success', 'E-mail smazán.');
    }
}
