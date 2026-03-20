<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use App\Models\ManagementPlan;
use App\Models\SyncBlacklist;
use App\Models\VaultEntry;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function index(Request $request)
    {
        $vault = VaultEntry::orderBy('sort_order')->orderBy('name')->get()
            ->map(fn ($e) => $e->makeVisible('password'));

        $managementPlans = ManagementPlan::orderBy('sort_order')->get();

        $syncBlacklist = SyncBlacklist::orderBy('domain_name')->get();

        return Inertia::render("Settings/Index", [
            "user" => $request->user()->only("id", "name", "email", "avatar_path"),
            "company" => CompanySetting::get(),
            "vault" => $vault,
            "managementPlans" => $managementPlans,
            "syncBlacklist" => $syncBlacklist,
            "tab" => $request->query("tab", "profile"),
        ]);
    }
}
