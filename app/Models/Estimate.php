<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Estimate extends Model
{
    use HasFactory, LogsActivity, SoftDeletes, MassPrunable;

    /**
     * Permanently delete soft-deleted estimates older than 30 days.
     */
    public function prunable()
    {
        return static::onlyTrashed()->where('deleted_at', '<=', now()->subDays(30));
    }

    protected $fillable = [
        'name',
        'customer_id',
        'deadline',
        'notes',
        'total_price',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'deadline'    => 'date',
            'total_price' => 'decimal:2',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty();
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(EstimateItem::class)->orderBy('sort_order');
    }

    public function photos(): HasMany
    {
        return $this->hasMany(EstimatePhoto::class);
    }
}
