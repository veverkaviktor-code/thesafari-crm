<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Inertia\Inertia;

class ForgotPasswordController extends Controller
{
    public function show()
    {
        return Inertia::render('Auth/ForgotPassword');
    }

    public function store(Request $request)
    {
        $request->validate([
            'email' => ['required', 'email'],
        ], [
            'email.required' => 'E-mail je povinný.',
            'email.email'    => 'Zadejte platnou e-mailovou adresu.',
        ]);

        $status = Password::sendResetLink($request->only('email'));

        if ($status === Password::RESET_LINK_SENT) {
            return back()->with('status', 'Odkaz pro obnovení hesla byl odeslán na váš e-mail.');
        }

        return back()->withErrors([
            'email' => __($status) === Password::INVALID_USER
                ? 'Uživatel s tímto e-mailem nebyl nalezen.'
                : 'Odkaz pro obnovení hesla se nepodařilo odeslat. Zkuste to prosím znovu.',
        ])->onlyInput('email');
    }
}
