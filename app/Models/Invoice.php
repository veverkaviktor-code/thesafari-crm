<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;
use Spatie\Activitylog\LogOptions;
use Spatie\Activitylog\Traits\LogsActivity;

class Invoice extends Model
{
    use HasFactory, SoftDeletes, LogsActivity;

    protected $fillable = [
        'customer_id',
        'order_id',
        'invoice_number',
        'issue_date',
        'due_date',
        'paid_at',
        'sent_at',
        'status',
        'payment_method',
        'variable_symbol',
        'total',
        'notes',
        'pdf_path',
        'bank_transaction_id',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'due_date' => 'date',
            'paid_at' => 'datetime',
            'sent_at' => 'datetime',
            'total' => 'decimal:2',
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

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('sort_order');
    }

    public function isOverdue(): bool
    {
        return $this->status !== 'zaplacena' && $this->due_date->isPast();
    }

    public static function getNextInvoiceNumber(): string
    {
        return DB::transaction(function () {
            $year = now()->year;
            $prefix = (string) $year;

            $lastInvoice = static::withTrashed()
                ->where('invoice_number', 'LIKE', $prefix . '%')
                ->orderByRaw('CAST(invoice_number AS INTEGER) DESC')
                ->lockForUpdate()
                ->first();

            if ($lastInvoice) {
                return (string) ((int) $lastInvoice->invoice_number + 1);
            }

            return $prefix . '001';
        });
    }

    protected static function booted(): void
    {
        static::creating(function (Invoice $invoice) {
            if (empty($invoice->variable_symbol)) {
                $invoice->variable_symbol = $invoice->invoice_number;
            }
        });
    }
}
