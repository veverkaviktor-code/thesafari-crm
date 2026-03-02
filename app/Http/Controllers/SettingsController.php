<?php

namespace App\Http\Controllers;

use App\Models\CompanySetting;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SettingsController extends Controller
{
    public function index(Request )
    {
        return Inertia::render('Settings/Index', [
            'user' => ->user()->only('id', 'name', 'email', 'avatar_path'),
            'company' => CompanySetting::get(),
            'tab' => ->query('tab', 'profile'),
        ]);
    }
}
