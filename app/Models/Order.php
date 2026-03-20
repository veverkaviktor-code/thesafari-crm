<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Order extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'customer_id',
        'division',
        'status',
        'title',
        'description',
        'price',
        'deadline',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'deadline' => 'date',
        ];
    }

    protected static function boot()
    {
        parent::boot();

        static::deleting(function (Order $order) {
            if ($order->isForceDeleting()) {
                $order->attachments->each(function ($attachment) {
                    \Illuminate\Support\Facades\Storage::disk('local')->delete($attachment->path);
                    $attachment->delete();
                });
            }
        });
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

    public function timeEntries(): HasMany
    {
        return $this->hasMany(TimeEntry::class);
    }

    public function costs(): HasMany
    {
        return $this->hasMany(OrderCost::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function invoice(): HasOne
    {
        return $this->hasOne(Invoice::class);
    }

    public function attachments(): MorphMany
    {
        return $this->morphMany(Attachment::class, 'attachable');
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    public function scopeByStatus($query, ?string $status)
    {
        if (! $status) {
            return $query;
        }
        return $query->where('status', $status);
    }

    public function scopeByDivision($query, ?string $division)
    {
        if (! $division) {
            return $query;
        }
        return $query->where('division', $division);
    }

    public function scopeSearch($query, ?string $term)
    {
        if (! $term) {
            return $query;
        }

        return $query->where(function ($q) use ($term) {
            $q->where('title', 'ilike', "%{$term}%")
              ->orWhere('description', 'ilike', "%{$term}%")
              ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', "%{$term}%"));
        });
    }
}
