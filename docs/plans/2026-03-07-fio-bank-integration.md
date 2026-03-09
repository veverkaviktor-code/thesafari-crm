# Fio Bank API Integration — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automaticky stahovat bankovní transakce z Fio Bank API, párovat je s fakturami dle VS+částky, a automaticky označovat faktury jako zaplacené.

**Architecture:** Laravel artisan command volá Fio API endpoint `/last/{token}/transactions.json` (zarážkový systém — vrací jen nové transakce od posledního dotazu). Transakce se ukládají do `bank_transactions`, párují se s `invoices` dle variable_symbol + amount. Přesná shoda = auto markAsPaid, částečná = notifikace pro manuální kontrolu.

**Tech Stack:** Laravel 12, PHP, PostgreSQL, Inertia.js + React 19 + Tailwind 4 + Shadcn/UI

---

## Task 1: Konfigurace — .env + config/services.php

**Files:**
- Modify: `.env.example`
- Modify: `config/services.php`
- Modify: `.env` (na serveru přes SSH)

**Step 1: Přidat Fio config do config/services.php**

Do pole v `config/services.php` přidat:

```php
'fio' => [
    'token' => env('FIO_API_TOKEN'),
    'base_url' => env('FIO_API_URL', 'https://fioapi.fio.cz/v1/rest'),
],
```

**Step 2: Přidat do .env.example**

```
FIO_API_TOKEN=
FIO_API_URL=https://fioapi.fio.cz/v1/rest
```

**Step 3: Commit**

```bash
git add config/services.php .env.example
git commit -m "feat: add Fio Bank API configuration"
```

---

## Task 2: Migrace — rozšíření bank_transactions

**Files:**
- Create: `database/migrations/2026_03_07_000001_extend_bank_transactions_for_fio.php`

Stávající tabulka má: bank_id, date, amount, variable_symbol, counter_account, description, matched, created_at.
Potřebujeme přidat: jméno protiúčtu (pro zobrazení v CRM kdo zaplatil) a raw JSON z Fio (audit trail).

**Step 1: Vytvořit migraci**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bank_transactions', function (Blueprint $table) {
            $table->string('counter_account_name')->nullable()->after('counter_account');
            $table->string('transaction_type', 100)->nullable()->after('description');
            $table->jsonb('raw_data')->nullable()->after('transaction_type');
        });
    }

    public function down(): void
    {
        Schema::table('bank_transactions', function (Blueprint $table) {
            $table->dropColumn(['counter_account_name', 'transaction_type', 'raw_data']);
        });
    }
};
```

**Step 2: Spustit migraci lokálně**

```bash
php artisan migrate
```

**Step 3: Aktualizovat BankTransaction model — přidat nové sloupce do $fillable**

V `app/Models/BankTransaction.php` přidat do `$fillable`:

```php
protected $fillable = [
    'bank_id',
    'date',
    'amount',
    'variable_symbol',
    'counter_account',
    'counter_account_name',
    'description',
    'transaction_type',
    'raw_data',
    'matched',
];

protected function casts(): array
{
    return [
        'date' => 'date',
        'amount' => 'decimal:2',
        'matched' => 'boolean',
        'raw_data' => 'array',
    ];
}
```

**Step 4: Commit**

```bash
git add database/migrations/2026_03_07_000001_extend_bank_transactions_for_fio.php app/Models/BankTransaction.php
git commit -m "feat: extend bank_transactions table for Fio API data"
```

---

## Task 3: FioApiService — komunikace s API

**Files:**
- Create: `app/Services/FioApiService.php`

**Step 1: Vytvořit service**

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class FioApiService
{
    private string $token;
    private string $baseUrl;

    public function __construct()
    {
        $this->token = config('services.fio.token');
        $this->baseUrl = config('services.fio.base_url');
    }

    /**
     * Stáhne transakce od poslední zarážky (bookmark).
     * Fio API automaticky posouvá zarážku po každém volání.
     */
    public function getNewTransactions(): ?array
    {
        if (empty($this->token)) {
            Log::error('Fio API: Token není nastaven v .env');
            return null;
        }

        $url = "{$this->baseUrl}/last/{$this->token}/transactions.json";

        try {
            $response = Http::timeout(30)->get($url);

            if ($response->status() === 409) {
                Log::warning('Fio API: Rate limit — 30s interval nedodržen');
                return null;
            }

            if (!$response->successful()) {
                Log::error("Fio API: HTTP {$response->status()}", [
                    'body' => $response->body(),
                ]);
                return null;
            }

            return $this->parseResponse($response->json());
        } catch (\Exception $e) {
            Log::error('Fio API: Výjimka při stahování transakcí', [
                'message' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Stáhne transakce za konkrétní období.
     */
    public function getTransactionsByPeriod(string $dateFrom, string $dateTo): ?array
    {
        if (empty($this->token)) {
            Log::error('Fio API: Token není nastaven v .env');
            return null;
        }

        $url = "{$this->baseUrl}/periods/{$this->token}/{$dateFrom}/{$dateTo}/transactions.json";

        try {
            $response = Http::timeout(30)->get($url);

            if ($response->status() === 409) {
                Log::warning('Fio API: Rate limit — 30s interval nedodržen');
                return null;
            }

            if (!$response->successful()) {
                Log::error("Fio API: HTTP {$response->status()}");
                return null;
            }

            return $this->parseResponse($response->json());
        } catch (\Exception $e) {
            Log::error('Fio API: Výjimka', ['message' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * Nastaví zarážku na konkrétní datum (pro reset bookmarku).
     */
    public function setLastDate(string $date): bool
    {
        $url = "{$this->baseUrl}/set-last-date/{$this->token}/{$date}/";

        try {
            $response = Http::timeout(30)->get($url);
            return $response->successful();
        } catch (\Exception $e) {
            Log::error('Fio API: Nelze nastavit zarážku', ['message' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Parsuje Fio JSON response do pole transakcí.
     * Fio API vrací data v column-based formátu (column0, column1, ...).
     */
    private function parseResponse(array $data): array
    {
        $statement = $data['accountStatement'] ?? null;
        if (!$statement) {
            return [];
        }

        $transactions = $statement['transactionList']['transaction'] ?? [];
        $parsed = [];

        foreach ($transactions as $tx) {
            $parsed[] = [
                'bank_id' => (string) $this->getColumn($tx, 22),  // ID pohybu
                'date' => $this->parseDate($this->getColumn($tx, 0)),  // Datum (ms timestamp)
                'amount' => (float) $this->getColumn($tx, 1),  // Objem
                'currency' => $this->getColumn($tx, 14),  // Měna
                'counter_account' => $this->formatCounterAccount(
                    $this->getColumn($tx, 2),  // Protiúčet
                    $this->getColumn($tx, 3),  // Kód banky
                ),
                'counter_account_name' => $this->getColumn($tx, 10),  // Název protiúčtu
                'variable_symbol' => $this->getColumn($tx, 5),  // VS
                'specific_symbol' => $this->getColumn($tx, 6),  // SS
                'constant_symbol' => $this->getColumn($tx, 4),  // KS
                'description' => $this->getColumn($tx, 16)  // Zpráva pro příjemce
                    ?: $this->getColumn($tx, 25),  // Komentář (fallback)
                'transaction_type' => $this->getColumn($tx, 8),  // Typ pohybu
                'user_identification' => $this->getColumn($tx, 7),  // Uživatelská identifikace
                'raw_data' => $tx,  // Celý originální záznam
            ];
        }

        return $parsed;
    }

    /**
     * Extrahuje hodnotu z Fio column formátu.
     * Každý sloupec je {"value": ..., "name": "...", "id": N} nebo null.
     */
    private function getColumn(array $transaction, int $columnId): mixed
    {
        $key = "column{$columnId}";
        return $transaction[$key]['value'] ?? null;
    }

    /**
     * Parsuje Fio timestamp (milisekundy od epoch) na Y-m-d.
     */
    private function parseDate(mixed $timestamp): ?string
    {
        if (!$timestamp) {
            return null;
        }

        // Fio vrací Unix timestamp v milisekundách
        return date('Y-m-d', (int) ($timestamp / 1000));
    }

    /**
     * Formátuje protiúčet jako "číslo/kód_banky".
     */
    private function formatCounterAccount(?string $account, ?string $bankCode): ?string
    {
        if (!$account) {
            return null;
        }

        return $bankCode ? "{$account}/{$bankCode}" : $account;
    }
}
```

**Step 2: Commit**

```bash
git add app/Services/FioApiService.php
git commit -m "feat: add FioApiService for API communication"
```

---

## Task 4: Notifikace — BankMatchRequired

**Files:**
- Create: `app/Notifications/BankMatchRequired.php`

**Step 1: Vytvořit notifikaci**

```php
<?php

namespace App\Notifications;

use App\Models\BankTransaction;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class BankMatchRequired extends Notification
{
    use Queueable;

    public function __construct(
        private BankTransaction $transaction,
        private string $reason,
        private ?int $suggestedInvoiceId = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $data = [
            'type' => 'bank_match_required',
            'title' => "Platba vyžaduje kontrolu: {$this->transaction->amount} Kč",
            'message' => $this->buildMessage(),
            'bank_transaction_id' => $this->transaction->id,
        ];

        if ($this->suggestedInvoiceId) {
            $data['link'] = "/faktury/{$this->suggestedInvoiceId}";
            $data['invoice_id'] = $this->suggestedInvoiceId;
        } else {
            $data['link'] = '/faktury';
        }

        return $data;
    }

    private function buildMessage(): string
    {
        $from = $this->transaction->counter_account_name
            ?: $this->transaction->counter_account
            ?: 'neznámý';

        $vs = $this->transaction->variable_symbol ?: 'bez VS';

        return "Příchozí platba {$this->transaction->amount} Kč od {$from} (VS: {$vs}) — {$this->reason}";
    }
}
```

**Step 2: Commit**

```bash
git add app/Notifications/BankMatchRequired.php
git commit -m "feat: add BankMatchRequired notification"
```

---

## Task 5: SyncFioTransactions command — jádro integrace

**Files:**
- Create: `app/Console/Commands/SyncFioTransactions.php`

Toto je hlavní command, který:
1. Stáhne nové transakce z Fio API
2. Uloží je do bank_transactions (deduplikace dle bank_id)
3. Páruje: VS + částka = auto markAsPaid, částečná shoda = notifikace
4. Nespárované = uloží a notifikuje

**Step 1: Vytvořit command**

```php
<?php

namespace App\Console\Commands;

use App\Models\BankTransaction;
use App\Models\Invoice;
use App\Models\User;
use App\Notifications\BankMatchRequired;
use App\Notifications\PaymentReceived;
use App\Services\FioApiService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class SyncFioTransactions extends Command
{
    protected $signature = 'fio:sync {--dry-run : Pouze zobrazit, neukládat}';
    protected $description = 'Synchronizovat transakce z Fio Bank API a párovat s fakturami';

    public function handle(FioApiService $fio): int
    {
        $this->info('Stahuji transakce z Fio Bank API...');

        $transactions = $fio->getNewTransactions();

        if ($transactions === null) {
            $this->error('Nepodařilo se stáhnout transakce z Fio API.');
            return self::FAILURE;
        }

        if (empty($transactions)) {
            $this->info('Žádné nové transakce.');
            return self::SUCCESS;
        }

        $this->info(count($transactions) . ' nových transakcí.');

        $stats = ['saved' => 0, 'skipped' => 0, 'matched' => 0, 'partial' => 0, 'unmatched' => 0];

        foreach ($transactions as $tx) {
            // Pouze příchozí platby (kladná částka)
            if ($tx['amount'] <= 0) {
                $this->line("  Přeskakuji odchozí: {$tx['amount']} Kč ({$tx['description']})");
                $stats['skipped']++;
                continue;
            }

            // Deduplikace dle bank_id
            if (BankTransaction::where('bank_id', $tx['bank_id'])->exists()) {
                $this->line("  Duplikát: {$tx['bank_id']}");
                $stats['skipped']++;
                continue;
            }

            if ($this->option('dry-run')) {
                $this->info("  [DRY] {$tx['date']} | {$tx['amount']} Kč | VS: {$tx['variable_symbol']} | {$tx['counter_account_name']}");
                continue;
            }

            // Uložit transakci
            $bankTx = BankTransaction::create([
                'bank_id' => $tx['bank_id'],
                'date' => $tx['date'],
                'amount' => $tx['amount'],
                'variable_symbol' => $tx['variable_symbol'],
                'counter_account' => $tx['counter_account'],
                'counter_account_name' => $tx['counter_account_name'],
                'description' => $tx['description'],
                'transaction_type' => $tx['transaction_type'],
                'raw_data' => $tx['raw_data'],
                'matched' => false,
            ]);
            $stats['saved']++;

            // Párování s fakturami
            $result = $this->matchTransaction($bankTx);
            $stats[$result]++;
        }

        $this->table(
            ['Uloženo', 'Přeskočeno', 'Spárováno', 'Vyžaduje kontrolu', 'Nespárováno'],
            [[$stats['saved'], $stats['skipped'], $stats['matched'], $stats['partial'], $stats['unmatched']]],
        );

        return self::SUCCESS;
    }

    /**
     * Párování transakce s fakturou.
     * Returns: 'matched' | 'partial' | 'unmatched'
     */
    private function matchTransaction(BankTransaction $bankTx): string
    {
        $admin = User::first();
        $vs = $bankTx->variable_symbol;
        $amount = (float) $bankTx->amount;

        // 1) Přesná shoda: VS + částka
        if ($vs) {
            $invoice = Invoice::where('variable_symbol', $vs)
                ->whereIn('status', ['vystavena', 'odeslana', 'po_splatnosti'])
                ->first();

            if ($invoice && (float) $invoice->total === $amount) {
                return $this->autoMatch($bankTx, $invoice, $admin);
            }

            // 2) Částečná shoda: VS sedí, ale částka ne
            if ($invoice) {
                $reason = "VS {$vs} nalezen (faktura #{$invoice->invoice_number}), ale částka nesedí: přijato {$amount} Kč, faktura {$invoice->total} Kč";
                $this->warn("  Částečná shoda: {$reason}");
                Log::info("Fio sync: částečná shoda", ['bank_tx' => $bankTx->id, 'invoice' => $invoice->id]);

                if ($admin) {
                    $admin->notify(new BankMatchRequired($bankTx, $reason, $invoice->id));
                }
                return 'partial';
            }
        }

        // 3) Pokus o shodu pouze dle částky (pokud existuje právě 1 nezaplacená faktura s touto částkou)
        if (!$vs) {
            $invoicesByAmount = Invoice::where('total', $amount)
                ->whereIn('status', ['vystavena', 'odeslana', 'po_splatnosti'])
                ->get();

            if ($invoicesByAmount->count() === 1) {
                $invoice = $invoicesByAmount->first();
                $reason = "Bez VS, ale částka {$amount} Kč odpovídá jediné nezaplacené faktuře #{$invoice->invoice_number}";
                $this->warn("  Možná shoda: {$reason}");

                if ($admin) {
                    $admin->notify(new BankMatchRequired($bankTx, $reason, $invoice->id));
                }
                return 'partial';
            }
        }

        // 4) Žádná shoda
        $from = $bankTx->counter_account_name ?: $bankTx->counter_account ?: 'neznámý';
        $reason = "Nelze spárovat — příchozí {$amount} Kč od {$from}";
        $this->warn("  Nespárováno: {$reason}");
        Log::info("Fio sync: nespárováno", ['bank_tx' => $bankTx->id]);

        if ($admin) {
            $admin->notify(new BankMatchRequired($bankTx, $reason));
        }
        return 'unmatched';
    }

    /**
     * Automatické spárování — označí fakturu jako zaplacenou.
     */
    private function autoMatch(BankTransaction $bankTx, Invoice $invoice, ?User $admin): string
    {
        DB::transaction(function () use ($bankTx, $invoice) {
            // Spárovat transakci
            $bankTx->update(['matched' => true]);
            $invoice->update(['bank_transaction_id' => $bankTx->id]);

            // Označit jako zaplacenou (stejná logika jako InvoiceController::markAsPaid)
            $invoice->update([
                'status' => 'zaplacena',
                'paid_at' => now(),
                'payment_method' => 'banka',
            ]);

            // Update objednávky
            if ($invoice->order_id) {
                $invoice->order->update(['status' => 'fakturovano']);
            }

            // Rozšíření subscriptions
            foreach ($invoice->subscriptions as $subscription) {
                $expiresAt = $subscription->expires_at ?? now();

                $subscription->payments()->create([
                    'amount' => $subscription->sell_yearly ?: $subscription->price_yearly,
                    'period_start' => $expiresAt,
                    'period_end' => $expiresAt->copy()->addYear(),
                    'status' => 'zaplaceno',
                    'paid_at' => now(),
                    'invoice_id' => $invoice->id,
                    'payment_method' => 'banka',
                ]);

                if ($subscription->type !== 'domena') {
                    $subscription->update([
                        'expires_at' => $expiresAt->copy()->addYear(),
                    ]);
                }
            }
        });

        $this->info("  AUTO-MATCH: Faktura #{$invoice->invoice_number} zaplacena ({$bankTx->amount} Kč)");
        Log::info("Fio sync: auto-match", ['bank_tx' => $bankTx->id, 'invoice' => $invoice->id]);

        // Notifikace
        if ($admin) {
            $admin->notify(new PaymentReceived($invoice));
        }

        return 'matched';
    }
}
```

**Step 2: Commit**

```bash
git add app/Console/Commands/SyncFioTransactions.php
git commit -m "feat: add SyncFioTransactions command with auto-matching"
```

---

## Task 6: Manuální párování — endpoint + route

**Files:**
- Modify: `app/Http/Controllers/InvoiceController.php`
- Modify: `routes/web.php`

**Step 1: Přidat metodu matchBankTransaction do InvoiceController**

Přidat na konec třídy (před uzavírací `}`):

```php
/**
 * Manuální spárování faktury s bankovní transakcí.
 */
public function matchBankTransaction(Request $request, Invoice $invoice)
{
    $request->validate([
        'bank_transaction_id' => 'required|exists:bank_transactions,id',
    ]);

    $bankTx = BankTransaction::findOrFail($request->bank_transaction_id);

    if ($bankTx->matched) {
        return back()->with('error', 'Tato transakce je již spárována.');
    }

    DB::transaction(function () use ($invoice, $bankTx) {
        $bankTx->update(['matched' => true]);
        $invoice->update([
            'bank_transaction_id' => $bankTx->id,
            'status' => 'zaplacena',
            'paid_at' => now(),
            'payment_method' => 'banka',
        ]);

        if ($invoice->order_id) {
            $invoice->order->update(['status' => 'fakturovano']);
        }

        foreach ($invoice->subscriptions as $subscription) {
            $expiresAt = $subscription->expires_at ?? now();

            $subscription->payments()->create([
                'amount' => $subscription->sell_yearly ?: $subscription->price_yearly,
                'period_start' => $expiresAt,
                'period_end' => $expiresAt->copy()->addYear(),
                'status' => 'zaplaceno',
                'paid_at' => now(),
                'invoice_id' => $invoice->id,
                'payment_method' => 'banka',
            ]);

            if ($subscription->type !== 'domena') {
                $subscription->update([
                    'expires_at' => $expiresAt->copy()->addYear(),
                ]);
            }
        }
    });

    $admin = auth()->user();
    if ($admin) {
        $admin->notify(new \App\Notifications\PaymentReceived($invoice));
    }

    return back()->with('success', "Faktura #{$invoice->invoice_number} spárována a označena jako zaplacená.");
}

/**
 * Manuální trigger synchronizace z Fio Bank.
 */
public function syncFromBank()
{
    \Artisan::call('fio:sync');
    $output = \Artisan::output();

    return back()->with('success', 'Synchronizace dokončena. ' . trim($output));
}
```

**Step 2: Přidat use statement pro BankTransaction do InvoiceController**

Na začátek souboru (k existujícím use):

```php
use App\Models\BankTransaction;
```

**Step 3: Přidat routes**

Do routes/web.php, k existujícím invoice routes:

```php
Route::post('/faktury/sync-bank', [InvoiceController::class, 'syncFromBank'])->name('invoices.syncBank');
Route::post('/faktury/{faktury}/match-bank', [InvoiceController::class, 'matchBankTransaction'])->name('invoices.matchBank');
```

Pozor: `/faktury/sync-bank` MUSÍ být PŘED `{faktury}` parametrizovanou routou, jinak Laravel zachytí "sync-bank" jako ID.

**Step 4: Commit**

```bash
git add app/Http/Controllers/InvoiceController.php routes/web.php
git commit -m "feat: add manual bank matching + sync trigger endpoints"
```

---

## Task 7: InvoiceController::show — předat bank data do frontendu

**Files:**
- Modify: `app/Http/Controllers/InvoiceController.php` (metoda show)

**Step 1: Upravit show() metodu**

V `show()` přidat do Inertia::render načtení:
- bankTransaction relace na invoice
- unmatchedTransactions pro manuální párování (pokud faktura není zaplacena)

Přidat do query na invoice: `->load('bankTransaction')`

A přidat do Inertia data:

```php
'unmatchedTransactions' => $invoice->status !== 'zaplacena'
    ? BankTransaction::unmatched()
        ->where('amount', '>', 0)
        ->orderByDesc('date')
        ->limit(20)
        ->get(['id', 'date', 'amount', 'variable_symbol', 'counter_account_name', 'counter_account', 'description'])
    : [],
```

**Step 2: Commit**

```bash
git add app/Http/Controllers/InvoiceController.php
git commit -m "feat: pass bank transaction data to invoice show page"
```

---

## Task 8: Frontend — Show.tsx (zobrazení spárované transakce + manuální párování)

**Files:**
- Modify: `resources/js/pages/Invoices/Show.tsx`

**Step 1: Přidat zobrazení spárované bankovní transakce**

Pod existující invoice detail card přidat sekci "Bankovní transakce" (pokud je spárována):

```tsx
{invoice.bank_transaction && (
    <div className="rounded-lg border p-4 mt-4">
        <h3 className="font-semibold text-sm mb-2">Bankovní transakce</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Datum:</span>
            <span>{invoice.bank_transaction.date}</span>
            <span className="text-muted-foreground">Částka:</span>
            <span>{formatCurrency(invoice.bank_transaction.amount)}</span>
            <span className="text-muted-foreground">Od:</span>
            <span>{invoice.bank_transaction.counter_account_name || invoice.bank_transaction.counter_account}</span>
            <span className="text-muted-foreground">VS:</span>
            <span>{invoice.bank_transaction.variable_symbol || '—'}</span>
        </div>
    </div>
)}
```

**Step 2: Přidat manuální párování (pro nezaplacené faktury)**

Pokud faktura NENÍ zaplacena a existují nespárované transakce, zobrazit select + tlačítko "Spárovat":

```tsx
{invoice.status !== 'zaplacena' && unmatchedTransactions.length > 0 && (
    <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20 p-4 mt-4">
        <h3 className="font-semibold text-sm mb-2">Spárovat s bankovní transakcí</h3>
        <form method="post" action={route('invoices.matchBank', invoice.id)}>
            <select name="bank_transaction_id" className="w-full rounded-md border p-2 text-sm mb-2">
                <option value="">Vyberte transakci...</option>
                {unmatchedTransactions.map(tx => (
                    <option key={tx.id} value={tx.id}>
                        {tx.date} | {formatCurrency(tx.amount)} | VS: {tx.variable_symbol || '—'} | {tx.counter_account_name || tx.counter_account}
                    </option>
                ))}
            </select>
            <Button type="submit" size="sm">Spárovat a označit jako zaplacenou</Button>
        </form>
    </div>
)}
```

Poznámka: Použít Inertia `router.post()` místo nativního form submit — přizpůsobit dle existujícího patternu v Show.tsx (pravděpodobně `router.post(route(...), { data })` s Inertia).

**Step 3: Přidat TypeScript typy**

Do `resources/js/types/` nebo inline — rozšířit Invoice typ o:

```typescript
bank_transaction?: {
    id: number;
    date: string;
    amount: number;
    variable_symbol: string | null;
    counter_account: string | null;
    counter_account_name: string | null;
    description: string | null;
};
```

A přidat prop `unmatchedTransactions` do Show page props.

**Step 4: Commit**

```bash
git add resources/js/pages/Invoices/Show.tsx resources/js/types/
git commit -m "feat: show bank transaction on invoice detail + manual matching UI"
```

---

## Task 9: Frontend — Index.tsx (sync tlačítko)

**Files:**
- Modify: `resources/js/pages/Invoices/Index.tsx`

**Step 1: Přidat tlačítko "Sync z banky"**

Do toolbaru vedle Export CSV přidat:

```tsx
<Button
    variant="outline"
    size="sm"
    onClick={() => router.post(route('invoices.syncBank'))}
    disabled={processing}
>
    <RefreshCw className="h-4 w-4 mr-1" />
    Sync z banky
</Button>
```

Import: `RefreshCw` z `lucide-react`.

**Step 2: Commit**

```bash
git add resources/js/pages/Invoices/Index.tsx
git commit -m "feat: add bank sync button to invoices index"
```

---

## Task 10: Cron — scheduler

**Files:**
- Modify: `bootstrap/app.php`

**Step 1: Přidat fio:sync do scheduleru**

K existujícím schedule entries přidat:

```php
$schedule->command('fio:sync')->hourly()->between('8:00', '20:00');
```

Finální scheduler bude:

```php
$schedule->command('subscriptions:auto-invoice')->dailyAt('07:00');
$schedule->command('fio:sync')->hourly()->between('8:00', '20:00');
$schedule->command('invoices:check-overdue')->dailyAt('08:00');
$schedule->command('subscriptions:check-expiring')->dailyAt('08:30');
$schedule->command('notifications:generate')->dailyAt('09:00');
```

**Step 2: Commit**

```bash
git add bootstrap/app.php
git commit -m "feat: schedule fio:sync hourly 8-20"
```

---

## Task 11: Deploy na VPS

**Step 1: Push na remote**

```bash
git push origin main
```

**Step 2: SSH na server a deploy**

```bash
ssh root@webje.cz  # nebo IP adresa VPS
cd /cesta/k/crm
git pull origin main
php artisan migrate --force
```

**Step 3: Přidat FIO_API_TOKEN do .env na serveru**

```bash
echo 'FIO_API_TOKEN=ZX1QTvVRMzy0Apex0Op01DBDhfWJMAL1slSAst5Q2pOtmNwRfLBEnUM7pn93qIA0' >> .env
echo 'FIO_API_URL=https://fioapi.fio.cz/v1/rest' >> .env
```

**Step 4: Otestovat ručně**

```bash
php artisan fio:sync --dry-run
```

Ověřit že API odpovídá a transakce se parsují správně.

**Step 5: Spustit ostrý sync**

```bash
php artisan fio:sync
```

**Step 6: Cache + optimize**

```bash
php artisan config:cache
php artisan route:cache
```

---

## Souhrn změn

| Soubor | Akce | Popis |
|--------|------|-------|
| `config/services.php` | Modify | Přidat Fio config |
| `.env.example` | Modify | Přidat FIO_API_TOKEN |
| `database/migrations/2026_03_07_*` | Create | Rozšíření bank_transactions |
| `app/Models/BankTransaction.php` | Modify | Nové sloupce v $fillable + casts |
| `app/Services/FioApiService.php` | Create | Komunikace s Fio API |
| `app/Notifications/BankMatchRequired.php` | Create | Notifikace pro manuální kontrolu |
| `app/Console/Commands/SyncFioTransactions.php` | Create | Hlavní sync + párování command |
| `app/Http/Controllers/InvoiceController.php` | Modify | matchBankTransaction(), syncFromBank(), show() |
| `routes/web.php` | Modify | 2 nové routes |
| `resources/js/pages/Invoices/Show.tsx` | Modify | Zobrazení transakce + manuální párování |
| `resources/js/pages/Invoices/Index.tsx` | Modify | Sync tlačítko |
| `bootstrap/app.php` | Modify | Cron schedule |
