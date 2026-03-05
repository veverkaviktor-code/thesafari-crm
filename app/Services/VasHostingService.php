<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class VasHostingService
{
    private string $portalApiUrl;
    private string $portalApiKey;
    private string $serverApiUrl;
    private string $serverApiKey;
    private string $vpscAdminEmail;

    public function __construct()
    {
        $this->portalApiUrl = config('services.vas_hosting.portal_api_url');
        $this->portalApiKey = config('services.vas_hosting.portal_api_key');
        $this->serverApiUrl = config('services.vas_hosting.server_api_url');
        $this->serverApiKey = config('services.vas_hosting.server_api_key');
        $this->vpscAdminEmail = config('services.vas_hosting.vpsc_admin_email', '');
    }

    /**
     * List all domains from portal API (customer account — 70 domains)
     * Returns: [domain_name => {id, expiration, isRegisteredByUs, tariff, ip, dnssec, storageQuota, storageUsed, storageFree}]
     */
    public function listPortalDomains(): array
    {
        try {
            $response = Http::withHeaders([
                'X-API-Key' => $this->portalApiKey,
            ])->get("{$this->portalApiUrl}/domains");

            if ($response->successful()) {
                return $response->json() ?? [];
            }

            Log::warning('VasHosting portal listDomains failed', ['status' => $response->status()]);
            return [];
        } catch (\Exception $e) {
            Log::error('VasHosting portal listDomains error', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * List all hostings from server API (VPS admin — 4 domains on sss06)
     * Returns: [domain_name => {id, expiration, storageQuota, storageUsed, storageFree}]
     */
    public function listServerHostings(): array
    {
        try {
            $response = Http::withHeaders([
                'X-API-Key' => $this->serverApiKey,
            ])->get("{$this->serverApiUrl}/domains");

            if ($response->successful()) {
                return $response->json() ?? [];
            }

            Log::warning('VasHosting server listHostings failed', ['status' => $response->status()]);
            return [];
        } catch (\Exception $e) {
            Log::error('VasHosting server listHostings error', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Get domain info from portal API
     */
    public function getPortalDomainInfo(string $domain): ?array
    {
        try {
            $response = Http::withHeaders([
                'X-API-Key' => $this->portalApiKey,
            ])->get("{$this->portalApiUrl}/domains/{$domain}");

            if ($response->successful()) {
                return $response->json();
            }

            return null;
        } catch (\Exception $e) {
            Log::error('VasHosting portal getDomainInfo error', ['domain' => $domain, 'error' => $e->getMessage()]);
            return null;
        }
    }

    /**
     * List unpaid invoices from portal API
     */
    public function listUnpaidInvoices(): array
    {
        try {
            $response = Http::withHeaders([
                'X-API-Key' => $this->portalApiKey,
            ])->get("{$this->portalApiUrl}/account/unpaid-invoices");

            if ($response->successful()) {
                return $response->json() ?? [];
            }

            return [];
        } catch (\Exception $e) {
            Log::error('VasHosting listUnpaidInvoices error', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Get VPS Centrum server configs
     */
    public function getVpsCentrumServers(): array
    {
        return config('services.vas_hosting.vpsc_servers', []);
    }

    /**
     * List domains from VPS Centrum API (ond08, thaimassage-server etc.)
     * Returns: [['id' => int, 'domena' => string, 'domena_expirace' => string], ...]
     */
    public function listVpsCentrumDomains(string $serverUrl, string $apiKey): array
    {
        try {
            $response = Http::withHeaders([
                'X-VPSC-Admin' => $this->vpscAdminEmail,
                'X-VPSC-ApiKey' => $apiKey,
                'Content-Type' => 'application/json',
            ])->post("{$serverUrl}/admin/api/v1/api.php", [
                'command' => 'domain-list',
            ]);

            if ($response->successful()) {
                return $response->json() ?? [];
            }

            Log::warning('VPS Centrum listDomains failed', [
                'server' => $serverUrl,
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return [];
        } catch (\Exception $e) {
            Log::error('VPS Centrum listDomains error', [
                'server' => $serverUrl,
                'error' => $e->getMessage(),
            ]);
            return [];
        }
    }

    /**
     * Get domain size from VPS Centrum API
     * Returns: {domain, mail_size_mb, db_size_mb, ftp_size_mb, data_size_timestamp}
     */
    public function getVpsCentrumDomainSize(string $serverUrl, string $apiKey, string $domain): ?array
    {
        try {
            $response = Http::withHeaders([
                'X-VPSC-Admin' => $this->vpscAdminEmail,
                'X-VPSC-ApiKey' => $apiKey,
                'Content-Type' => 'application/json',
            ])->post("{$serverUrl}/admin/api/v1/api.php", [
                'command' => 'domain-size',
                'domain' => $domain,
            ]);

            if ($response->successful()) {
                return $response->json();
            }

            return null;
        } catch (\Exception $e) {
            Log::error('VPS Centrum getDomainSize error', [
                'server' => $serverUrl,
                'domain' => $domain,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }
}
