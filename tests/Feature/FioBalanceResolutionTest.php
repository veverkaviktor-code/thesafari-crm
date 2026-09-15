<?php

namespace Tests\Feature;

use App\Services\FioApiService;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * The balance comes from a single-day statement. On a day with no transactions
 * Fio leaves closingBalance at 0.0 while openingBalance still holds the real
 * figure, so reading closingBalance blindly reported 0 Kč on the dashboard.
 */
class FioBalanceResolutionTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        config(['services.fio.token' => 'testToken1234567890']);
    }

    private function fakeStatement(array $info): void
    {
        Http::fake([
            'fioapi.fio.cz/*' => Http::response([
                'accountStatement' => ['info' => $info + [
                    'currency' => 'CZK',
                    'accountId' => '775211102',
                    'bankId' => '2010',
                    'iban' => 'CZ9120100000000775211102',
                ]],
            ]),
        ]);
    }

    /** The production case that exposed the bug. */
    public function test_falls_back_to_opening_balance_on_a_day_without_transactions(): void
    {
        $this->fakeStatement(['openingBalance' => 10677.75, 'closingBalance' => 0.0]);

        $balance = app(FioApiService::class)->getBalance();

        $this->assertSame(10677.75, $balance['balance']);
    }

    public function test_prefers_closing_balance_when_the_day_had_movement(): void
    {
        $this->fakeStatement(['openingBalance' => 10677.75, 'closingBalance' => 14000.50]);

        $balance = app(FioApiService::class)->getBalance();

        $this->assertSame(14000.50, $balance['balance']);
    }

    /** An account genuinely emptied during the day still reports zero. */
    public function test_reports_zero_when_both_figures_are_zero(): void
    {
        $this->fakeStatement(['openingBalance' => 0.0, 'closingBalance' => 0.0]);

        $balance = app(FioApiService::class)->getBalance();

        $this->assertSame(0.0, $balance['balance']);
    }

    public function test_negative_closing_balance_is_kept(): void
    {
        $this->fakeStatement(['openingBalance' => 500.0, 'closingBalance' => -250.25]);

        $balance = app(FioApiService::class)->getBalance();

        $this->assertSame(-250.25, $balance['balance']);
    }

    public function test_missing_closing_balance_uses_opening(): void
    {
        $this->fakeStatement(['openingBalance' => 8321.10]);

        $balance = app(FioApiService::class)->getBalance();

        $this->assertSame(8321.10, $balance['balance']);
    }
}
