<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class OrderItem extends Model
{
    use LogsActivity;

    protected $fillable = [
        'order_id',
        'name',
        'description',
        'quantity',
        'unit',
        'unit_price',
    ];

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('order_item')
            ->logFillable()
            ->logOnlyDirty();
    }

    protected $appends = ['total'];

    protected function casts(): array
    {
        return [
            'quantity' => 'decimal:2',
            'unit_price' => 'decimal:2',
        ];
    }

    public function getTotalAttribute(): float
    {
        return round((float) $this->quantity * (float) $this->unit_price, 2);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }
}
