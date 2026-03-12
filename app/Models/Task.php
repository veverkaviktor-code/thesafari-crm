<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\MassPrunable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Task extends Model
{
    use HasFactory, SoftDeletes, MassPrunable, LogsActivity;

    protected $fillable = [
        'title',
        'description',
        'status',
        'priority',
        'due_date',
        'completed_at',
        'customer_id',
        'order_id',
        'invoice_id',
        'meta',
    ];

    protected function casts(): array
    {
        return [
            'due_date' => 'date',
            'completed_at' => 'datetime',
            'meta' => 'array',
        ];
    }

    public function prunable()
    {
        return static::onlyTrashed()->where('deleted_at', '<=', now()->subDays(30));
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

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function scopeOpen($query)
    {
        return $query->whereIn('status', ['novy', 'rozpracovany']);
    }

    public function scopeByStatus($query, ?string $status)
    {
        return $status ? $query->where('status', $status) : $query;
    }

    public function scopeByPriority($query, ?string $priority)
    {
        return $priority ? $query->where('priority', $priority) : $query;
    }

    public function scopeDueToday($query)
    {
        return $query->whereDate('due_date', today());
    }

    public function scopeDueThisWeek($query)
    {
        return $query->whereBetween('due_date', [
            now()->startOfWeek(),
            now()->endOfWeek(),
        ]);
    }

    public function scopeOverdue($query)
    {
        return $query->open()
            ->whereNotNull('due_date')
            ->where('due_date', '<', today());
    }

    public function scopeSearch($query, ?string $term)
    {
        return $term
            ? $query->where(function ($q) use ($term) {
                $q->where('title', 'ilike', "%{$term}%")
                  ->orWhere('description', 'ilike', "%{$term}%");
            })
            : $query;
    }

    public function markAsCompleted(): void
    {
        $this->update([
            'status' => 'hotovy',
            'completed_at' => now(),
        ]);
    }

    public function isOverdue(): bool
    {
        return $this->due_date
            && $this->due_date->isPast()
            && in_array($this->status, ['novy', 'rozpracovany']);
    }
}
