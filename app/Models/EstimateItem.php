<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EstimateItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'estimate_id',
        'name',
        'width',
        'height',
        'quantity',
        'material',
        'lamination',
        'is_external',
        'calculated_price',
        'sort_order',
    ];

    protected function casts(): array
    {
        return [
            'width'            => 'decimal:4',
            'height'           => 'decimal:4',
            'quantity'         => 'integer',
            'is_external'      => 'boolean',
            'calculated_price' => 'decimal:2',
            'sort_order'       => 'integer',
        ];
    }

    public function estimate(): BelongsTo
    {
        return $this->belongsTo(Estimate::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(EstimatePhoto::class, 'estimate_item_id');
    }
}
