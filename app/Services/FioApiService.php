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
        $this->token = config('services.fio.token') ?? '';
        $this->baseUrl = config('services.fio.base_url') ?? 'https://fioapi.fio.cz/v1/rest';
    }

    /**
     * Stáhne transakce od poslední zarážky (bookmark).
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
                Log::error("Fio API: HTTP {$response->status()}", ['body' => $response->body()]);
                return null;
            }

            return $this->parseResponse($response->json());
        } catch (\Exception $e) {
            Log::error('Fio API: Výjimka při stahování transakcí', ['message' => $e->getMessage()]);
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
     * Nastaví zarážku na konkrétní datum.
     */
    public function setLastDate(string $date): bool
    {
        if (empty($this->token)) {
            return false;
        }

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
                'bank_id' => (string) $this->getColumn($tx, 22),
                'date' => $this->parseDate($this->getColumn($tx, 0)),
                'amount' => (float) $this->getColumn($tx, 1),
                'currency' => $this->getColumn($tx, 14),
                'counter_account' => $this->formatCounterAccount(
                    $this->getColumn($tx, 2),
                    $this->getColumn($tx, 3),
                ),
                'counter_account_name' => $this->getColumn($tx, 10),
                'variable_symbol' => $this->getColumn($tx, 5),
                'specific_symbol' => $this->getColumn($tx, 6),
                'constant_symbol' => $this->getColumn($tx, 4),
                'description' => $this->getColumn($tx, 16) ?: $this->getColumn($tx, 25),
                'transaction_type' => $this->getColumn($tx, 8),
                'user_identification' => $this->getColumn($tx, 7),
                'raw_data' => $tx,
            ];
        }

        return $parsed;
    }

    private function getColumn(array $transaction, int $columnId): mixed
    {
        $key = "column{$columnId}";
        return $transaction[$key]['value'] ?? null;
    }

    private function parseDate(mixed $timestamp): ?string
    {
        if (!$timestamp) {
            return null;
        }
        return date('Y-m-d', (int) ($timestamp / 1000));
    }

    private function formatCounterAccount(?string $account, ?string $bankCode): ?string
    {
        if (!$account) {
            return null;
        }
        return $bankCode ? "{$account}/{$bankCode}" : $account;
    }
}
