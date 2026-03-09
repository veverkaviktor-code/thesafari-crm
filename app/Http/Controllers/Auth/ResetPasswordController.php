<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Inertia\Inertia;

class ResetPasswordController extends Controller
{
    public function show(Request $request, string $token)
    {
        return Inertia::render('Auth/ResetPassword', [
            'token' => $token,
            'email' => $request->query('email', ''),
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'token'    => ['required'],
            'email'    => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ], [
            'token.required'             => 'Token pro obnovení hesla chybí.',
            'email.required'             => 'E-mail je povinný.',
            'email.email'                => 'Zadejte platnou e-mailovou adresu.',
            'password.required'          => 'Heslo je povinné.',
            'password.confirmed'         => 'Hesla se neshodují.',
            'password.min'               => 'Heslo musí mít alespoň 8 znaků.',
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, string $password) {
                // Ruční update zabraňuje dvojitému hashování přes Eloquent cast 'hashed'
                $user->forceFill([
                    'password' => Hash::make($password),
                ])->setRememberToken(Str::random(60))->save();
            }
        );

        if ($status === Password::PASSWORD_RESET) {
            $user = \App\Models\User::where('email', $request->email)->first();

            if ($user) {
                Auth::login($user);
                $request->session()->regenerate();
            }

            return redirect('/')->with('flash', [
                'type'    => 'success',
                'message' => 'Heslo bylo úspěšně obnoveno.',
            ]);
        }

        $errorMessage = match ($status) {
            Password::INVALID_TOKEN => 'Token pro obnovení hesla je neplatný nebo vypršel.',
            Password::INVALID_USER  => 'Uživatel s tímto e-mailem nebyl nalezen.',
            default                 => 'Heslo se nepodařilo obnovit. Zkuste to prosím znovu.',
        };

        return back()->withErrors(['email' => $errorMessage])->onlyInput('email');
    }
}
