<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EstimatePhoto extends Model
{
    use HasFactory;

    protected $fillable = [
        'estimate_id',
        'estimate_item_id',
        'path',
        'caption',
    ];

    protected function casts(): array
    {
        return [];
    }

    public function estimate(): BelongsTo
    {
        return $this->belongsTo(Estimate::class);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(EstimateItem::class, 'estimate_item_id');
    }
}
