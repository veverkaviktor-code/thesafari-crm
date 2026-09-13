<?php

namespace Tests\Feature;

use App\Services\FioApiService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

/**
 * The Fio API token is part of every endpoint URL, and HTTP client exceptions
 * embed that URL in their message. Logging one verbatim leaked read access to
 * the bank account into storage/logs/laravel.log — these tests keep it out.
 */
class FioTokenRedactionTest extends TestCase
{
    private const TOKEN = 'aTestTokenThatMustNeverReachTheLog123456';

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.fio.token' => self::TOKEN]);
    }

    /** @return list<string> every message passed to Log::error */
    private function captureLoggedMessages(callable $action): array
    {
        $logged = [];

        Log::shouldReceive('error')
            ->andReturnUsing(function (string $message, array $context = []) use (&$logged) {
                $logged[] = $message . ' ' . json_encode($context);
            });
        Log::shouldReceive('warning')->andReturnNull();
        Log::shouldReceive('info')->andReturnNull();

        $action();

        return $logged;
    }

    private function assertNoTokenIn(array $logged): void
    {
        $this->assertNotEmpty($logged, 'Expected the failure to be logged.');

        foreach ($logged as $line) {
            $this->assertStringNotContainsString(
                self::TOKEN,
                $line,
                'The Fio API token reached the log.'
            );
        }
    }

    public function test_connection_failure_does_not_log_the_token(): void
    {
        // Guzzle puts the full request URL — token included — into this message.
        Http::fake(fn () => throw new \RuntimeException(
            'cURL error 28: Connection timed out for https://fioapi.fio.cz/v1/rest/last/'
            . self::TOKEN . '/transactions.json'
        ));

        $logged = $this->captureLoggedMessages(
            fn () => app(FioApiService::class)->getNewTransactions()
        );

        $this->assertNoTokenIn($logged);
    }

    public function test_balance_failure_does_not_log_the_token(): void
    {
        Http::fake(fn () => throw new \RuntimeException(
            'cURL error 28: Connection timed out for https://fioapi.fio.cz/v1/rest/periods/'
            . self::TOKEN . '/2026-09-13/2026-09-13/transactions.json'
        ));

        $logged = $this->captureLoggedMessages(
            fn () => app(FioApiService::class)->getBalance()
        );

        $this->assertNoTokenIn($logged);
    }

    /**
     * Defence in depth: a token from another source (a wrapped exception, a
     * proxy error) still gets masked by shape alone.
     */
    public function test_a_foreign_token_in_a_fio_url_is_also_masked(): void
    {
        $foreign = 'SomeOtherTokenValueEntirely9876543210';

        Http::fake(fn () => throw new \RuntimeException(
            'Proxy error for https://fioapi.fio.cz/v1/rest/last/' . $foreign . '/transactions.json'
        ));

        $logged = $this->captureLoggedMessages(
            fn () => app(FioApiService::class)->getNewTransactions()
        );

        $this->assertNotEmpty($logged);
        foreach ($logged as $line) {
            $this->assertStringNotContainsString($foreign, $line);
        }
    }
}
