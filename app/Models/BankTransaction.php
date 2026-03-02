<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BankTransaction extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'bank_id',
        'date',
        'amount',
        'variable_symbol',
        'counter_account',
        'description',
        'matched',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'amount' => 'decimal:2',
            'matched' => 'boolean',
            'created_at' => 'datetime',
        ];
    }

    public function scopeUnmatched($query)
    {
        return $query->where('matched', false);
    }
}
