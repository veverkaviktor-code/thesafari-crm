<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Domain extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'domains';

    protected $fillable = [
        'customer_id',
        'hosting_id',
        'name',
        'registrar',
        'expires_at',
        'is_registered_by_us',
        'sell_yearly',
        'cost_yearly',
        'auto_invoice',
        'ip_address',
        'dns_servers',
        'owner_name',
        'setup_date',
        'synced_at',
        'last_expiry_notified_at',
        'status',
        'notes',
    ];

    protected $logFillable = true;

    protected $logOnlyDirty = true;

    protected function casts(): array
    {
        return [
            'expires_at' => 'date',
            'setup_date' => 'date',
            'synced_at' => 'datetime',
            'last_expiry_notified_at' => 'datetime',
            'is_registered_by_us' => 'boolean',
            'auto_invoice' => 'boolean',
            'sell_yearly' => 'decimal:2',
            'cost_yearly' => 'decimal:2',
            'dns_servers' => 'array',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty()
            ->setDescriptionForEvent(fn ($event) => "Domain {$event}");
    }

    // ── Relationships ──────────────────────────────────────────────

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function hosting(): BelongsTo
    {
        return $this->belongsTo(Hosting::class);
    }

    public function invoices(): BelongsToMany
    {
        return $this->belongsToMany(Invoice::class, 'invoice_domain', 'domain_id', 'invoice_id')
            ->withPivot('created_at');
    }

    // ── Scopes ─────────────────────────────────────────────────────

    public function scopeActive($query)
    {
        return $query->where('status', 'aktivni');
    }

    public function scopeExpiringSoon($query, int $days = 30)
    {
        return $query->where('status', 'aktivni')
            ->whereBetween('expires_at', [now(), now()->addDays($days)]);
    }

    public function scopeRegisteredByUs($query)
    {
        return $query->where('is_registered_by_us', true);
    }

    public function scopeStandalone($query)
    {
        return $query->whereNull('hosting_id');
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

    public function isAlias(): bool
    {
        return $this->hosting_id !== null && $this->name !== $this->hosting?->name;
    }

    public function isPrimary(): bool
    {
        return $this->hosting_id !== null && $this->name === $this->hosting?->name;
    }

    public function isStandalone(): bool
    {
        return $this->hosting_id === null;
    }

    public function hasOpenInvoice(): bool
    {
        return $this->invoices()
            ->whereIn('status', ['vystavena', 'odeslana'])
            ->exists();
    }

    public function yearlyMargin(): float
    {
        return (float) $this->sell_yearly - (float) $this->cost_yearly;
    }
}
