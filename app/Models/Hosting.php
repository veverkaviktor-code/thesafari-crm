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

class Hosting extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'hostings';

    protected $fillable = [
        'customer_id',
        'name',
        'server',
        'status',
        'notes',
        'starts_at',
        'ip_address',
        'storage_quota_mb',
        'storage_used_mb',
        'synced_at',
        'auto_invoice',
        'is_free',
        'is_external',
        'sell_yearly',
        'cost_yearly',
        'alerts_ignored_at',
        'admin_url',
        'expires_at',
        'server_id',
        'management_plan_id',
        'management_cycle',
        'auto_invoice_management',
        'last_expiry_notified_at',
    ];

    protected $logFillable = true;

    protected $logOnlyDirty = true;

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'starts_at' => 'date',
            'alerts_ignored_at' => 'datetime',
            'last_expiry_notified_at' => 'datetime',
            'synced_at' => 'datetime',
            'auto_invoice' => 'boolean',
            'auto_invoice_management' => 'boolean',
            'is_free' => 'boolean',
            'is_external' => 'boolean',
            'sell_yearly' => 'decimal:2',
            'cost_yearly' => 'decimal:2',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->setDescriptionForEvent(fn ($event) => "Hosting {$event}");
    }

    protected static function booted(): void
    {
        static::deleted(function (Hosting $hosting) {
            \App\Models\Domain::where('hosting_id', $hosting->id)->update(['hosting_id' => null]);
        });
    }

    // ── Relationships ──────────────────────────────────────────────

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function domains(): HasMany
    {
        return $this->hasMany(Domain::class);
    }

    public function primaryDomain(): ?Domain
    {
        return $this->domains()->where('name', $this->name)->first();
    }

    public function payments(): HasMany
    {
        return $this->hasMany(HostingPayment::class);
    }

    public function emailAccounts(): HasMany
    {
        return $this->hasMany(EmailAccount::class, 'hosting_id');
    }

    public function credentials(): HasMany
    {
        return $this->hasMany(HostingCredential::class);
    }

    public function vpsServer(): BelongsTo
    {
        return $this->belongsTo(VpsServer::class, 'server_id');
    }

    public function managementPlan(): BelongsTo
    {
        return $this->belongsTo(ManagementPlan::class);
    }

    public function invoices(): BelongsToMany
    {
        return $this->belongsToMany(Invoice::class, 'invoice_hosting', 'hosting_id', 'invoice_id')
            ->withPivot('invoice_type', 'created_at');
    }

    // ── Scopes ─────────────────────────────────────────────────────

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

    // ── Helper methods ─────────────────────────────────────────────

    public function daysUntilExpiry(): ?int
    {
        if (! $this->expires_at) {
            return null;
        }

        return (int) now()->diffInDays($this->expires_at, false);
    }

    public function expiryUrgency(): string
    {
        $days = $this->daysUntilExpiry();
        if ($days === null) {
            return 'unknown';
        }
        if ($days < 0) {
            return 'expired';
        }
        if ($days <= 7) {
            return 'critical';
        }
        if ($days <= 14) {
            return 'warning';
        }
        if ($days <= 30) {
            return 'notice';
        }

        return 'ok';
    }

    public function totalSellYearly(): float
    {
        $hostingSell = (float) $this->sell_yearly;
        $domainsSell = $this->domains->where('is_registered_by_us', true)->sum(fn ($d) => (float) $d->sell_yearly);

        return $hostingSell + $domainsSell;
    }

    public function totalCostYearly(): float
    {
        $hostingCost = (float) $this->cost_yearly;
        $domainsCost = $this->domains->where('is_registered_by_us', true)->sum(fn ($d) => (float) $d->cost_yearly);

        return $hostingCost + $domainsCost;
    }

    public function totalMarginYearly(): float
    {
        return $this->totalSellYearly() - $this->totalCostYearly();
    }

    public function yearlyMargin(): float
    {
        return $this->totalMarginYearly();
    }

    public function monthlyRevenue(): float
    {
        return $this->totalSellYearly() / 12;
    }

    public function totalAnnualRevenue(): float
    {
        return $this->totalSellYearly();
    }

    public function hasUnpaidPayments(): bool
    {
        return $this->payments()->whereIn('status', ['nezaplaceno', 'po_splatnosti'])->exists();
    }

    public function lastPayment(): ?HostingPayment
    {
        return $this->payments()->latest('period_end')->first();
    }

    public function hasOpenInvoice(): bool
    {
        return $this->invoices()
            ->whereIn('status', ['vystavena', 'odeslana'])
            ->exists();
    }
}
