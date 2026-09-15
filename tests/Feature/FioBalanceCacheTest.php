<?php

namespace Tests\Feature;

use App\Console\Commands\SyncFioTransactions;
use App\Services\FioApiService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Mockery;
use Tests\TestCase;

/**
 * The dashboard reads the account balance exclusively from the 'fio_balance'
 * cache key; only the fio:sync command writes it. These tests pin down when
 * that write has to happen.
 */
class FioBalanceCacheTest extends TestCase
{
    use RefreshDatabase;

    private const BALANCE = [
        'closing_balance' => 12345.67,
        'currency' => 'CZK',
        'account_id' => '775211102',
    ];

    protected function tearDown(): void
    {
        Mockery::close();
        parent::tearDown();
    }

    private function mockFio(?array $transactions, ?array $balance): void
    {
        $fio = Mockery::mock(FioApiService::class);
        $fio->shouldReceive('getNewTransactions')->andReturn($transactions);
        $fio->shouldReceive('getBalance')->andReturn($balance);

        $this->app->instance(FioApiService::class, $fio);
        $this->skipRateLimitWait();
    }

    /**
     * Replaces the command's rate-limit pause with a no-op; without this a test
     * covering a failed balance read sits through the real 31-second wait.
     */
    private function skipRateLimitWait(): void
    {
        $this->app->extend(SyncFioTransactions::class, fn () => new class extends SyncFioTransactions {
            protected function waitOutRateLimit(): void
            {
                // no-op in tests
            }
        });
    }

    /**
     * The regression this suite exists for: incoming payments are rare, so most
     * syncs fetch nothing. Returning early on an empty batch skipped the balance
     * refresh entirely, and the dashboard went blank once the cache expired.
     */
    public function test_balance_is_cached_when_there_are_no_new_transactions(): void
    {
        Cache::forget('fio_balance');
        $this->mockFio(transactions: [], balance: self::BALANCE);

        $this->artisan('fio:sync')->assertExitCode(0);

        $this->assertSame(self::BALANCE, Cache::get('fio_balance'));
    }

    /**
     * The path that already worked before the fix — kept so a future refactor
     * cannot break it while making the empty-batch case pass.
     */
    public function test_balance_is_cached_when_transactions_are_processed(): void
    {
        Cache::forget('fio_balance');
        $this->mockFio(
            transactions: [[
                'bank_id' => '99999999999',
                'amount' => -1.0,   // outgoing: skipped early, needs no admin user or DB rows
                'date' => '2026-09-13',
                'variable_symbol' => null,
                'description' => 'test',
                'counter_account' => null,
                'counter_account_name' => null,
                'user_identification' => null,
            ]],
            balance: self::BALANCE,
        );

        $this->artisan('fio:sync')->assertExitCode(0);

        $this->assertSame(self::BALANCE, Cache::get('fio_balance'));
    }

    /**
     * A Fio outage must degrade to a stale balance, never to an empty one.
     */
    public function test_failed_balance_read_keeps_the_last_known_value(): void
    {
        Cache::put('fio_balance', self::BALANCE, now()->addDay());
        $this->mockFio(transactions: [], balance: null);

        $this->artisan('fio:sync')->assertExitCode(0);

        $this->assertSame(self::BALANCE, Cache::get('fio_balance'));
    }

    /**
     * Fio refuses two calls made less than 30s apart with HTTP 409, which
     * getBalance() reports as null. Since the balance read always follows the
     * transaction fetch, the first attempt is refused every time in production
     * — the command has to wait out the window and ask again.
     */
    public function test_balance_is_retried_after_a_rate_limited_first_attempt(): void
    {
        Cache::forget('fio_balance');

        $fio = Mockery::mock(FioApiService::class);
        $fio->shouldReceive('getNewTransactions')->andReturn([]);
        $fio->shouldReceive('getBalance')
            ->twice()
            ->andReturn(null, self::BALANCE);
        $this->app->instance(FioApiService::class, $fio);

        $this->skipRateLimitWait();

        $this->artisan('fio:sync')->assertExitCode(0);

        $this->assertSame(
            self::BALANCE,
            Cache::get('fio_balance'),
            'A rate-limited first read was treated as an outage; the balance never reached the cache.'
        );
    }

    /**
     * The cache has to outlive the 30-minute sync interval by enough that a few
     * consecutive failed runs cannot empty the dashboard.
     */
    public function test_cached_balance_outlives_several_sync_intervals(): void
    {
        Cache::forget('fio_balance');
        $this->mockFio(transactions: [], balance: self::BALANCE);

        $this->artisan('fio:sync')->assertExitCode(0);

        $this->travel(6)->hours();
        $this->assertSame(
            self::BALANCE,
            Cache::get('fio_balance'),
            'Balance expired within 6 hours — twelve sync attempts — leaving the dashboard blank.'
        );
    }
}
