<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(
            ['email' => 'admin@thesafari.cz'],
            [
                'name' => 'Admin',
                'password' => Hash::make('SafariHQ2026!'),
                'role' => 'admin',
            ]
        );
    }
}
