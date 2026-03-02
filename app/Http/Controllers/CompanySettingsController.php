<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CompanySettingsController extends Controller
{
    public function edit()
    {
        return Inertia::render('Settings/Company', [
            'company' => CompanySetting::get(),
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'company_name' => 'required|string|max:255',
            'ico' => 'nullable|string|max:20',
            'dic' => 'nullable|string|max:20',
            'address' => 'required|array',
            'address.street' => 'nullable|string|max:255',
            'address.city' => 'nullable|string|max:255',
            'address.zip' => 'nullable|string|max:20',
            'address.country' => 'nullable|string|max:2',
            'bank_account' => 'nullable|string|max:50',
            'bank_iban' => 'nullable|string|max:50',
            'email_from' => 'nullable|email',
            'logo' => 'nullable|image|max:2048',
        ]);

        $company = CompanySetting::first() ?? new CompanySetting();
        $company->fill($validated);

        if ($request->hasFile('logo')) {
            if ($company->logo_path) {
                Storage::disk('public')->delete($company->logo_path);
            }
            $company->logo_path = $request->file('logo')->store('company', 'public');
        }

        $company->save();

        return back()->with('success', 'Firemní údaje aktualizovány.');
    }
}
