<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Subscription extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'customer_id',
        'type',
        'name',
        'provider',
        'server',
        'price_yearly',
        'cost_yearly',
        'sell_yearly',
        'billing_cycle',
        'monthly_price',
        'monthly_plan',
        'vas_hosting_id',
        'portal_domain_id',
        'is_registered_by_us',
        'ip_address',
        'storage_quota_mb',
        'storage_used_mb',
        'tariff',
        'synced_at',
        'starts_at',
        'expires_at',
        'managed_since',
        'auto_renew',
        'auto_invoice',
        'is_free',
        'is_external',
        'status',
        'notes',
        'customer_notified_at',
        'alerts_ignored_at',
        'vps_server_id',
        'admin_url',
        'admin_user',
        'admin_password',
    ];

    protected $hidden = ['admin_password'];

    protected function casts(): array
    {
        return [
            'starts_at' => 'date',
            'expires_at' => 'date',
            'managed_since' => 'date',
            'auto_renew' => 'boolean',
            'auto_invoice' => 'boolean',
            'is_free' => 'boolean',
            'is_external' => 'boolean',
            'is_registered_by_us' => 'boolean',
            'price_yearly' => 'decimal:2',
            'cost_yearly' => 'decimal:2',
            'sell_yearly' => 'decimal:2',
            'monthly_price' => 'decimal:2',
            'synced_at' => 'datetime',
            'customer_notified_at' => 'datetime',
            'alerts_ignored_at' => 'datetime',
            'admin_password' => 'encrypted',
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

    public function payments(): HasMany
    {
        return $this->hasMany(SubscriptionPayment::class);
    }

    public function vpsServer(): BelongsTo
    {
        return $this->belongsTo(VpsServer::class);
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

    public function daysUntilExpiry(): ?int
    {
        if (!$this->expires_at) return null;
        return (int) now()->diffInDays($this->expires_at, false);
    }

    public function expiryUrgency(): string
    {
        $days = $this->daysUntilExpiry();
        if ($days === null) return 'unknown';
        if ($days < 0) return 'expired';
        if ($days <= 7) return 'critical';
        if ($days <= 14) return 'warning';
        if ($days <= 30) return 'notice';
        return 'ok';
    }

    public function yearlyMargin(): float
    {
        return (float) $this->sell_yearly - (float) $this->cost_yearly;
    }

    public function monthlyRevenue(): float
    {
        return (float) $this->monthly_price;
    }

    public function totalAnnualRevenue(): float
    {
        return (float) $this->sell_yearly + ((float) $this->monthly_price * 12);
    }

    public function hasUnpaidPayments(): bool
    {
        return $this->payments()->whereIn('status', ['nezaplaceno', 'po_splatnosti'])->exists();
    }

    public function lastPayment(): ?SubscriptionPayment
    {
        return $this->payments()->latest('period_end')->first();
    }

    public function invoices(): BelongsToMany
    {
        return $this->belongsToMany(Invoice::class, 'invoice_subscription')
            ->withPivot('created_at');
    }

    public function hasOpenInvoice(): bool
    {
        return $this->invoices()
            ->whereIn('status', ['vystavena', 'odeslana'])
            ->exists();
    }
}
