<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function edit(Request $request)
    {
        return redirect()->route('settings.index', ['tab' => 'profile']);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email,' . $request->user()->id,
            'avatar' => 'nullable|image|max:2048',
        ]);

        $user = $request->user();
        $user->name = $validated['name'];
        $user->email = $validated['email'];

        if ($request->hasFile('avatar')) {
            if ($user->avatar_path) {
                Storage::disk('public')->delete($user->avatar_path);
            }

            $file = $request->file('avatar');
            $filename = pathinfo($file->hashName(), PATHINFO_FILENAME) . '.webp';
            $image = imagecreatefromstring(file_get_contents($file->path()));
            $tmpPath = sys_get_temp_dir() . '/' . $filename;
            imagewebp($image, $tmpPath, 85);
            imagedestroy($image);

            Storage::disk('public')->putFileAs('avatars', new \Illuminate\Http\File($tmpPath), $filename);
            unlink($tmpPath);
            $user->avatar_path = 'avatars/' . $filename;
        }

        $user->save();

        return back()->with('success', 'Profil aktualizován.');
    }

    public function updatePassword(Request $request)
    {
        $validated = $request->validate([
            'current_password' => 'required|current_password',
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);

        $request->user()->update([
            'password' => Hash::make($validated['password']),
        ]);

        return back()->with('success', 'Heslo změněno.');
    }
}
