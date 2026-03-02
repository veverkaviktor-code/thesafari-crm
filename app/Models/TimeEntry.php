<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TimeEntry extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'user_id',
        'started_at',
        'stopped_at',
        'duration_minutes',
        'hourly_rate',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'stopped_at' => 'datetime',
            'hourly_rate' => 'decimal:2',
            'created_at' => 'datetime',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isRunning(): bool
    {
        return $this->stopped_at === null;
    }

    public function getDurationAttribute(): ?int
    {
        if ($this->duration_minutes !== null) {
            return $this->duration_minutes;
        }

        if ($this->stopped_at === null) {
            return (int) now()->diffInMinutes($this->started_at);
        }

        return (int) $this->stopped_at->diffInMinutes($this->started_at);
    }
}
