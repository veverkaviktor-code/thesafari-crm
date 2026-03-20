<?php

namespace App\Http\Controllers;

use App\Models\ManagementPlan;
use App\Models\Website;
use Illuminate\Http\Request;

class ManagementPlanController extends Controller
{
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price_monthly' => 'required|integer|min:0',
            'is_active' => 'boolean',
        ]);

        ManagementPlan::create([
            'name' => $validated['name'],
            'price_monthly' => $validated['price_monthly'],
            'is_active' => $validated['is_active'] ?? true,
            'sort_order' => ManagementPlan::max('sort_order') + 1,
        ]);

        return back()->with('success', 'Balicek vytvoren.');
    }

    public function update(Request $request, ManagementPlan $plan)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'price_monthly' => 'required|integer|min:0',
            'is_active' => 'boolean',
        ]);

        $plan->update($validated);

        return back()->with('success', 'Balicek aktualizovan.');
    }

    public function destroy(ManagementPlan $plan)
    {
        // Nullify references on websites
        Website::where('management_plan_id', $plan->id)->update(['management_plan_id' => null]);

        $plan->delete();

        return back()->with('success', 'Balicek smazan.');
    }
}
