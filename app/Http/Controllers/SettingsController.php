<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render("Settings/Index", [
            "user" => $request->user()->only("id", "name", "email", "avatar_path"),
            "company" => CompanySetting::get(),
            "tab" => $request->query("tab", "profile"),
        ]);
    }
}
