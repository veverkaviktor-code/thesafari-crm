<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class WedosService
{
    private string $apiUrl;
    private string $login;
    private string $password;

    public function __construct()
    {
        $this->apiUrl = config('services.wedos.api_url');
        $this->login = config('services.wedos.login', '');
        $this->password = config('services.wedos.password', '');
    }

    private function getAuth(): string
    {
        $hour = Carbon::now('Europe/Prague')->format('H');
        $passHash = sha1($this->password);
        return sha1($this->login . $passHash . $hour);
    }

    private function request(string $command, array $data = []): ?array
    {
        try {
            $payload = [
                'request' => [
                    'user' => $this->login,
                    'auth' => $this->getAuth(),
                    'command' => $command,
                ],
            ];

            if (!empty($data)) {
                $payload['request']['data'] = $data;
            }

            $response = Http::timeout(15)
                ->asForm()
                ->post($this->apiUrl, [
                    'request' => json_encode($payload),
                ]);

            if ($response->successful()) {
                $result = $response->json();
                if (($result['response']['code'] ?? 0) === 1000) {
                    return $result['response']['data'] ?? [];
                }
                Log::warning('Wedos API non-1000 response', [
                    'command' => $command,
                    'code' => $result['response']['code'] ?? 'unknown',
                    'result' => $result['response']['result'] ?? 'unknown',
                ]);
            }

            return null;
        } catch (\Exception $e) {
            Log::error('Wedos API error', ['command' => $command, 'error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * List all domains from Wedos account.
     * Returns: [{name, status, expiration}]
     */
    public function listDomains(): array
    {
        $data = $this->request('domains-list');
        if (!$data || !isset($data['domain'])) {
            return [];
        }

        $domains = [];
        foreach ($data['domain'] as $domain) {
            $domains[] = [
                'name' => $domain['name'],
                'status' => $domain['status'],
                'expiration' => $domain['expiration'],
            ];
        }

        return $domains;
    }

    /**
     * Get detailed info for one or more domains (max 10 per call).
     * Returns: [{name, status, expiration, setup_date, dns, owner_name, nsset}]
     */
    public function getDomainInfo(array $names): array
    {
        if (empty($names)) {
            return [];
        }

        $chunks = array_chunk($names, 10);
        $results = [];

        foreach ($chunks as $chunk) {
            $data = $this->request('domain-info', [
                'name' => implode(',', $chunk),
            ]);

            if ($data && isset($data['domain'])) {
                $domains = $data['domain'];
                // Single domain returns object, multiple returns indexed array
                if (isset($domains['name'])) {
                    $domains = [$domains];
                }
                foreach ($domains as $d) {
                    $results[] = [
                        'name' => $d['name'],
                        'status' => $d['status'],
                        'expiration' => $d['expiration'],
                        'setup_date' => $d['setup_date'] ?? null,
                        'owner_name' => $d['own_company'] ?? $d['own_name'] ?? null,
                        'nsset' => $d['nsset'] ?? null,
                        'dns' => $d['dns'] ?? null,
                    ];
                }
            }
        }

        return $results;
    }
}
