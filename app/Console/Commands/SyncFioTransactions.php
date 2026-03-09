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
use Illuminate\Support\Facades\Mail;

class SyncFioTransactions extends Command
{
    protected $signature = 'fio:sync {--dry-run : Pouze zobrazit, neukládat}';

    protected $description = 'Stáhne nové transakce z Fio banky, uloží je a spáruje s fakturami';

    private bool $dryRun = false;

    private int $countFetched = 0;
    private int $countSkippedOutgoing = 0;
    private int $countSkippedDuplicate = 0;
    private int $countSaved = 0;
    private int $countAutoMatched = 0;
    private int $countPartialMatch = 0;
    private int $countAmountMatch = 0;
    private int $countNoMatch = 0;

    public function handle(FioApiService $fio): int
    {
        $this->dryRun = (bool) $this->option('dry-run');

        if ($this->dryRun) {
            $this->warn('[DRY-RUN] Žádné změny nebudou uloženy.');
        }

        $this->info('Stahuji transakce z Fio banky...');

        $transactions = $fio->getNewTransactions();

        if ($transactions === null) {
            $this->error('Nepodařilo se stáhnout transakce z Fio API. Zkontrolujte log.');
            return self::FAILURE;
        }

        $this->countFetched = count($transactions);
        $this->info("Staženo transakcí: {$this->countFetched}");

        if (empty($transactions)) {
            $this->info('Žádné nové transakce k zpracování.');
            $this->printStats();
            return self::SUCCESS;
        }

        $admin = User::first();

        foreach ($transactions as $txData) {
            $this->processTransaction($txData, $admin);
        }

        $this->printStats();

        cache()->put('last_bank_sync', now()->toIso8601String());

        Log::info('fio:sync dokončen', [
            'fetched' => $this->countFetched,
            'saved' => $this->countSaved,
            'auto_matched' => $this->countAutoMatched,
            'dry_run' => $this->dryRun,
        ]);

        return self::SUCCESS;
    }

    private function processTransaction(array $txData, ?User $admin): void
    {
        // 1. Přeskoč odchozí transakce
        if ((float) $txData['amount'] <= 0) {
            $this->countSkippedOutgoing++;
            $this->line("  <fg=gray>SKIP odchozí: {$txData['bank_id']} ({$txData['amount']} Kč)</>");
            return;
        }

        // 2. Deduplikace dle bank_id
        $exists = BankTransaction::where('bank_id', $txData['bank_id'])->exists();
        if ($exists) {
            $this->countSkippedDuplicate++;
            $this->line("  <fg=gray>SKIP duplikát: {$txData['bank_id']}</>");
            return;
        }

        // 3. Uložení transakce
        $bankTransaction = $this->saveTransaction($txData);
        if ($bankTransaction === null) {
            return;
        }

        // 4. Párování s fakturami
        $this->matchTransaction($bankTransaction, $admin);
    }

    private function saveTransaction(array $txData): ?BankTransaction
    {
        if ($this->dryRun) {
            $this->countSaved++;
            $this->line("  <fg=cyan>DRY-RUN uložení: {$txData['bank_id']} | {$txData['amount']} Kč | VS: {$txData['variable_symbol']}</>");

            // Vytvoříme in-memory instanci pro matching v dry-run režimu
            $bt = new BankTransaction();
            $bt->id = 0;
            $bt->bank_id = $txData['bank_id'];
            $bt->date = $txData['date'];
            $bt->amount = $txData['amount'];
            $bt->variable_symbol = $txData['variable_symbol'] ?? null;
            $bt->counter_account = $txData['counter_account'] ?? null;
            $bt->counter_account_name = $txData['counter_account_name'] ?? null;
            $bt->description = $txData['description'] ?? null;
            $bt->transaction_type = $txData['transaction_type'] ?? null;
            $bt->matched = false;
            return $bt;
        }

        try {
            $bt = BankTransaction::create([
                'bank_id'              => $txData['bank_id'],
                'date'                 => $txData['date'],
                'amount'               => $txData['amount'],
                'variable_symbol'      => $txData['variable_symbol'] ?? null,
                'counter_account'      => $txData['counter_account'] ?? null,
                'counter_account_name' => $txData['counter_account_name'] ?? null,
                'description'          => $txData['description'] ?? null,
                'transaction_type'     => $txData['transaction_type'] ?? null,
                'raw_data'             => $txData['raw_data'] ?? null,
                'matched'              => false,
            ]);

            $this->countSaved++;
            $this->line("  <fg=green>ULOŽENO: {$bt->bank_id} | {$bt->amount} Kč | VS: {$bt->variable_symbol}</>");
            return $bt;
        } catch (\Exception $e) {
            $this->error("  Chyba při ukládání transakce {$txData['bank_id']}: {$e->getMessage()}");
            Log::error('fio:sync uložení selhalo', ['bank_id' => $txData['bank_id'], 'error' => $e->getMessage()]);
            return null;
        }
    }

    private function matchTransaction(BankTransaction $bankTransaction, ?User $admin): void
    {
        $vs = $bankTransaction->variable_symbol;
        $amount = (float) $bankTransaction->amount;

        // Aktivní neuhrazené faktury
        $unpaidStatuses = ['vystavena', 'odeslana', 'po_splatnosti'];

        // (a) Přesná shoda: VS + částka
        if (!empty($vs)) {
            $invoice = Invoice::whereIn('status', $unpaidStatuses)
                ->where('variable_symbol', $vs)
                ->first();

            if ($invoice && (float) $invoice->total === $amount) {
                $this->autoMatch($bankTransaction, $invoice, $admin);
                return;
            }

            // (b) Částečná shoda: VS sedí, ale částka ne
            if ($invoice) {
                $this->countPartialMatch++;
                $reason = "VS {$vs} nalezen (faktura {$invoice->invoice_number}), ale částka nesedí — očekáváno " . number_format((float) $invoice->total, 2, ',', '') . " Kč, přijato " . number_format($amount, 2, ',', '') . " Kč";
                $this->line("  <fg=yellow>ČÁSTEČNÁ SHODA: {$bankTransaction->bank_id} → faktura {$invoice->invoice_number}</>");

                if (!$this->dryRun && $admin) {
                    $admin->notify(new BankMatchRequired($bankTransaction, $reason, $invoice->id));
                }
                return;
            }
        }

        // (c) Bez VS, ale unikátní shoda částky
        $byAmount = Invoice::whereIn('status', $unpaidStatuses)
            ->whereRaw('CAST(total AS FLOAT) = ?', [$amount])
            ->get();

        if ($byAmount->count() === 1) {
            $suggestedInvoice = $byAmount->first();
            $this->countAmountMatch++;
            $reason = "Bez variabilního symbolu — nalezena 1 faktura se stejnou částkou ({$suggestedInvoice->invoice_number}), doporučena ruční kontrola";
            $this->line("  <fg=yellow>SHODA ČÁSTKY: {$bankTransaction->bank_id} → faktura {$suggestedInvoice->invoice_number} (návrh)</>");

            if (!$this->dryRun && $admin) {
                $admin->notify(new BankMatchRequired($bankTransaction, $reason, $suggestedInvoice->id));
            }
            return;
        }

        // (d) Žádná shoda
        $this->countNoMatch++;
        $reason = empty($vs)
            ? "Transakce bez variabilního symbolu, žádná jednoznačná shoda s fakturou"
            : "Variabilní symbol {$vs} nenalezen v žádné neuhrazené faktuře";
        $this->line("  <fg=red>BEZ SHODY: {$bankTransaction->bank_id} | VS: " . ($vs ?: 'N/A') . " | {$amount} Kč</>");

        if (!$this->dryRun && $admin) {
            $admin->notify(new BankMatchRequired($bankTransaction, $reason));
        }
    }

    private function autoMatch(BankTransaction $bankTransaction, Invoice $invoice, ?User $admin): void
    {
        $this->countAutoMatched++;
        $this->line("  <fg=green>AUTO-MATCH: {$bankTransaction->bank_id} → faktura {$invoice->invoice_number} ({$invoice->total} Kč)</>");

        if ($this->dryRun) {
            return;
        }

        DB::transaction(function () use ($bankTransaction, $invoice) {
            $invoice->processPayment('banka', $bankTransaction->id);
            $bankTransaction->update(['matched' => true]);
        });

        $invoice->loadMissing('customer');
        if ($admin) {
            $admin->notify(new PaymentReceived($invoice));
        }

        // Send thank-you email to customer
        $this->sendPaymentThanks($invoice);

        Log::info('fio:sync auto-match', [
            'bank_id'        => $bankTransaction->bank_id,
            'invoice_number' => $invoice->invoice_number,
            'amount'         => $bankTransaction->amount,
        ]);
    }

    private function sendPaymentThanks(Invoice $invoice): void
    {
        if (!$invoice->customer?->email || !$invoice->sent_at) {
            return;
        }

        try {
            $htmlBody = view('emails.payment-thanks', [
                'invoice' => $invoice,
            ])->render();

            $karelPath = storage_path('app/email-assets/karel-payment-thanks.png');
            if (!file_exists($karelPath)) {
                $karelPath = storage_path('app/email-assets/karel-email.png');
            }

            Mail::html($htmlBody, function ($message) use ($invoice, $karelPath) {
                $message->to($invoice->customer->email)
                    ->subject("Platba přijata — faktura č. {$invoice->invoice_number} ✓");

                if (file_exists($karelPath)) {
                    $message->getSymfonyMessage()
                        ->embedFromPath($karelPath, 'karel-sloth', 'image/png');
                }
            });
        } catch (\Exception $e) {
            Log::error("Payment thanks email failed for invoice #{$invoice->invoice_number}", [
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function printStats(): void
    {
        $this->newLine();
        $this->table(
            ['Metrika', 'Počet'],
            [
                ['Staženo z Fio API', $this->countFetched],
                ['Přeskočeno (odchozí)', $this->countSkippedOutgoing],
                ['Přeskočeno (duplikát)', $this->countSkippedDuplicate],
                ['Uloženo', $this->countSaved],
                ['Auto-párování (VS + částka)', $this->countAutoMatched],
                ['Ruční kontrola (VS OK, částka ne)', $this->countPartialMatch],
                ['Ruční kontrola (shoda částky)', $this->countAmountMatch],
                ['Bez shody', $this->countNoMatch],
            ]
        );

        if ($this->dryRun) {
            $this->warn('[DRY-RUN] Žádné změny nebyly uloženy.');
        }
    }
}
