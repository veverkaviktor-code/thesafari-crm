# Domain/Hosting Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split unified `websites` table into separate `domains` and `hostings` tables for better UX, add Wedos API sync, preserve all existing invoices and data.

**Architecture:** Rename `websites` → `hostings` (IDs preserved), extract domain data into new `domains` table with `hosting_id` FK. New `WedosService` for Wedos WAPI. Separate sidebar items, controllers, and pages for Domény/Hostingy/VPS.

**Tech Stack:** Laravel 12, Inertia.js, React 19, TypeScript, Tailwind 4, PostgreSQL, Shadcn/UI, Lucide React

**Spec:** `docs/superpowers/specs/2026-03-28-domain-hosting-split-design.md`

---

## File Map

### New files to CREATE:
```
app/Models/Domain.php
app/Models/Hosting.php (rename from Website.php)
app/Models/HostingPayment.php (rename from WebsitePayment.php)
app/Models/HostingCredential.php (rename from WebsiteCredential.php)
app/Services/WedosService.php
app/Http/Controllers/DomainController.php
app/Http/Controllers/HostingController.php (rename from WebsiteController.php)
app/Http/Controllers/HostingCredentialController.php (rename from WebsiteCredentialController.php)
app/Console/Commands/AutoInvoiceHostings.php (rename from AutoInvoiceWebsites.php)
app/Console/Commands/AutoInvoiceDomains.php
app/Console/Commands/CheckExpiringHostings.php (rename from CheckExpiringWebsites.php)
app/Console/Commands/CheckExpiringDomains.php
database/migrations/2026_03_28_000001_split_websites_to_domains_and_hostings.php
resources/js/pages/Domains/Index.tsx
resources/js/pages/Domains/Show.tsx
resources/js/pages/Domains/Create.tsx
resources/js/pages/Domains/Edit.tsx
resources/js/pages/Hostings/Index.tsx (rename from WeboveSluzby/Index.tsx)
resources/js/pages/Hostings/Show.tsx (rename from WeboveSluzby/Show.tsx)
resources/js/pages/Hostings/Create.tsx (rename from WeboveSluzby/Create.tsx)
resources/js/pages/Hostings/Edit.tsx (rename from WeboveSluzby/Edit.tsx)
resources/js/pages/Hostings/Pending.tsx (rename from WeboveSluzby/Pending.tsx)
resources/js/pages/Vps/Index.tsx
resources/js/components/domains/DomainForm.tsx
resources/js/components/hostings/HostingForm.tsx (rename from webove-sluzby/WebsiteForm.tsx)
resources/js/components/hostings/ExpirationBadge.tsx (move from webove-sluzby/)
```

### Files to MODIFY:
```
config/services.php (add wedos config)
routes/web.php (new route structure)
resources/js/components/layout/Sidebar.tsx (split nav items)
resources/js/components/dashboard/WebsiteOverview.tsx → rename + split
resources/js/components/dashboard/AttentionAlerts.tsx (update types)
resources/js/components/customers/CustomerServices.tsx (split domains/hostings)
resources/js/components/finance/MrrDetail.tsx (update calculation)
resources/js/pages/Dashboard.tsx (update props)
app/Http/Controllers/DashboardController.php (update queries)
app/Http/Controllers/FinanceController.php (update MRR/ARR)
app/Services/VasHostingService.php (refactor sync methods)
app/Console/Kernel.php or routes/console.php (update cron schedule)
app/Http/Controllers/SearchController.php (update search)
app/Http/Middleware/HandleInertiaRequests.php (if shared props reference websites)
```

### Files to DELETE (after rename):
```
app/Models/Website.php
app/Models/WebsitePayment.php
app/Models/WebsiteCredential.php
app/Http/Controllers/WebsiteController.php
app/Http/Controllers/WebsiteCredentialController.php
app/Console/Commands/AutoInvoiceWebsites.php
app/Console/Commands/CheckExpiringWebsites.php
resources/js/pages/WeboveSluzby/ (entire directory)
resources/js/components/webove-sluzby/ (entire directory)
```

---

## Task 1: Backup & Preparation

**Files:**
- No code changes — git operations only

- [ ] **Step 1: Create git tag on current state**

```bash
cd "/Users/viktorveverka/CLAUDE PROJECTS/thesafari/crm"
git tag v1.2.2-pre-domain-hosting-split
```

- [ ] **Step 2: Create backup branch**

```bash
git branch backup/v1.2.2-pre-split
```

- [ ] **Step 3: Create pg_dump on VPS**

```bash
ssh root@sss06.vas-server.cz "mkdir -p /root/backups && PGPASSWORD=1xzKZYd6J9EAUbSo pg_dump -h 127.0.0.1 -U thesafari_crm thesafari_crm > /root/backups/thesafari_crm_v1.2.2_pre_split_$(date +%Y%m%d).sql && ls -lh /root/backups/"
```

Expected: Backup file created, ~5-20MB

- [ ] **Step 4: Add Wedos env vars to VPS .env**

```bash
ssh root@sss06.vas-server.cz "cat >> /var/www/hq.thesafari.cz/.env << 'EOF'

# Wedos WAPI
WEDOS_WAPI_LOGIN=veverka.viktor@gmail.com
WEDOS_WAPI_PASSWORD=}XT7i0b6
EOF"
```

- [ ] **Step 5: Add Wedos env to local .env**

Add to `/Users/viktorveverka/CLAUDE PROJECTS/thesafari/crm/.env`:
```
WEDOS_WAPI_LOGIN=veverka.viktor@gmail.com
WEDOS_WAPI_PASSWORD=}XT7i0b6
```

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "chore: tag v1.2.2 and prepare for domain/hosting split"
```

---

## Task 2: Database Migration

**Files:**
- Create: `database/migrations/2026_03_28_000001_split_websites_to_domains_and_hostings.php`

This is the most critical task. The migration is atomic (DB::transaction). It must:
1. Rename tables and columns
2. Create `domains` table
3. Extract domain data from hostings
4. Handle alias conversion
5. Drop old columns
6. Create invoice_domain pivot

- [ ] **Step 1: Create migration file**

```bash
# Don't use artisan (no PHP on mac) — create manually
touch database/migrations/2026_03_28_000001_split_websites_to_domains_and_hostings.php
```

Write the full migration. Key points:
- Use `DB::transaction()` wrapping ALL operations
- Use raw SQL for renames (Laravel Schema doesn't support table rename well with FK)
- Extract domains BEFORE dropping columns
- Map Wedos domains by hardcoded list (from API comparison)
- Insert 10 missing Wedos domains
- Fix 3 missing expirations

The migration must handle these Wedos domains (set `registrar = 'wedos'`):
```php
$wedosDomains = [
    'alfabrno.cz', 'alfabrno.eu', 'apartmannapalave.cz', 'apartmanpavlov.cz',
    'bigfoodpoint.cz', 'bonamirestaurant.cz', 'brunchcafe.cz', 'drevotech.cz',
    'drevotech.eu', 'expresnijadrovevrtani.cz', 'face-promotion.cz',
    'jadrovevrtani-brno.cz', 'lumidis.cz', 'miliana-medium.cz', 'mrgelato.cz',
    'nolimitkebab.cz', 'prepravaletiste.cz', 'rucni-myti-aut-brno.cz',
    'smstylegarage.cz', 'topmyti.cz', 'viktorveverka.cz', 'zkclean.cz', 'zkelektro.cz',
];
```

Missing Wedos domains to INSERT (standalone, no hosting):
```php
$missingWedos = [
    ['name' => 'apartmannapalave.cz', 'expires_at' => '2027-03-01'],
    ['name' => 'brunchcafe.cz', 'expires_at' => '2026-06-24'],
    ['name' => 'drevotech.cz', 'expires_at' => '2026-06-14'],
    ['name' => 'drevotech.eu', 'expires_at' => '2026-06-14'],
    ['name' => 'lumidis.cz', 'expires_at' => '2026-11-02'],
    ['name' => 'miliana-medium.cz', 'expires_at' => '2026-06-10'],
    ['name' => 'rucni-myti-aut-brno.cz', 'expires_at' => '2026-05-26'],
    ['name' => 'viktorveverka.cz', 'expires_at' => '2026-04-06'],
    ['name' => 'zkclean.cz', 'expires_at' => '2026-06-13'],
    ['name' => 'zkelektro.cz', 'expires_at' => '2027-02-06'],
];
```

Fix missing expirations:
```php
$fixExpirations = [
    'apartmanpavlov.cz' => '2027-03-01',
    'bigfoodpoint.cz' => '2027-01-13',
    'face-promotion.cz' => '2027-03-16',
];
```

Migration steps (in order within transaction):

```
1. ALTER TABLE websites RENAME TO hostings
2. ALTER TABLE hostings RENAME COLUMN hosting_sell_yearly TO sell_yearly
3. ALTER TABLE hostings RENAME COLUMN hosting_cost_yearly TO cost_yearly
4. ALTER TABLE hostings RENAME COLUMN hosting_expires_at TO expires_at
5. ALTER TABLE hostings RENAME COLUMN hosting_server_id TO server_id
6. Rename FK constraints to match new names
7. ALTER TABLE website_payments RENAME TO hosting_payments
8. ALTER TABLE hosting_payments RENAME COLUMN website_id TO hosting_id
9. ALTER TABLE website_credentials RENAME TO hosting_credentials
10. ALTER TABLE hosting_credentials RENAME COLUMN website_id TO hosting_id
11. ALTER TABLE invoice_website RENAME TO invoice_hosting
12. ALTER TABLE invoice_hosting RENAME COLUMN website_id TO hosting_id
13. CREATE TABLE domains (full schema from spec)
14. CREATE TABLE invoice_domain (pivot)
15. Extract domains from hostings:
    - For each hosting with domain_expires_at OR is_registered_by_us OR alias_of_id:
      - INSERT into domains with appropriate hosting_id
      - Set registrar based on wedosDomains list
16. Handle aliases:
    - For aliases (alias_of_id IS NOT NULL):
      - Domain already created in step 15 with hosting_id = alias_of_id
      - If alias hosting has NO real hosting data (server_id IS NULL AND storage_used_mb = 0):
        - Soft-delete the alias hosting record
      - If alias HAS hosting data: keep as separate hosting
17. INSERT missing Wedos domains (10 standalone)
18. FIX missing expirations (3 domains)
19. ALTER TABLE hostings DROP COLUMN domain_expires_at, domain_sell_yearly, domain_cost_yearly, is_registered_by_us, sell_yearly (computed), cost_yearly (computed), alias_of_id, auto_renew
20. ADD type column to sync_pending: VARCHAR(20) DEFAULT 'domain' CHECK (domain, hosting)
21. UPDATE activity_log SET subject_type = 'App\\Models\\Hosting' WHERE subject_type = 'App\\Models\\Website'
22. UPDATE activity_log SET properties = replace(properties::text, 'Website', 'Hosting')::jsonb WHERE subject_type = 'App\\Models\\Hosting'
```

- [ ] **Step 2: Verify migration SQL locally**

Review the migration file for correctness. Ensure all FK constraints are properly renamed. Check that the domain extraction query handles NULL values.

- [ ] **Step 3: Commit**

```bash
git add database/migrations/2026_03_28_000001_split_websites_to_domains_and_hostings.php
git commit -m "feat: add migration to split websites into domains and hostings"
```

---

## Task 3: Backend Models

**Files:**
- Create: `app/Models/Domain.php`
- Create: `app/Models/Hosting.php` (based on Website.php)
- Create: `app/Models/HostingPayment.php` (based on WebsitePayment.php)
- Create: `app/Models/HostingCredential.php` (based on WebsiteCredential.php)
- Modify: `app/Models/SyncPending.php` (add type field)
- Modify: `app/Models/VpsServer.php` (update relationship name)
- Modify: `app/Models/Customer.php` (add domains() relationship)
- Modify: `app/Models/Invoice.php` (update pivot relationships)
- Modify: `app/Models/EmailAccount.php` (update FK reference)
- Delete: `app/Models/Website.php`, `app/Models/WebsitePayment.php`, `app/Models/WebsiteCredential.php`

- [ ] **Step 1: Create Domain model**

`app/Models/Domain.php` — New model with:
- `$table = 'domains'`
- SoftDeletes, LogsActivity traits
- `$fillable`: customer_id, hosting_id, name, registrar, expires_at, is_registered_by_us, sell_yearly, cost_yearly, auto_invoice, ip_address, dns_servers, owner_name, setup_date, synced_at, status, notes
- `$casts`: expires_at → date, setup_date → date, synced_at → datetime, is_registered_by_us → boolean, auto_invoice → boolean, sell_yearly → decimal:2, cost_yearly → decimal:2, dns_servers → array
- Relationships: customer() BelongsTo, hosting() BelongsTo, invoices() BelongsToMany via invoice_domain with pivot created_at
- Scopes: scopeActive, scopeExpiringSoon($days=30), scopeRegisteredByUs, scopeStandalone (whereNull hosting_id)
- Helpers: daysUntilExpiry(), expiryUrgency(), isAlias() (hosting_id set AND name != hosting.name), isPrimary(), isStandalone(), hasOpenInvoice(), yearlyMargin()

- [ ] **Step 2: Create Hosting model (from Website.php)**

Copy `Website.php` → `Hosting.php`. Changes:
- `$table = 'hostings'`
- Remove from `$fillable`: domain_expires_at, domain_sell_yearly, domain_cost_yearly, is_registered_by_us, alias_of_id, auto_renew, sell_yearly (computed), cost_yearly (computed)
- Rename: hosting_sell_yearly→sell_yearly, hosting_cost_yearly→cost_yearly, hosting_expires_at→expires_at, hosting_server_id→server_id in all references
- Add relationship: `domains()` HasMany Domain
- Add relationship: `primaryDomain()` HasOne Domain where('name', $this->name) — use `HasOne` with `ofMany` or just a helper method
- Remove relationship: `aliasOf()`, `aliases()` (replaced by domains)
- Update `invoices()` pivot to `invoice_hosting` with `hosting_id`
- Rename `payments()` → HasMany HostingPayment
- Rename `credentials()` → HasMany HostingCredential
- Rename `hostingServer()` → `server()` BelongsTo VpsServer, FK `server_id`
- Update `totalSellYearly()`: `$this->sell_yearly + $this->domains->where('is_registered_by_us', true)->sum('sell_yearly')`
- Update `totalCostYearly()`: similarly

- [ ] **Step 3: Create HostingPayment model (from WebsitePayment.php)**

Copy, change `$table = 'hosting_payments'`, rename `website_id` → `hosting_id`, update `website()` → `hosting()` BelongsTo Hosting.

- [ ] **Step 4: Create HostingCredential model (from WebsiteCredential.php)**

Copy, change `$table = 'hosting_credentials'`, rename FK, update relationship.

- [ ] **Step 5: Update related models**

**Customer.php**: Add `domains()` HasMany Domain. Rename `websites()` → `hostings()` HasMany Hosting.

**Invoice.php**: Rename `websites()` → `hostings()` BelongsToMany via `invoice_hosting`, column `hosting_id`. Add `domains()` BelongsToMany via `invoice_domain`, column `domain_id`.

**VpsServer.php**: Rename `websites()` → `hostings()` HasMany Hosting, FK `server_id`.

**EmailAccount.php**: If it has `website_id` FK, rename to `hosting_id` and update relationship to `hosting()`.

**SyncPending.php**: Add `type` to `$fillable`.

- [ ] **Step 6: Delete old model files**

```bash
rm app/Models/Website.php app/Models/WebsitePayment.php app/Models/WebsiteCredential.php
```

- [ ] **Step 7: Commit**

```bash
git add app/Models/ && git commit -m "feat: add Domain and Hosting models, remove Website"
```

---

## Task 4: WedosService

**Files:**
- Create: `app/Services/WedosService.php`
- Modify: `config/services.php` (add wedos config)

- [ ] **Step 1: Add wedos config**

In `config/services.php`, add after `vas_hosting` block:

```php
'wedos' => [
    'api_url' => env('WEDOS_WAPI_URL', 'https://api.wedos.com/wapi/json'),
    'login' => env('WEDOS_WAPI_LOGIN'),
    'password' => env('WEDOS_WAPI_PASSWORD'),
],
```

- [ ] **Step 2: Create WedosService**

`app/Services/WedosService.php`:

```php
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
        if (empty($names)) return [];

        // API supports comma-separated, max ~10 per request
        $chunks = array_chunk($names, 10);
        $results = [];

        foreach ($chunks as $chunk) {
            $data = $this->request('domain-info', [
                'name' => implode(',', $chunk),
            ]);

            if ($data && isset($data['domain'])) {
                $domains = $data['domain'];
                // Single domain returns object, multiple returns array
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
```

- [ ] **Step 3: Commit**

```bash
git add app/Services/WedosService.php config/services.php
git commit -m "feat: add WedosService for Wedos WAPI integration"
```

---

## Task 5: VasHostingService Refactor

**Files:**
- Modify: `app/Services/VasHostingService.php`

Refactor the service to expose methods per sync target:

- [ ] **Step 1: Refactor VasHostingService**

Keep existing methods (`listPortalDomains`, `listServerHostings`, `listVpsCentrumDomains`, `getVpsCentrumDomainSize`, `activateDomainOnServer`).

Add new convenience methods:
- `getVpsCentrumServers()` — returns config array (already exists, keep)

No major changes needed — the sync logic is moving from WebsiteController into DomainController and HostingController. The service just provides API data.

- [ ] **Step 2: Commit**

```bash
git add app/Services/VasHostingService.php
git commit -m "refactor: update VasHostingService for domain/hosting split"
```

---

## Task 6: DomainController

**Files:**
- Create: `app/Http/Controllers/DomainController.php`

- [ ] **Step 1: Create DomainController**

New controller with methods:

**index()**:
- Query `Domain::with('customer', 'hosting')` with filters: search, registrar, status, expiry_filter, has_hosting, customer, auto_invoice
- Stats: total, vas_hosting_count, wedos_count, external_count, expiring_soon, standalone
- Paginate, sort by expires_at ASC NULLS LAST
- Pass pending_count from SyncPending where type='domain'

**show()**:
- Load domain with customer, hosting, invoices
- Computed: days_until_expiry, urgency, yearly_margin

**create()** / **edit()**:
- Pass customers, hostings (for select), registrar options

**store()** / **update()**:
- Validate: name (unique), customer_id, hosting_id, registrar, expires_at, is_registered_by_us, sell_yearly, cost_yearly, auto_invoice, status, notes
- ActivityLog automatic via model trait

**destroy()**: Soft delete

**syncVasHosting()**:
- Call `VasHostingService::listPortalDomains()`
- For each domain: find or create in domains table
- Update: expires_at (from API `expiration`), ip_address, is_registered_by_us, synced_at
- New domains → sync_pending with type='domain'
- Skip domains in sync_blacklist
- Return counts: updated, new_pending, skipped

**syncWedos()**:
- Call `WedosService::listDomains()`
- Filter only status='active'
- For each: find in domains table by name
  - Found → update expires_at, synced_at
  - Not found → check sync_blacklist → if not blacklisted, add to sync_pending with type='domain'
- Batch `getDomainInfo()` for all matched domains → update owner_name, dns_servers, setup_date
- Return counts

**createInvoice()**:
- For standalone domain (no hosting_id): create invoice with "Doména {name} ({period})" item
- Series 6XXX, splatnost = max(expires_at, now+14d)
- Pivot invoice_domain

**approvePending()** / **ignorePending()**:
- Same pattern as current, but creates Domain record (not Hosting)
- When approving, ask for customer assignment and optional hosting_id link

- [ ] **Step 2: Commit**

```bash
git add app/Http/Controllers/DomainController.php
git commit -m "feat: add DomainController with CRUD, sync, and invoicing"
```

---

## Task 7: HostingController (refactor from WebsiteController)

**Files:**
- Create: `app/Http/Controllers/HostingController.php` (based on WebsiteController.php)
- Create: `app/Http/Controllers/HostingCredentialController.php` (based on WebsiteCredentialController.php)
- Delete: `app/Http/Controllers/WebsiteController.php`, `app/Http/Controllers/WebsiteCredentialController.php`

- [ ] **Step 1: Create HostingController from WebsiteController**

Copy `WebsiteController.php` → `HostingController.php`. Key changes:

**Class & imports**: `Website` → `Hosting`, `WebsitePayment` → `HostingPayment`, etc.

**index()**:
- Query `Hosting::with('customer', 'domains', 'server', 'managementPlan')`
- Remove alias logic (no more `alias_of_id` — aliases are now domains)
- Remove domain-specific filters
- Stats: total_hostings, total_domains (from domains table linked to hostings), expiring_soon, expired, arr_hosting (from hostings.sell_yearly + linked domains.sell_yearly)
- Pass `vpsServers` only if VPS tab is still embedded (or remove — VPS gets own page)
- Remove VPS tab data (moved to VpsController)
- Keep Payments tab

**show()**:
- Load: customer, domains (linked to this hosting), payments, credentials, emailAccounts, server, managementPlan, invoices
- Remove domain tab data — instead pass `domains` collection
- 4 tabs: Přehled, Správa, Přístupy, Platby & Faktury
- Přehled shows linked domains as links to `/domeny/{id}`

**store()** / **update()**:
- Remove domain fields: domain_sell_yearly, domain_cost_yearly, domain_expires_at, is_registered_by_us
- Remove alias_of_id handling
- Remove computed sell_yearly/cost_yearly recalculation (hosting has its own sell_yearly now)
- Keep quick toggle for auto_invoice and auto_invoice_management

**createInvoice()**:
- Hosting item: "Hosting {name}" from hosting.sell_yearly
- Domain items: from `$hosting->domains()->where('is_registered_by_us', true)->where('sell_yearly', '>', 0)` — "Doména {domain.name}"
- Pivot: invoice_hosting for hosting + invoice_domain for each domain
- Same splatnost logic (max expires_at, min 14 days)

**createCustomerInvoice()**:
- Same approach but aggregate across all customer's hostings
- Get domains from each hosting

**sync methods** — split into 3 separate methods:
- `syncSss06()`: Call `VasHostingService::listServerHostings()` → update hostings
- `syncOnd08()`: Call `VasHostingService::listVpsCentrumDomains('ond08')` → update hostings
- `syncThaimassage()`: Call `VasHostingService::listVpsCentrumDomains('thaimassage')` → update hostings
- New hostings from sync → sync_pending with type='hosting'

**Remove**: `pending()`, `approvePending()`, `ignorePending()` — pending is now on DomainController (or keep on both with type filter)

Actually keep pending on HostingController too — for new hostings discovered in sync. But use `SyncPending::where('type', 'hosting')`.

**activateDomain()**: Keep as is.

**bulkUpdate()**: Adapt — remove alias-related bulk operations.

- [ ] **Step 2: Create HostingCredentialController**

Copy + rename from WebsiteCredentialController. Update model references.

- [ ] **Step 3: Delete old controllers**

```bash
rm app/Http/Controllers/WebsiteController.php app/Http/Controllers/WebsiteCredentialController.php
```

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/HostingController.php app/Http/Controllers/HostingCredentialController.php
git add -u  # stage deletions
git commit -m "feat: add HostingController, remove WebsiteController"
```

---

## Task 8: Routes

**Files:**
- Modify: `routes/web.php`

- [ ] **Step 1: Replace website routes with domain + hosting + vps routes**

Remove all `/webove-sluzby` routes. Add:

```php
// === DOMÉNY ===
Route::post('/domeny/sync-vashosting', [DomainController::class, 'syncVasHosting'])->name('domains.sync-vashosting');
Route::post('/domeny/sync-wedos', [DomainController::class, 'syncWedos'])->name('domains.sync-wedos');
Route::get('/domeny/ke-schvaleni', [DomainController::class, 'pending'])->name('domains.pending');
Route::post('/domeny/ke-schvaleni/approve', [DomainController::class, 'approvePending'])->name('domains.pending.approve');
Route::post('/domeny/ke-schvaleni/ignore', [DomainController::class, 'ignorePending'])->name('domains.pending.ignore');
Route::post('/domeny/{domain}/faktura', [DomainController::class, 'createInvoice'])->name('domains.invoice.create');
Route::resource('domeny', DomainController::class)->parameters(['domeny' => 'domain']);

// === HOSTINGY ===
Route::post('/hostingy/sync-sss06', [HostingController::class, 'syncSss06'])->name('hostings.sync-sss06');
Route::post('/hostingy/sync-ond08', [HostingController::class, 'syncOnd08'])->name('hostings.sync-ond08');
Route::post('/hostingy/sync-thaimassage', [HostingController::class, 'syncThaimassage'])->name('hostings.sync-thaimassage');
Route::post('/hostingy/bulk-update', [HostingController::class, 'bulkUpdate'])->name('hostings.bulk-update');
Route::post('/hostingy/activate-domain', [HostingController::class, 'activateDomain'])->name('hostings.activate-domain');
Route::get('/hostingy/vytvorit', [HostingController::class, 'create'])->name('hostings.create');
Route::post('/hostingy/faktura-zakaznik/{customer}', [HostingController::class, 'createCustomerInvoice'])->name('hostings.invoice.createCustomer');
Route::get('/hostingy/ke-schvaleni', [HostingController::class, 'pending'])->name('hostings.pending');
Route::post('/hostingy/ke-schvaleni/approve', [HostingController::class, 'approvePending'])->name('hostings.pending.approve');
Route::post('/hostingy/ke-schvaleni/ignore', [HostingController::class, 'ignorePending'])->name('hostings.pending.ignore');
Route::post('/hostingy/{hosting}/faktura', [HostingController::class, 'createInvoice'])->name('hostings.invoice.create');
Route::post('/hostingy/{hosting}/toggle-ignore', [HostingController::class, 'toggleIgnoreAlerts'])->name('hostings.toggleIgnore');
Route::post('/hostingy/{hosting}/credentials', [HostingCredentialController::class, 'store'])->name('credentials.store');
Route::put('/hostingy/credentials/{credential}', [HostingCredentialController::class, 'update'])->name('credentials.update');
Route::delete('/hostingy/credentials/{credential}', [HostingCredentialController::class, 'destroy'])->name('credentials.destroy');
Route::post('/hostingy/{hosting}/emaily', [EmailAccountController::class, 'store'])->name('email-accounts.store');
Route::resource('hostingy', HostingController::class)->parameters(['hostingy' => 'hosting']);

// === VPS ===
Route::get('/vps', [VpsServerController::class, 'index'])->name('vps.index');
Route::post('/vps', [VpsServerController::class, 'store'])->name('vps.store');
Route::put('/vps/{vps}', [VpsServerController::class, 'update'])->name('vps.update');
Route::delete('/vps/{vps}', [VpsServerController::class, 'destroy'])->name('vps.destroy');
Route::post('/vps/sync', [VpsServerController::class, 'syncFromHostings'])->name('vps.sync');

// === LEGACY REDIRECTS ===
Route::get('/webove-sluzby/{any?}', fn($any = '') => redirect('/hostingy/' . $any, 301))->where('any', '.*');
Route::get('/neniweb/{any?}', fn($any = '') => redirect('/hostingy/' . $any, 301))->where('any', '.*');
```

Static routes (sync, create, pending) MUST be defined BEFORE the resource routes.

- [ ] **Step 2: Update DashboardController and other controllers referencing Website**

Search for `Website::` across all controllers and update to `Hosting::` or `Domain::` as appropriate.

Key files:
- `DashboardController.php`: getMRR → query Hosting + Domain separately. getWebsiteStats → rename. computeAttentionAlerts → separate domain/hosting alerts.
- `FinanceController.php`: MRR/ARR queries → Hosting::active() + Domain::registeredByUs()
- `SearchController.php`: Update search to include both domains and hostings
- `InvoiceController.php`: If it references Website anywhere

- [ ] **Step 3: Commit**

```bash
git add routes/web.php app/Http/Controllers/
git commit -m "feat: add domain/hosting/vps routes, update all controllers"
```

---

## Task 9: VPS Controller — Own Page

**Files:**
- Modify: `app/Http/Controllers/VpsServerController.php`
- Create: `resources/js/pages/Vps/Index.tsx`

- [ ] **Step 1: Add index() to VpsServerController**

Currently VPS data is passed from WebsiteController::index(). Add own `index()`:
- Query VpsServer::with('customer', 'hostings')->withCount('hostings')
- Calculate totalStorageUsedMb per server
- Return Inertia::render('Vps/Index', [...])

- [ ] **Step 2: Create Vps/Index.tsx**

Extract VPS tab content from current `WeboveSluzby/Index.tsx` into standalone page:
- VPS table (name+IP, customer, price, hostings count, storage progress, status, actions)
- Sync button
- GlassModal for Create/Edit VPS

- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/VpsServerController.php resources/js/pages/Vps/
git commit -m "feat: add VPS standalone page"
```

---

## Task 10: Frontend — Domény Pages

**Files:**
- Create: `resources/js/pages/Domains/Index.tsx`
- Create: `resources/js/pages/Domains/Show.tsx`
- Create: `resources/js/pages/Domains/Create.tsx`
- Create: `resources/js/pages/Domains/Edit.tsx`
- Create: `resources/js/components/domains/DomainForm.tsx`

- [ ] **Step 1: Create DomainForm.tsx**

Single-column form:
- Název (text, required)
- Zákazník (select)
- Registrátor (select: vas-hosting/wedos/external)
- Expirace (DatePickerField)
- Switch: Registrujeme my (is_registered_by_us)
- Cena roční prodej / náklad (show only if is_registered_by_us)
- Hosting (select — link to existing hosting, optional)
- Switch: Auto-fakturace
- Stav (select: aktivni/pozastaveno/zruseno)
- Poznámky (textarea)

- [ ] **Step 2: Create Domains/Index.tsx**

Stats bar: Celkem | Vas-hosting | Wedos | External | Expiruje brzy | Standalone
Sync buttons: "Sync vas-hosting" + "Sync Wedos"
Table columns: Název, Zákazník, Registrátor (badge color: blue=vas-hosting, orange=wedos, gray=external), Expirace (ExpirationBadge), Hosting (link or "—"), Cena/rok, FA, Stav
Filters: registrar, customer, status, expiry, has_hosting, auto_invoice
Tab "Ke schválení" with pending domains count badge

- [ ] **Step 3: Create Domains/Show.tsx**

Header: domain name + registrar badge + status badge + ExpirationBadge
If linked to hosting: "Hosting: {name}" link button

Cards:
- Registrace: registrátor, expirace + days, vlastník (owner_name), DNS servery, IP, datum registrace (setup_date), poslední sync
- Cena: prodej / náklad / marže (pokud is_registered_by_us)
- Faktury: list from invoice_domain pivot

Actions: Vystavit fakturu (if standalone), Upravit, Smazat

- [ ] **Step 4: Create Create.tsx + Edit.tsx**

Thin wrappers over DomainForm (same pattern as current Create/Edit).

- [ ] **Step 5: Commit**

```bash
git add resources/js/pages/Domains/ resources/js/components/domains/
git commit -m "feat: add Domény frontend pages"
```

---

## Task 11: Frontend — Hostingy Pages (refactor)

**Files:**
- Create: `resources/js/pages/Hostings/Index.tsx` (from WeboveSluzby/Index.tsx)
- Create: `resources/js/pages/Hostings/Show.tsx` (from WeboveSluzby/Show.tsx)
- Create: `resources/js/pages/Hostings/Create.tsx`
- Create: `resources/js/pages/Hostings/Edit.tsx`
- Create: `resources/js/pages/Hostings/Pending.tsx`
- Create: `resources/js/components/hostings/HostingForm.tsx` (from WebsiteForm.tsx)
- Move: `resources/js/components/webove-sluzby/ExpirationBadge.tsx` → `resources/js/components/hostings/ExpirationBadge.tsx`

- [ ] **Step 1: Create HostingForm.tsx from WebsiteForm.tsx**

Remove domain fields section entirely:
- Remove: "Doména" section (is_registered_by_us switch, domain expirace, domain ceny)
- Remove: "Alias" section (alias_of_id select)
- Keep: Základní údaje (název, zákazník, stav, admin URL, poznámky)
- Keep: Hosting section (server select, is_free, expirace, storage, hosting ceny)
- Keep: Správa webu section (management plan, cycle)

Rename form data type to `HostingFormData` — remove all `domain_*` fields and `alias_of_id`.

- [ ] **Step 2: Create Hostings/Index.tsx from WeboveSluzby/Index.tsx**

Major simplifications:
- Remove entire VPS tab (own page now)
- Remove alias expand/collapse logic (aliases are now domains)
- Remove `alias_of_id` references
- Update stats bar: Celkem hostingů | Domén na hostinzích | Expiruje brzy | MRR/ARR
- 3 sync buttons: "Sync sss06" + "Sync ond08" + "Sync thaimassage"
- Table columns: Název, Zákazník, Server, Expirace, Úložiště, Domény (count badge linking to domain filter), Cena/rok, Správa, FA, Stav
- Keep Payments tab
- Update all route URLs from `/webove-sluzby` to `/hostingy`

- [ ] **Step 3: Create Hostings/Show.tsx from WeboveSluzby/Show.tsx**

4 tabs instead of 5:
- **Přehled**: Server card (server, expirace, storage progress, admin URL) + Domény card (list of linked domains with links to `/domeny/{id}`, ExpirationBadge each) + Cena tabulka (Hosting řádek + Doménové řádky z linked domains + Správa řádek + Total) + Auto-invoice toggles + Poznámky
- **Správa**: Same as before (management plan, cycle, auto_invoice_management)
- **Přístupy**: Same as before (CredentialsSection + EmailAccountsSection)
- **Platby & Faktury**: Payment history + Invoice list (moved from Přehled for clarity)

Remove: Tab "Doména" (domain info now on `/domeny/{id}`)
Remove: Tab "Hosting" as separate tab (merged into Přehled)
Update all URLs from `/webove-sluzby` to `/hostingy`

- [ ] **Step 4: Create thin Create.tsx, Edit.tsx, Pending.tsx wrappers**

Pending.tsx: filter `sync_pending` by `type='hosting'` only.

- [ ] **Step 5: Delete old WeboveSluzby directory**

```bash
rm -rf resources/js/pages/WeboveSluzby/ resources/js/components/webove-sluzby/
```

- [ ] **Step 6: Commit**

```bash
git add resources/js/pages/Hostings/ resources/js/components/hostings/ -A
git commit -m "feat: add Hostingy frontend pages, remove WeboveSluzby"
```

---

## Task 12: Sidebar & Layout Updates

**Files:**
- Modify: `resources/js/components/layout/Sidebar.tsx`
- Modify: `resources/js/components/customers/CustomerServices.tsx`

- [ ] **Step 1: Update Sidebar.tsx**

Replace single "Webové služby" item with collapsible group:

```typescript
{
  label: 'Webové služby',
  icon: Globe,
  children: [
    { label: 'Domény', href: '/domeny', icon: AtSign },
    { label: 'Hostingy', href: '/hostingy', icon: Server },
    { label: 'VPS', href: '/vps', icon: HardDrive },
  ],
}
```

Active state detection: `url.startsWith('/domeny')` OR `/hostingy` OR `/vps`.
Collapsible: auto-open when any child is active.

Import icons: `AtSign, Server, HardDrive` from lucide-react.

- [ ] **Step 2: Update CustomerServices.tsx**

Split into two sections:
- "Hostingy" — list from `customer.hostings` with links to `/hostingy/{id}`
- "Domény" — list from `customer.domains` with links to `/domeny/{id}`

Each with appropriate icon and label.

- [ ] **Step 3: Commit**

```bash
git add resources/js/components/layout/Sidebar.tsx resources/js/components/customers/CustomerServices.tsx
git commit -m "feat: update sidebar with Domény/Hostingy/VPS navigation"
```

---

## Task 13: Dashboard & Finance Updates

**Files:**
- Modify: `app/Http/Controllers/DashboardController.php`
- Modify: `app/Http/Controllers/FinanceController.php`
- Modify: `resources/js/components/dashboard/WebsiteOverview.tsx` → rename to `ServicesOverview.tsx`
- Modify: `resources/js/components/dashboard/AttentionAlerts.tsx`
- Modify: `resources/js/components/finance/MrrDetail.tsx`
- Modify: `resources/js/pages/Dashboard.tsx`

- [ ] **Step 1: Update DashboardController.php**

**getMRR()**:
```php
// Hosting MRR
$hostingMrr = Hosting::where('status', 'aktivni')
    ->where('is_external', false)->where('is_free', false)
    ->get()->sum(fn($h) => (float)($h->sell_yearly ?: 0) / 12);

// Domain MRR
$domainMrr = Domain::where('status', 'aktivni')
    ->where('is_registered_by_us', true)
    ->get()->sum(fn($d) => (float)($d->sell_yearly ?: 0) / 12);

// Management MRR (from hostings with plans)
$mgmtMrr = Hosting::where('status', 'aktivni')
    ->whereNotNull('management_plan_id')
    ->with('managementPlan')->get()
    ->sum(fn($h) => $h->managementPlan?->price_monthly ?? 0);

// VPS MRR
$vpsMrr = VpsServer::where('status', 'aktivni')
    ->sum('price_yearly') / 12;
```

**getWebsiteStats()** → **getServicesStats()**:
- Count active hostings + active domains separately
- Storage by server from hostings only
- Expiring soon: separate lists for domains and hostings

**computeAttentionAlerts()**:
- Hosting alerts: expiring hostings, storage alerts, auto_invoice reminders
- Domain alerts (NEW): expiring domains, especially standalone ones

- [ ] **Step 2: Update FinanceController.php**

MRR/ARR: Same split as DashboardController.
Revenue breakdown: hosting_arr + domain_arr + mgmt_arr + vps_arr.
Cost calculation: hosting.cost_yearly + domain.cost_yearly.

- [ ] **Step 3: Rename WebsiteOverview.tsx → ServicesOverview.tsx**

Show two mini sections: "Hostingy" (count, storage) + "Domény" (count, expiring soon). Keep storage breakdown per server.

- [ ] **Step 4: Update AttentionAlerts.tsx**

Handle new alert types: `type: 'domain'` with `domain_id` for link generation.
Domain alerts link to `/domeny/{id}`, hosting alerts to `/hostingy/{id}`.

- [ ] **Step 5: Update MrrDetail.tsx**

Show breakdown: Hostingy | Domény | Správa | VPS | Celkem

- [ ] **Step 6: Update Dashboard.tsx**

Rename props from `websiteStats` to `servicesStats`. Update component references.

- [ ] **Step 7: Commit**

```bash
git add app/Http/Controllers/DashboardController.php app/Http/Controllers/FinanceController.php
git add resources/js/components/dashboard/ resources/js/components/finance/ resources/js/pages/Dashboard.tsx
git commit -m "feat: update Dashboard and Finance for domain/hosting split"
```

---

## Task 14: Cron Commands

**Files:**
- Create: `app/Console/Commands/AutoInvoiceHostings.php` (from AutoInvoiceWebsites.php)
- Create: `app/Console/Commands/AutoInvoiceDomains.php`
- Create: `app/Console/Commands/CheckExpiringHostings.php` (from CheckExpiringWebsites.php)
- Create: `app/Console/Commands/CheckExpiringDomains.php`
- Delete: `app/Console/Commands/AutoInvoiceWebsites.php`, `app/Console/Commands/CheckExpiringWebsites.php`
- Modify: `routes/console.php` or `app/Console/Kernel.php` (update schedule)

- [ ] **Step 1: Create AutoInvoiceHostings**

Copy from AutoInvoiceWebsites. Changes:
- Signature: `hostings:auto-invoice {--dry-run}`
- Query: `Hosting::where('status', 'aktivni')...` (no alias_of_id filter needed)
- Invoice items: hosting sell_yearly + linked domains' sell_yearly (where is_registered_by_us)
- Pivot: invoice_hosting + invoice_domain for each domain

- [ ] **Step 2: Create AutoInvoiceDomains**

New command for standalone domains:
- Signature: `domains:auto-invoice {--dry-run}`
- Query: `Domain::whereNull('hosting_id')->where('status', 'aktivni')->where('auto_invoice', true)->where('is_registered_by_us', true)->where('sell_yearly', '>', 0)` + expires in 30 days + no open invoice
- Create invoice with "Doména {name} ({period})" item
- Series 6XXX, pivot invoice_domain

- [ ] **Step 3: Create CheckExpiringHostings and CheckExpiringDomains**

Split notification logic. Hosting checks hosting.expires_at, domain checks domain.expires_at.

- [ ] **Step 4: Update cron schedule**

```php
// In routes/console.php or Kernel.php
Schedule::command('hostings:auto-invoice')->dailyAt('09:00');
Schedule::command('domains:auto-invoice')->dailyAt('09:05');
Schedule::command('hostings:check-expiring')->dailyAt('08:00');
Schedule::command('domains:check-expiring')->dailyAt('08:05');
```

- [ ] **Step 5: Delete old commands**

```bash
rm app/Console/Commands/AutoInvoiceWebsites.php app/Console/Commands/CheckExpiringWebsites.php
```

- [ ] **Step 6: Commit**

```bash
git add app/Console/ routes/console.php -A
git commit -m "feat: split auto-invoice and check-expiring commands for domains/hostings"
```

---

## Task 15: Search & Remaining References

**Files:**
- Modify: `app/Http/Controllers/SearchController.php`
- Modify: `app/Http/Middleware/HandleInertiaRequests.php` (if needed)
- Modify: Any remaining files referencing `Website`, `website`, `webove-sluzby`

- [ ] **Step 1: Global search for remaining references**

```bash
grep -r "Website" app/ --include="*.php" -l
grep -r "website" app/ --include="*.php" -l
grep -r "webove-sluzby" resources/ --include="*.tsx" --include="*.ts" -l
grep -r "Website" resources/ --include="*.tsx" --include="*.ts" -l
```

Fix every occurrence. Key areas:
- SearchController: add Domain search alongside Hosting
- HandleInertiaRequests: update shared props if any reference websites
- SyncBlacklistController: check if it references Website model
- Any Inertia type definitions (types.ts or similar)

- [ ] **Step 2: Update TypeScript types**

If there's a shared types file (`types/index.d.ts` or `types.ts`), update Website interfaces to Hosting + add Domain interface.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "fix: update all remaining Website references to Hosting/Domain"
```

---

## Task 16: Build & Test Locally

- [ ] **Step 1: Run npm build**

```bash
cd "/Users/viktorveverka/CLAUDE PROJECTS/thesafari/crm"
npm run build
```

Expected: Build succeeds with no TypeScript errors.

- [ ] **Step 2: Fix any build errors**

TypeScript errors from renamed types, missing imports, wrong paths. Fix iteratively until build passes.

- [ ] **Step 3: Commit build fix**

```bash
git add -A && git commit -m "fix: resolve build errors from domain/hosting split"
```

---

## Task 17: Deploy & Verify

- [ ] **Step 1: Verify backup exists**

```bash
ssh root@sss06.vas-server.cz "ls -lh /root/backups/thesafari_crm_v1.2.2_pre_split_*.sql"
```

- [ ] **Step 2: Deploy to VPS**

```bash
cd "/Users/viktorveverka/CLAUDE PROJECTS/thesafari/crm"
npm run build

# Rsync
rsync -avz --include='app/***' --include='database/***' --include='resources/***' --include='routes/***' --include='config/***' --exclude='*' ./ root@sss06.vas-server.cz:/var/www/hq.thesafari.cz/
rsync -avz --delete public/build/ root@sss06.vas-server.cz:/var/www/hq.thesafari.cz/public/build/

# IMPORTANT: Delete old files that were renamed (rsync --include doesn't delete)
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && \
  rm -f app/Models/Website.php app/Models/WebsitePayment.php app/Models/WebsiteCredential.php && \
  rm -f app/Http/Controllers/WebsiteController.php app/Http/Controllers/WebsiteCredentialController.php && \
  rm -f app/Console/Commands/AutoInvoiceWebsites.php app/Console/Commands/CheckExpiringWebsites.php && \
  rm -rf resources/js/pages/WeboveSluzby/ resources/js/components/webove-sluzby/"

# Migrate
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && php artisan migrate --force"

# Clear and rebuild cache
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && \
  composer dump-autoload && \
  php artisan config:cache && \
  php artisan route:cache && \
  php artisan view:cache"
```

- [ ] **Step 3: Verify**

```bash
# Check pages load
curl -s -o /dev/null -w "%{http_code}" https://hq.thesafari.cz/domeny
curl -s -o /dev/null -w "%{http_code}" https://hq.thesafari.cz/hostingy
curl -s -o /dev/null -w "%{http_code}" https://hq.thesafari.cz/vps

# Check redirects
curl -s -o /dev/null -w "%{http_code}" -L https://hq.thesafari.cz/webove-sluzby

# Check data on VPS
ssh root@sss06.vas-server.cz "PGPASSWORD=1xzKZYd6J9EAUbSo psql -h 127.0.0.1 -U thesafari_crm -d thesafari_crm -c 'SELECT count(*) as hostings FROM hostings WHERE deleted_at IS NULL; SELECT count(*) as domains FROM domains WHERE deleted_at IS NULL;'"
```

Expected:
- `/domeny` → 200
- `/hostingy` → 200
- `/vps` → 200
- `/webove-sluzby` → 301 redirect to /hostingy
- Hostings count ~45, Domains count ~70+

- [ ] **Step 4: Manual verification in browser**

Open https://hq.thesafari.cz and check:
1. Sidebar shows Domény / Hostingy / VPS
2. Domény page lists all domains with correct expirations
3. Hostingy page lists all hostings with correct data
4. VPS page shows 3 servers
5. Hosting detail shows linked domains
6. Domain detail shows link to hosting
7. Dashboard stats are correct
8. Existing invoices are still visible
9. Test sync buttons (Wedos + vas-hosting + sss06)

- [ ] **Step 5: Update version to v1.3.0**

Update version display in admin footer (CompanySettings or wherever version is shown).

- [ ] **Step 6: Final commit + tag**

```bash
git add -A && git commit -m "chore: v1.3.0 — split Webové služby into Domény and Hostingy"
git tag v1.3.0
```

- [ ] **Step 7: Push to GitHub**

```bash
git push origin master --tags
```

---

## Rollback Plan

If something goes wrong:

```bash
# 1. Restore database
ssh root@sss06.vas-server.cz "PGPASSWORD=1xzKZYd6J9EAUbSo psql -h 127.0.0.1 -U thesafari_crm -d thesafari_crm < /root/backups/thesafari_crm_v1.2.2_pre_split_20260328.sql"

# 2. Checkout backup branch
git checkout backup/v1.2.2-pre-split

# 3. Build and redeploy
npm run build
# ... rsync as usual
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && composer dump-autoload && php artisan config:cache && php artisan route:cache && php artisan view:cache"
```
