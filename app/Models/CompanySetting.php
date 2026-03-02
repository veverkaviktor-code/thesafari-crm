<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanySetting extends Model
{
    protected $fillable = [
        'company_name',
        'ico',
        'dic',
        'address',
        'logo_path',
        'bank_account',
        'bank_iban',
        'email_from',
    ];

    protected function casts(): array
    {
        return [
            'address' => 'array',
        ];
    }

    public static function get(): self
    {
        return static::first() ?? new self([
            'company_name' => 'The Safari s.r.o.',
            'ico' => '12345678',
            'address' => ['street' => '', 'city' => '', 'zip' => '', 'country' => 'CZ'],
        ]);
    }
}
