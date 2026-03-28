<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\MassPrunable;
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
    use HasFactory, SoftDeletes, MassPrunable, LogsActivity;

    protected $fillable = [
        'customer_id',
        'order_id',
        'vps_server_id',
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
        'reminder_count',
        'last_reminder_at',
    ];

    protected function casts(): array
    {
        return [
            'issue_date' => 'date',
            'due_date' => 'date',
            'paid_at' => 'datetime',
            'sent_at' => 'datetime',
            'last_reminder_at' => 'datetime',
            'total' => 'decimal:2',
        ];
    }

    public function prunable()
    {
        return static::onlyTrashed()->where('deleted_at', '<=', now()->subDays(30));
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

            // Atomic increment on sequence table — safe even after hard delete
            $seq = DB::table('invoice_sequences')
                ->where('prefix', $prefix)
                ->lockForUpdate()
                ->first();

            if ($seq) {
                $next = $seq->last_number + 1;
                DB::table('invoice_sequences')
                    ->where('prefix', $prefix)
                    ->update(['last_number' => $next]);
                return (string) $next;
            }

            $firstNumber = (int) ($prefix . '001');
            DB::table('invoice_sequences')->insert([
                'prefix' => $prefix,
                'last_number' => $firstNumber,
            ]);

            return (string) $firstNumber;
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

    public function hostings(): BelongsToMany
    {
        return $this->belongsToMany(Hosting::class, 'invoice_hosting', 'invoice_id', 'hosting_id')
            ->withPivot('invoice_type', 'created_at');
    }

    public function domains(): BelongsToMany
    {
        return $this->belongsToMany(Domain::class, 'invoice_domain', 'invoice_id', 'domain_id')
            ->withPivot('created_at');
    }

    public function bankTransaction(): BelongsTo
    {
        return $this->belongsTo(BankTransaction::class);
    }

    public function vpsServer(): BelongsTo
    {
        return $this->belongsTo(VpsServer::class);
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
        if ($this->status === 'zaplacena') {
            return;
        }

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
            $this->loadMissing('order');
            $this->order?->update(['status' => 'fakturovano']);
        }

        // Hostings: create payment records + extend expiry dates
        $this->load('hostings');
        foreach ($this->hostings as $hosting) {
            $pivotType = $hosting->pivot->invoice_type ?? 'hosting';

            // Payment amount: full sell_yearly (or cost_yearly as fallback)
            $amount = (float) $hosting->sell_yearly ?: (float) $hosting->cost_yearly;

            // Period: use hosting expires_at
            $periodStart = $hosting->expires_at ?? now();
            $periodEnd = $periodStart->copy()->addYear();

            $hosting->payments()->create([
                'amount'         => $amount,
                'period_start'   => $periodStart,
                'period_end'     => $periodEnd,
                'status'         => 'zaplaceno',
                'paid_at'        => now(),
                'invoice_id'     => $this->id,
                'payment_method' => $paymentMethod,
            ]);

            if ($pivotType === 'hosting') {
                // Extend hosting expiry
                $hosting->expires_at = $hosting->expires_at?->addYear() ?? now()->addYear();
                $hosting->save();
            }
        }

        // VPS servers: extend expiry via vps_server_id FK (robustní, bez regex z notes)
        if ($this->vps_server_id) {
            $vps = \App\Models\VpsServer::find($this->vps_server_id);
            if ($vps && $vps->expires_at) {
                $vps->expires_at = $vps->expires_at->addYear();
                $vps->save();
            }
        }

        cache()->forget('dashboard_alerts');
    }
}
