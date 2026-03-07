<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
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

    public static function getNextInvoiceNumber(string $series = '1'): string
    {
        return DB::transaction(function () use ($series) {
            $year = now()->year;
            $prefix = $year . $series;

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

    public function subscriptions(): BelongsToMany
    {
        return $this->belongsToMany(Subscription::class, 'invoice_subscription')
            ->withPivot('created_at');
    }

    public function bankTransaction(): BelongsTo
    {
        return $this->belongsTo(BankTransaction::class);
    }

    public function tasks(): HasMany
    {
        return $this->hasMany(Task::class);
    }

    /**
     * Označí fakturu jako zaplacenou a provede všechny navazující akce.
     * Centrální metoda — volána z InvoiceController, SyncFioTransactions i matchBankTransaction.
     */
    public function processPayment(string $paymentMethod = 'banka', ?int $bankTransactionId = null): void
    {
        $updateData = [
            'status'         => 'zaplacena',
            'paid_at'        => now(),
            'payment_method' => $paymentMethod,
        ];

        if ($bankTransactionId) {
            $updateData['bank_transaction_id'] = $bankTransactionId;
        }

        $this->update($updateData);

        // Order: update status
        if ($this->order_id) {
            $this->order->update(['status' => 'fakturovano']);
        }

        // Subscriptions: create payment records + extend expires_at
        $this->load('subscriptions');
        foreach ($this->subscriptions as $subscription) {
            $expiresAt = $subscription->expires_at ?? now();

            $subscription->payments()->create([
                'amount'         => (float) $subscription->sell_yearly ?: (float) $subscription->price_yearly,
                'period_start'   => $expiresAt,
                'period_end'     => $expiresAt->copy()->addYear(),
                'status'         => 'zaplaceno',
                'paid_at'        => now(),
                'invoice_id'     => $this->id,
                'payment_method' => $paymentMethod,
            ]);

            // Hosting: extend by 1 year. Domain: DON'T — wait for registrar sync.
            if ($subscription->type !== 'domena') {
                $subscription->update([
                    'expires_at' => $expiresAt->copy()->addYear(),
                ]);
            }
        }
    }
}
