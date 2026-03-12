<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class TimeEntry extends Model
{
    use LogsActivity;

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->useLogName('time_entry')
            ->logFillable()
            ->logOnlyDirty();
    }

    public $timestamps = false;

    protected $appends = ['cost', 'billable_hours'];

    protected $fillable = [
        'order_id',
        'user_id',
        'started_at',
        'stopped_at',
        'paused_at',
        'total_paused_seconds',
        'duration_minutes',
        'hourly_rate',
        'description',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'stopped_at' => 'datetime',
            'paused_at' => 'datetime',
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

    public function isPaused(): bool
    {
        return $this->paused_at !== null && $this->stopped_at === null;
    }

    /**
     * Effective elapsed seconds excluding paused time.
     */
    public function getEffectiveElapsedSeconds(): int
    {
        $end = $this->stopped_at ?? now();
        $totalSeconds = (int) abs($end->diffInSeconds($this->started_at));
        $pausedSeconds = $this->total_paused_seconds ?? 0;

        // If currently paused, add ongoing pause duration
        if ($this->paused_at && !$this->stopped_at) {
            $pausedSeconds += (int) abs(now()->diffInSeconds($this->paused_at));
        }

        return max(0, $totalSeconds - $pausedSeconds);
    }

    /**
     * Cena za práci — účtování po půlhodinách (0.5h, 1h, 1.5h, ...).
     */
    public function getCostAttribute(): float
    {
        $minutes = $this->duration_minutes ?? 0;
        $rate = (float) ($this->hourly_rate ?? 0);

        if ($minutes === 0 || $rate === 0.0) {
            return 0;
        }

        // Zaokrouhlení nahoru na nejbližší půlhodinu (30 min)
        $halfHours = ceil($minutes / 30);
        $hours = $halfHours * 0.5;

        return round($hours * $rate, 2);
    }

    /**
     * Účtovatelné hodiny (zaokrouhleno na 0.5h).
     */
    public function getBillableHoursAttribute(): float
    {
        $minutes = $this->duration_minutes ?? 0;
        if ($minutes === 0) return 0;
        return ceil($minutes / 30) * 0.5;
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
