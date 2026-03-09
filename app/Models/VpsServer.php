<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class VpsServer extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'name',
        'customer_id',
        'price_yearly',
        'api_hostname',
        'ip_address',
        'storage_total_gb',
        'notes',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'price_yearly' => 'decimal:2',
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

    public function hostings(): HasMany
    {
        return $this->hasMany(Subscription::class, 'vps_server_id')
            ->where('type', 'hosting');
    }

    public function subscriptions(): HasMany
    {
        return $this->hasMany(Subscription::class, 'vps_server_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'aktivni');
    }

    public function totalStorageUsedMb(): int
    {
        return (int) $this->hostings()->sum('storage_used_mb');
    }

    public function hostingsCount(): int
    {
        return $this->hostings()->count();
    }
}
