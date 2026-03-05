<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class BankTransaction extends Model
{
    use LogsActivity;

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

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->useLogName('bank_transaction');
    }

    public function scopeUnmatched($query)
    {
        return $query->where('matched', false);
    }
}
