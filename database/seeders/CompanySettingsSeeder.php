<?php

namespace Database\Seeders;

use App\Models\CompanySetting;
use Illuminate\Database\Seeder;

class CompanySettingsSeeder extends Seeder
{
    public function run(): void
    {
        CompanySetting::updateOrCreate(
            ['id' => 1],
            [
                'company_name' => 'The Safari',
                'ico' => '00000000',
                'dic' => null,
                'address' => [
                    'street' => '',
                    'city' => '',
                    'zip' => '',
                    'country' => 'CZ',
                ],
                'bank_account' => '',
                'bank_iban' => '',
                'email_from' => 'info@thesafari.cz',
            ]
        );
    }
}
