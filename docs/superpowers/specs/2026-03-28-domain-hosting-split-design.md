# Specifikace: Rozdělení Webových služeb na Domény a Hostingy

**Datum**: 2026-03-28
**Verze CRM**: v1.2.2 → v1.3.0
**Stav**: Schváleno k implementaci

## Motivace

Aktuální sjednocený model `websites` míchá domény (registrace) a hostingy (serverové služby) v jedné tabulce. To zhoršuje přehlednost — u hostingového detailu se motají doménové údaje a naopak. Všechny konkurenční panely (WHMCS, Wedos, vas-hosting centrum) mají tyto služby oddělené.

Navíc CRM chybí 10 aktivních Wedos domén a 3 domény nemají expiraci — implementace Wedos API syncu to vyřeší.

## Přístup

**Approach 1: Rename `websites` → `hostings` + nová tabulka `domains`**

- Stávající tabulka se přejmenuje — data zůstanou na místě, IDs se nezmění
- Doménové údaje se extrahují do nové tabulky `domains`
- Aliasy se zjednoduší — místo self-reference budou prostě další domény na stejném hostingu
- Sidebar se rozdělí: Domény / Hostingy / VPS (každá vlastní stránka)

## Záloha (PŘED jakoukoli změnou)

1. Git tag `v1.2.2-pre-domain-hosting-split` na aktuální stav
2. `pg_dump thesafari_crm > /root/backups/thesafari_crm_v1.2.2_pre_split.sql` na VPS
3. Git branch `backup/v1.2.2-pre-split` z aktuálního master

---

## 1. Databázové schéma

### 1.1 Rename `websites` → `hostings`

Sloupce které **zůstanou** (s rename):

| Starý sloupec | Nový sloupec | Poznámka |
|---|---|---|
| `id` | `id` | PK beze změny — zachová FK na invoices, payments, credentials |
| `customer_id` | `customer_id` | FK → customers |
| `name` | `name` | Display název (primární doména) |
| `server` | `server` | Textový label (sss06, ond08...) |
| `status` | `status` | CHECK: aktivni/pozastaveno/zruseno |
| `notes` | `notes` | |
| `starts_at` | `starts_at` | |
| `auto_invoice` | `auto_invoice` | Řídí auto-fakturaci hostingu |
| `is_free` | `is_free` | Zdarma hosting |
| `is_external` | `is_external` | Cizí web (jen evidovaný) |
| `ip_address` | `ip_address` | |
| `storage_quota_mb` | `storage_quota_mb` | NOT NULL, default 0 |
| `storage_used_mb` | `storage_used_mb` | NOT NULL, default 0 |
| `synced_at` | `synced_at` | |
| `hosting_sell_yearly` | `sell_yearly` | Rename — už není split |
| `hosting_cost_yearly` | `cost_yearly` | Rename |
| `hosting_expires_at` | `expires_at` | Rename |
| `hosting_server_id` | `server_id` | Rename FK → vps_servers |
| `admin_url` | `admin_url` | |
| `alerts_ignored_at` | `alerts_ignored_at` | |
| `last_expiry_notified_at` | `last_expiry_notified_at` | |
| `management_plan_id` | `management_plan_id` | FK → management_plans |
| `management_cycle` | `management_cycle` | quarterly/semi_annual/annual |
| `auto_invoice_management` | `auto_invoice_management` | |
| `deleted_at` | `deleted_at` | Soft delete |
| `created_at/updated_at` | beze změny | |

Sloupce které se **odstraní** z hostings:

| Sloupec | Důvod |
|---|---|
| `domain_expires_at` | → `domains.expires_at` |
| `domain_sell_yearly` | → `domains.sell_yearly` |
| `domain_cost_yearly` | → `domains.cost_yearly` |
| `is_registered_by_us` | → `domains.is_registered_by_us` |
| `sell_yearly` | Byl computed total (domain+hosting) — drop |
| `cost_yearly` | Byl computed total — drop |
| `alias_of_id` | Aliasy → domény s hosting_id |
| `auto_renew` | Nepoužíváno v logice — drop |

### 1.2 Nová tabulka `domains`

| Sloupec | Typ | Default | Nullable | Poznámka |
|---|---|---|---|---|
| `id` | BIGSERIAL | — | NO | PK |
| `customer_id` | BIGINT FK→customers | — | YES | Nullable (doména bez zákazníka) |
| `hosting_id` | BIGINT FK→hostings SET NULL | — | YES | Null = standalone doména bez hostingu |
| `name` | VARCHAR(255) UNIQUE | — | NO | Název domény |
| `registrar` | VARCHAR(20) | `'vas-hosting'` | NO | CHECK: vas-hosting, wedos, external |
| `expires_at` | DATE | — | YES | Expirace registrace |
| `is_registered_by_us` | BOOLEAN | false | NO | Doménu registrujeme/platíme my |
| `sell_yearly` | DECIMAL(10,2) | 0 | NO | Prodejní cena |
| `cost_yearly` | DECIMAL(10,2) | 0 | NO | Nákladová cena |
| `auto_invoice` | BOOLEAN | true | NO | Auto-fakturace domény |
| `ip_address` | VARCHAR(45) | — | YES | |
| `dns_servers` | JSONB | — | YES | DNS servery z Wedos/vas-hosting API |
| `owner_name` | VARCHAR(255) | — | YES | Vlastník domény (z Wedos API) |
| `setup_date` | DATE | — | YES | Datum registrace (z Wedos API) |
| `synced_at` | TIMESTAMPTZ | — | YES | Poslední sync |
| `status` | VARCHAR(20) | `'aktivni'` | NO | CHECK: aktivni/pozastaveno/zruseno |
| `notes` | TEXT | — | YES | |
| `deleted_at` | TIMESTAMPTZ | — | YES | Soft delete |
| `created_at/updated_at` | TIMESTAMPTZ | — | — | |

Indexy: `customer_id`, `hosting_id`, `registrar`, `status`, `expires_at`.

### 1.3 Rename přidružených tabulek

| Stará tabulka | Nová tabulka | Změna FK |
|---|---|---|
| `website_payments` | `hosting_payments` | `website_id` → `hosting_id` |
| `website_credentials` | `hosting_credentials` | `website_id` → `hosting_id` |
| `invoice_website` | `invoice_hosting` | `website_id` → `hosting_id` |

### 1.4 Nový pivot `invoice_domain`

| Sloupec | Typ | Poznámka |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `invoice_id` | BIGINT FK→invoices CASCADE | |
| `domain_id` | BIGINT FK→domains RESTRICT | |
| `created_at` | TIMESTAMPTZ | Bez `updated_at` (stejný pattern jako invoice_hosting) |

Unique constraint: `(invoice_id, domain_id)`

### 1.5 Alias model — zjednodušení

**Staré**: `alias_of_id` na `websites` tabulce (self-referential). Alias = plný website záznam.

**Nové**: Více domén s `hosting_id` na stejný hosting. Primární doména = ta kde `domain.name = hosting.name`. Ostatní = aliasy. Žádný speciální `alias_of_id` sloupec.

Příklad:
```
hosting: americkyauta.cz (server sss06, sell_yearly 2050)
  ├─ domain: americkyauta.cz (hosting_id=137, sell 300, cost 223, registered=true)
  └─ domain: dovoz-americkych-aut.cz (hosting_id=137, sell 300, cost 223, registered=true)
```

---

## 2. Modely & Vztahy

### 2.1 Model `Hosting` (rename z Website)

```php
class Hosting extends Model
{
    // Relationships
    public function customer(): BelongsTo → Customer
    public function domains(): HasMany → Domain (hosting_id)
    public function primaryDomain(): HasOne → Domain (where name = this.name)
    public function payments(): HasMany → HostingPayment
    public function credentials(): HasMany → HostingCredential
    public function emailAccounts(): HasMany → EmailAccount
    public function server(): BelongsTo → VpsServer (server_id)
    public function managementPlan(): BelongsTo → ManagementPlan
    public function invoices(): BelongsToMany → Invoice (pivot: invoice_hosting)

    // Scopes
    public function scopeActive($query)
    public function scopeExpiringSoon($query, int $days = 30)

    // Helpers
    public function daysUntilExpiry(): ?int
    public function expiryUrgency(): string
    public function totalSellYearly(): float // hosting + sum(domains.sell_yearly)
    public function totalCostYearly(): float
    public function monthlyRevenue(): float
    public function hasOpenInvoice(): bool
}
```

### 2.2 Model `Domain` (nový)

```php
class Domain extends Model
{
    use SoftDeletes, LogsActivity;

    protected $fillable = [
        'customer_id', 'hosting_id', 'name', 'registrar',
        'expires_at', 'is_registered_by_us', 'sell_yearly', 'cost_yearly',
        'auto_invoice', 'ip_address', 'dns_servers', 'owner_name',
        'setup_date', 'synced_at', 'status', 'notes',
    ];

    protected $casts = [
        'expires_at' => 'date',
        'setup_date' => 'date',
        'synced_at' => 'datetime',
        'is_registered_by_us' => 'boolean',
        'auto_invoice' => 'boolean',
        'sell_yearly' => 'decimal:2',
        'cost_yearly' => 'decimal:2',
        'dns_servers' => 'array',
    ];

    // Relationships
    public function customer(): BelongsTo → Customer
    public function hosting(): BelongsTo → Hosting
    public function invoices(): BelongsToMany → Invoice (pivot: invoice_domain)

    // Scopes
    public function scopeActive($query)
    public function scopeExpiringSoon($query, int $days = 30)
    public function scopeRegisteredByUs($query) // where is_registered_by_us = true
    public function scopeStandalone($query) // whereNull('hosting_id')

    // Helpers
    public function daysUntilExpiry(): ?int
    public function expiryUrgency(): string
    public function isAlias(): bool // hosting_id is set AND name != hosting.name
    public function isPrimary(): bool // hosting_id is set AND name == hosting.name
    public function isStandalone(): bool // hosting_id is null
    public function hasOpenInvoice(): bool
}
```

### 2.3 Rename modelů

| Starý model | Nový model |
|---|---|
| `Website` | `Hosting` |
| `WebsitePayment` | `HostingPayment` |
| `WebsiteCredential` | `HostingCredential` |
| `SyncBlacklist` | beze změny |
| `SyncPending` | beze změny (přidat `type` pole: domain/hosting) |
| `VpsServer` | beze změny |
| `ManagementPlan` | beze změny |

---

## 3. Routes & Controllers

### 3.1 Nová route struktura

**Domény** (`/domeny`):
```
GET    /domeny                          → DomainController@index
GET    /domeny/vytvorit                 → DomainController@create
POST   /domeny                          → DomainController@store
GET    /domeny/{domain}                 → DomainController@show
GET    /domeny/{domain}/upravit         → DomainController@edit
PUT    /domeny/{domain}                 → DomainController@update
DELETE /domeny/{domain}                 → DomainController@destroy
POST   /domeny/sync-vashosting          → DomainController@syncVasHosting
POST   /domeny/sync-wedos               → DomainController@syncWedos
POST   /domeny/{domain}/faktura         → DomainController@createInvoice
POST   /domeny/ke-schvaleni/approve     → DomainController@approvePending
POST   /domeny/ke-schvaleni/ignore      → DomainController@ignorePending
```

**Hostingy** (`/hostingy`):
```
GET    /hostingy                        → HostingController@index
GET    /hostingy/vytvorit               → HostingController@create
POST   /hostingy                        → HostingController@store
GET    /hostingy/{hosting}              → HostingController@show
GET    /hostingy/{hosting}/upravit      → HostingController@edit
PUT    /hostingy/{hosting}              → HostingController@update
DELETE /hostingy/{hosting}              → HostingController@destroy
POST   /hostingy/sync-sss06             → HostingController@syncSss06
POST   /hostingy/sync-ond08             → HostingController@syncOnd08
POST   /hostingy/sync-thaimassage       → HostingController@syncThaimassage
POST   /hostingy/bulk-update            → HostingController@bulkUpdate
POST   /hostingy/activate-domain        → HostingController@activateDomain
POST   /hostingy/{hosting}/faktura      → HostingController@createInvoice
POST   /hostingy/faktura-zakaznik/{c}   → HostingController@createCustomerInvoice
POST   /hostingy/{hosting}/toggle-ignore → HostingController@toggleIgnoreAlerts
POST   /hostingy/{hosting}/credentials  → HostingCredentialController@store
PUT    /hostingy/credentials/{cred}     → HostingCredentialController@update
DELETE /hostingy/credentials/{cred}     → HostingCredentialController@destroy
POST   /hostingy/{hosting}/emaily       → EmailAccountController@store
```

**VPS** (`/vps`):
```
GET    /vps                             → VpsServerController@index
POST   /vps                             → VpsServerController@store
PUT    /vps/{vps}                       → VpsServerController@update
DELETE /vps/{vps}                       → VpsServerController@destroy
POST   /vps/sync                        → VpsServerController@syncFromHostings
```

**Legacy redirecty**:
```
GET /webove-sluzby/{any?}   → 301 /hostingy/{any}
GET /neniweb/{any?}         → 301 /hostingy/{any}
```

### 3.2 DomainController (nový)

**index()**: Seznam domén s filtry:
- Registrátor (vas-hosting / wedos / external)
- Status (aktivni / pozastaveno / zruseno)
- Expirace (expiruje brzy / po expiraci / aktivní)
- Hosting (s hostingem / standalone)
- Zákazník
- Auto-fakturace

Stats bar: Celkem domén, Expiruje do 30 dní, Po expiraci, Standalone (bez hostingu)

**show()**: Detail domény:
- Registrátor, expirace, vlastník (z Wedos API)
- DNS servery
- Cena (prodej/náklad/marže)
- Link na hosting (pokud existuje)
- Faktury navázané na tuto doménu
- Poslední sync

**syncVasHosting()**: Sync z Portal API (`portal.vas-hosting.cz`):
- `GET /domains` → pro každou doménu kde `isRegisteredByUs=true`:
  - Existuje v DB? → update expiration, ip_address
  - Neexistuje? → `sync_pending` s `type=domain`

**syncWedos()**: Sync z Wedos WAPI:
- `domains-list` → pro každou aktivní doménu:
  - Existuje v DB? → update expiration
  - Neexistuje? → `sync_pending` s `type=domain`
- Pro existující: `domain-info` (batch) → update owner_name, dns_servers, setup_date

### 3.3 HostingController (rename z WebsiteController)

Většina logiky zůstává — jen se odstraní doménové části:
- `store()`/`update()`: Už nepřijímá `domain_*` pole. Jen hosting ceny.
- `createInvoice()`: Hosting položka z `hosting.sell_yearly`. Doménové položky z `hosting->domains()->where('is_registered_by_us', true)`.
- `createCustomerInvoice()`: Stejná logika, ale agreguje přes všechny hostingy zákazníka.
- `sync*()` metody: Oddělené per server (sss06, ond08, thaimassage).

### 3.4 Fakturace — zachování a evoluce

**Existující faktury**: `invoice_website` → `invoice_hosting` (rename). Všechny FK zůstanou platné protože hosting.id = starý website.id.

**Nové faktury hostingu** generují položky:
1. "Hosting {name}" → `hosting.sell_yearly` (pokud > 0)
2. "Doména {domain.name}" → pro každý `hosting->domains()->registeredByUs()->where('sell_yearly', '>', 0)`

**Nové faktury domén** (standalone, bez hostingu):
- "Doména {domain.name} ({period})" → `domain.sell_yearly`
- Pivot `invoice_domain`

**Auto-invoice commands**:
- `hostings:auto-invoice` — expirující hostingy (30 dní) + domény linknuté na ně
- `domains:auto-invoice` — expirující standalone domény (30 dní, bez hosting_id)

---

## 4. Frontend

### 4.1 Sidebar navigace

```typescript
// Collapsible "Webové služby" group
{
  label: 'Webové služby',
  icon: Globe,
  children: [
    { label: 'Domény', href: '/domeny', icon: AtSign },
    { label: 'Hostingy', href: '/hostingy', icon: Server },
    { label: 'VPS', href: '/vps', icon: HardDrive },
  ]
}
```

### 4.2 Stránky Domény

**Index** (`/domeny`):
- Stats bar: Celkem | Vas-hosting | Wedos | External | Expiruje brzy | Standalone
- Tabulka s sloupci: Název, Zákazník, Registrátor (badge), Expirace (ExpirationBadge), Hosting (link nebo "—"), Cena/rok, FA, Stav
- Sync tlačítka: "Sync vas-hosting" + "Sync Wedos"
- Tab "Ke schválení" (pending domains)
- Filtry: registrátor, zákazník, stav, expirace, s/bez hostingu

**Show** (`/domeny/{id}`):
- Header: název + registrátor badge + status
- Karta "Registrace": registrátor, expirace, vlastník, DNS servery, IP, setup_date
- Karta "Cena": prodej/náklad/marže
- Link na hosting (pokud `hosting_id` existuje)
- Faktury (z pivot invoice_domain)
- Poslední sync

**Create/Edit**: Formulář s poli: název, zákazník, registrátor (select), expirace, is_registered_by_us, ceny, hosting (select), auto_invoice, poznámky

### 4.3 Stránky Hostingy

**Index** (`/hostingy`):
- Stats bar: Celkem hostingů | Domén na hostinzích | Expiruje brzy | MRR/ARR
- Tabulka: Název, Zákazník, Server, Expirace (ExpirationBadge), Úložiště (progress), Domény (count badge), Cena/rok, Správa, FA, Stav
- Sync tlačítka: "Sync sss06" + "Sync ond08" + "Sync thaimassage"
- Tab "Platby" (hosting_payments)

**Show** (`/hostingy/{id}`):
- 4 taby (místo 5 — tab "Doména" odstraněn):
  1. **Přehled**: Server info + storage + cena + domény linknuté (s linky na /domeny/{id}) + platby + faktury + poznámky + auto-invoice toggles
  2. **Správa**: Management plan, cyklus, auto-invoice správy
  3. **Přístupy**: Credentials CRUD + Email accounts CRUD (beze změny)
  4. **Platby & Faktury**: Platební historie + navázané faktury (přesunuto z přehledu pro přehlednost)

**Create/Edit**: Formulář BEZ doménových polí. Jen: název, zákazník, server (VPS select), expirace, storage kvóta, ceny (sell/cost hosting), admin URL, management plan, is_free, is_external, poznámky.

### 4.4 Stránky VPS

**Index** (`/vps`):
- Tabulka: Název + IP, Zákazník, Cena/rok, Hostingů (count), Úložiště, Stav, Akce
- Sync tlačítko
- GlassModal pro Create/Edit (jako dosud)

### 4.5 Dashboard widgety — úpravy

- `WebsiteOverview` → rozdělit na `DomainOverview` + `HostingOverview` nebo unified "Webové služby" widget s taby
- MRR výpočet: `hosting.sell_yearly` + `domains.sell_yearly` (kde is_registered_by_us) + management plans
- Attention alerts: oddělené alerty pro domény (expirace registrace) vs hostingy (expirace hostingu)

### 4.6 CustomerServices — úpravy

Na kartě zákazníka: zobrazit "Hostingy" (s linky) + "Domény" (s linky) odděleně.

---

## 5. Sync — nový WedosService

### 5.1 `WedosService` (nový)

```php
class WedosService
{
    private string $apiUrl = 'https://api.wedos.com/wapi/json';
    private string $login;  // z env WEDOS_WAPI_LOGIN
    private string $password; // z env WEDOS_WAPI_PASSWORD

    private function getAuth(): string
    // sha1(login + sha1(password) + current_hour_prague)

    public function listDomains(): array
    // POST domains-list → [{name, status, expiration}]

    public function getDomainInfo(string|array $names): array
    // POST domain-info (comma-separated names, max 10 per request)
    // → [{name, status, expiration, setup_date, dns, owner_name, nsset, keyset}]

    public function checkAvailability(string $name): string
    // POST domain-check → available/registered/quarantined/reserved/blocked
}
```

### 5.2 Env proměnné (nové)

```
WEDOS_WAPI_LOGIN=veverka.viktor@gmail.com
WEDOS_WAPI_PASSWORD=}XT7i0b6
```

### 5.3 VasHostingService — refactor

Rozdělit na metody per concern:
- `syncPortalDomains()` → aktualizuje `domains` tabulku (expirace, IP, is_registered_by_us)
- `syncServerHostings(string $server)` → aktualizuje `hostings` tabulku (storage, expirace)
- `syncVpsCentrumHostings(string $serverName)` → aktualizuje `hostings` pro ond08/thaimassage
- `activateDomainOnServer()` → zůstane

---

## 6. Migrace dat — detailní postup

### 6.1 Atomická migrace (jedna Laravel migration)

```
2026_03_XX_000001_split_websites_to_domains_and_hostings.php
```

**Kroky v DB::transaction:**

1. Rename tabulky `websites` → `hostings`
2. Rename sloupce v `hostings`:
   - `hosting_sell_yearly` → `sell_yearly`
   - `hosting_cost_yearly` → `cost_yearly`
   - `hosting_expires_at` → `expires_at`
   - `hosting_server_id` → `server_id`
3. Rename `website_payments` → `hosting_payments`, FK `website_id` → `hosting_id`
4. Rename `website_credentials` → `hosting_credentials`, FK `website_id` → `hosting_id`
5. Rename `invoice_website` → `invoice_hosting`, FK `website_id` → `hosting_id`
6. Create tabulka `domains`
7. Create pivot `invoice_domain`
8. **Extrakce domén z hostingů**:
   - Pro KAŽDÝ hosting kde `domain_expires_at IS NOT NULL` NEBO `is_registered_by_us = true` NEBO `alias_of_id IS NOT NULL`:
     - INSERT do `domains`: customer_id, hosting_id (= hosting.id pokud není alias, jinak = alias_of_id), name, registrar (určit z Wedos porovnání), expires_at (z domain_expires_at), is_registered_by_us, sell_yearly (z domain_sell_yearly), cost_yearly (z domain_cost_yearly), auto_invoice (z hosting.auto_invoice), ip_address, status, synced_at
9. **Konverze aliasů**:
   - Pro záznamy kde `alias_of_id IS NOT NULL`:
     - Doména už vytvořena v kroku 8 s `hosting_id = alias_of_id` (parent hosting)
     - Hosting záznam aliasu: pokud má vlastní hosting data (server, storage > 0) → ponechat jako hosting
     - Pokud nemá hosting data (jen doména) → soft delete hosting záznamu
10. Drop sloupce z `hostings`: `domain_expires_at`, `domain_sell_yearly`, `domain_cost_yearly`, `is_registered_by_us`, `sell_yearly` (computed), `cost_yearly` (computed), `alias_of_id`, `auto_renew`
11. Přidat `type` sloupec do `sync_pending`: VARCHAR(20) CHECK domain/hosting, default 'domain'
12. Update `activity_log`: `subject_type` 'App\\Models\\Website' → 'App\\Models\\Hosting'

### 6.2 Wedos domény — registrar mapping

Na základě porovnání API dat, tyto domény dostanou `registrar = 'wedos'`:

```
alfabrno.cz, alfabrno.eu, apartmannapalave.cz, apartmanpavlov.cz,
bigfoodpoint.cz, bonamirestaurant.cz, brunchcafe.cz, drevotech.cz,
drevotech.eu, expresnijadrovevrtani.cz, face-promotion.cz,
jadrovevrtani-brno.cz, lumidis.cz, miliana-medium.cz, mrgelato.cz,
nolimitkebab.cz, prepravaletiste.cz, rucni-myti-aut-brno.cz,
smstylegarage.cz, topmyti.cz, viktorveverka.cz, zkclean.cz, zkelektro.cz
```

Domény s `isRegisteredByUs=true` z vas-hosting Portal API → `registrar = 'vas-hosting'`.
Ostatní → `registrar = 'external'`.

### 6.3 Chybějící domény — doplnění

10 Wedos domén chybí v CRM. Migrace je vytvoří jako standalone domény (hosting_id = NULL):

| Doména | Expirace | Registrar |
|---|---|---|
| apartmannapalave.cz | 2027-03-01 | wedos |
| brunchcafe.cz | 2026-06-24 | wedos |
| drevotech.cz | 2026-06-14 | wedos |
| drevotech.eu | 2026-06-14 | wedos |
| lumidis.cz | 2026-11-02 | wedos |
| miliana-medium.cz | 2026-06-10 | wedos |
| rucni-myti-aut-brno.cz | 2026-05-26 | wedos |
| viktorveverka.cz | 2026-04-06 | wedos |
| zkclean.cz | 2026-06-13 | wedos |
| zkelektro.cz | 2027-02-06 | wedos |

3 domény s chybějící expirací dostanou expiraci z Wedos API:
- apartmanpavlov.cz → 2027-03-01
- bigfoodpoint.cz → 2027-01-13
- face-promotion.cz → 2027-03-16

---

## 7. Cron příkazy

| Starý příkaz | Nový příkaz | Změna |
|---|---|---|
| `websites:auto-invoice` | `hostings:auto-invoice` | Hosting fakturace + domény linknuté na hosting |
| — (nový) | `domains:auto-invoice` | Standalone domény (bez hosting_id) |
| `websites:check-expiring` | `hostings:check-expiring` | Hosting expirace |
| — (nový) | `domains:check-expiring` | Doménové expirace |

---

## 8. MRR/ARR výpočty

```
Hosting MRR = SUM(hostings.sell_yearly WHERE active, !free, !external) / 12
Domain MRR  = SUM(domains.sell_yearly WHERE active, is_registered_by_us) / 12
Mgmt MRR    = SUM(management_plans.price_monthly WHERE hosting.active)
VPS MRR     = SUM(vps_servers.price_yearly WHERE active) / 12
────────────
Total MRR   = Hosting + Domain + Mgmt + VPS
Total ARR   = Total MRR × 12
```

Důležité: Domény linknuté na hosting se počítají v Domain MRR (ne v Hosting MRR). Žádné dvojité počítání.

---

## 9. Rizika a mitigace

| Riziko | Mitigace |
|---|---|
| Ztráta dat při migraci | pg_dump + git tag + backup branch PŘED migrací |
| Rozbité faktury | invoice_hosting.hosting_id = starý website_id — IDs se nemění |
| Activity log references | UPDATE subject_type v activity_log |
| Wedos API rate limit | domain-info max 10 per request, domains-list bez limitu |
| Wedos auth hour change | Auth hash závisí na hodině — test v různou dobu |
| Alias konverze edge cases | Aliasy s vlastním hostingem (storage > 0) → zachovat jako hosting + doména |

---

## 10. Verze a deploy

- **Verze**: v1.2.2 → **v1.3.0** (breaking change v DB schema)
- **Deploy postup**:
  1. Záloha (pg_dump + git tag)
  2. Build lokálně
  3. Rsync na VPS
  4. `php artisan migrate --force` (atomická migrace)
  5. `php artisan config:cache && route:cache && view:cache`
  6. Ověření: otevřít /hostingy, /domeny, zkontrolovat data
  7. Rollback plán: `psql < backup.sql` + git checkout backup branch + redeploy

---

## Aktuální data — shrnutí

| Metrika | Hodnota |
|---|---|
| Celkem websites v CRM | 56 (z toho 11 aliasů) |
| → Bude hostingů | ~45 (po odfiltrování domain-only) |
| → Bude domén | ~70+ (extrakce + Wedos + vas-hosting) |
| Vas-hosting Portal | 83 domén (35 registered) |
| Wedos | 23 aktivních domén |
| Chybí v CRM | 10 Wedos domén (6 expiruje brzy!) |
| Existující faktury | Zachovány (rename pivot) |
| VPS servery | 3 (sss06, ond08, thaimassage) — beze změny |
