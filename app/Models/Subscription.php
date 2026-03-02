<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Subscription extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'customer_id',
        'type',
        'name',
        'provider',
        'server',
        'price_yearly',
        'starts_at',
        'expires_at',
        'auto_renew',
        'status',
        'notes',
        'customer_notified_at',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'date',
            'expires_at' => 'date',
            'auto_renew' => 'boolean',
            'price_yearly' => 'decimal:2',
            'customer_notified_at' => 'datetime',
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

    public function scopeByType($query, string $type)
    {
        return $query->where('type', $type);
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'aktivni');
    }

    public function scopeExpiringSoon($query, int $days = 30)
    {
        return $query->where('status', 'aktivni')
            ->where('expires_at', '<=', now()->addDays($days))
            ->where('expires_at', '>=', now());
    }

    public function daysUntilExpiry(): int
    {
        return (int) now()->diffInDays($this->expires_at, false);
    }

    public function expiryUrgency(): string
    {
        $days = $this->daysUntilExpiry();
        if ($days < 0) return 'expired';
        if ($days <= 7) return 'critical';
        if ($days <= 14) return 'warning';
        if ($days <= 30) return 'notice';
        return 'ok';
    }
}
