<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class HostingPayment extends Model
{
    use HasFactory, LogsActivity, SoftDeletes;

    protected $table = 'hosting_payments';

    protected $fillable = [
        'hosting_id',
        'amount',
        'period_start',
        'period_end',
        'status',
        'paid_at',
        'invoice_id',
        'payment_method',
        'notes',
    ];

    protected $logFillable = true;

    protected $logOnlyDirty = true;

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'period_start' => 'date',
            'period_end' => 'date',
            'paid_at' => 'datetime',
        ];
    }

    public function getActivitylogOptions(): LogOptions
    {
        return LogOptions::defaults()
            ->logFillable()
            ->logOnlyDirty();
    }

    public function hosting(): BelongsTo
    {
        return $this->belongsTo(Hosting::class);
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function scopeUnpaid($query)
    {
        return $query->where('status', 'nezaplaceno');
    }

    public function scopeOverdue($query)
    {
        return $query->where('status', 'po_splatnosti');
    }

    public function scopePaid($query)
    {
        return $query->where('status', 'zaplaceno');
    }

    public function isOverdue(): bool
    {
        return $this->status === 'nezaplaceno' && $this->period_end->isPast();
    }
}
