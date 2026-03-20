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

class Website extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $fillable = [
        'customer_id',
        'name',
        'server',
        'status',
        'notes',
        'starts_at',
        'is_registered_by_us',
        'ip_address',
        'storage_quota_mb',
        'storage_used_mb',
        'synced_at',
        'auto_renew',
        'auto_invoice',
        'is_free',
        'is_external',
        'sell_yearly',
        'cost_yearly',
        'alerts_ignored_at',
        'admin_url',
        'domain_expires_at',
        'hosting_expires_at',
        'hosting_server_id',
        'alias_of_id',
        'management_plan_id',
        'management_cycle',
        'auto_invoice_management',
        'last_expiry_notified_at',
    ];

    protected function casts(): array
    {
        return [
            'domain_expires_at' => 'datetime',
            'hosting_expires_at' => 'datetime',
            'starts_at' => 'date',
            'alerts_ignored_at' => 'datetime',
            'last_expiry_notified_at' => 'datetime',
            'synced_at' => 'datetime',
            'auto_renew' => 'boolean',
            'auto_invoice' => 'boolean',
            'auto_invoice_management' => 'boolean',
            'is_free' => 'boolean',
            'is_external' => 'boolean',
            'is_registered_by_us' => 'boolean',
            'sell_yearly' => 'decimal:2',
            'cost_yearly' => 'decimal:2',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->setDescriptionForEvent(fn ($event) => "Website {$event}");
    }

    // ── Relationships ──────────────────────────────────────────────

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(WebsitePayment::class);
    }

    public function emailAccounts(): HasMany
    {
        return $this->hasMany(EmailAccount::class);
    }

    public function credentials(): HasMany
    {
        return $this->hasMany(WebsiteCredential::class);
    }

    public function hostingServer(): BelongsTo
    {
        return $this->belongsTo(VpsServer::class, 'hosting_server_id');
    }

    public function aliasOf(): BelongsTo
    {
        return $this->belongsTo(Website::class, 'alias_of_id');
    }

    public function aliases(): HasMany
    {
        return $this->hasMany(Website::class, 'alias_of_id');
    }

    public function managementPlan(): BelongsTo
    {
        return $this->belongsTo(ManagementPlan::class);
    }

    public function invoices(): BelongsToMany
    {
        return $this->belongsToMany(Invoice::class, 'invoice_website', 'website_id', 'invoice_id')
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
            ->where('hosting_expires_at', '<=', now()->addDays($days))
            ->where('hosting_expires_at', '>=', now());
    }

    // ── Helper methods ─────────────────────────────────────────────

    public function daysUntilExpiry(): ?int
    {
        if (! $this->hosting_expires_at) {
            return null;
        }

        return (int) now()->diffInDays($this->hosting_expires_at, false);
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

    public function yearlyMargin(): float
    {
        return (float) $this->sell_yearly - (float) $this->cost_yearly;
    }

    public function monthlyRevenue(): float
    {
        return (float) $this->sell_yearly / 12;
    }

    public function totalAnnualRevenue(): float
    {
        return (float) $this->sell_yearly;
    }

    public function hasUnpaidPayments(): bool
    {
        return $this->payments()->whereIn('status', ['nezaplaceno', 'po_splatnosti'])->exists();
    }

    public function lastPayment(): ?WebsitePayment
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
