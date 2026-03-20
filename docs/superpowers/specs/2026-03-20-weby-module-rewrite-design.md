# Design Spec — Modul "Webové služby" (Weby) — Přepis

**Datum:** 2026-03-20
**Verze CRM:** v1.1.0
**Záloha:** `backup/v1.1.0-pre-weby-rewrite` (tag + branch)
**Přístup:** C — Backend atomický rename + frontend ve druhé fázi

---

## 1. Motivace

Aktuální modul "Webové služby" (interně `subscriptions`) má 57 sloupců v jedné tabulce, 3 taby (Domény/Hostingy/Služby), nepřehlednou strukturu a těžkou udržitelnost. Nový modul "Weby" sjednotí vše do jednoho seznamu — jeden web = jedna karta se vším (hosting, doména, emaily, credentials, fakturace).

## 2. Scope

### V scope (Fáze 1 + 2)
- Rename `subscriptions` → `websites` + všechny FK
- Nové DB schema (dvě expirace, hosting_server_id, alias_of_id, management_plan)
- Dynamické credentials (neomezený počet přístupů per web)
- Balíčky správy jako editovatelný seznam v Nastavení
- Sync blacklist + "Ke schválení" stránka
- Přepojení všech 43 závislých souborů (dashboard, finance, faktury, search, kalendář, notifikace, commands)
- Nový frontend: jeden seznam + filtry, VPS tab, blacklist tab
- 301 redirect `/neniweb*` → `/webove-sluzby*`

### Mimo scope (budoucí roundy)
- Auto-fakturace správy (management plans)
- Automatický cron sync (zatím jen manuální tlačítko)
- Sjednocování expirací (automatické)
- Multi-user / role-based přístupy

### TODO pro uživatele
- Po implementaci: vysvětlit fakturační logiku na reálném příkladu

## 3. Architektura

### Princip
Každý záznam v `websites` = flexibilní jednotka. Může být:
- **Web** (doména + hosting + fakturace)
- **Jen doména** (hosting_server_id = NULL)
- **Alias** (alias_of_id ukazuje na parent web)
- **VPS hosting** (sell_yearly = 0, VPS se fakturuje přes VpsServer)

### Datové zdroje pro sync
| Zdroj | URL | Auth | Co vrací |
|-------|-----|------|----------|
| Portal API | portal.vas-hosting.cz/api/v1/domains | X-API-Key | Domény: expirace, is_registered_by_us, IP |
| Server REST (sss06) | sss06.vas-server.cz/vpsc/api/v1/domains | X-API-Key | Hostingy: storage |
| VPS Centrum (ond08) | ond08.vas-server.cz/admin/api/v1/api.php | X-VPSC-Admin + X-VPSC-ApiKey, POST | Hostingy: expirace |
| VPS Centrum (thaimassage) | thaimassage-server.cz/admin/api/v1/api.php | X-VPSC-Admin + X-VPSC-ApiKey, POST | Hostingy: expirace |

### Fakturace — dvě nezávislé linie
1. **Hosting + doména** (`sell_yearly`, cyklus roční, toggle `auto_invoice`)
2. **Správa** (`management_plan_id` → cena z `management_plans`, cyklus `management_cycle`, toggle `auto_invoice_management`)

### Fakturace podle registrátora
| Situace | Co se fakturuje | Při zaplacení |
|---------|----------------|---------------|
| Moje registrace (is_registered_by_us=true) | hosting + doména | prodlouží hosting_expires_at + domain_expires_at |
| Cizí registrátor (is_registered_by_us=false) | jen hosting | prodlouží jen hosting_expires_at |
| Alias (alias_of_id != NULL) | dle nastavení (default nic) | dle nastavení |
| VPS hosting (sell_yearly=0) | nic, VPS přes VpsServer | nic |

### Expirace
- `domain_expires_at` — z Portal API (moje registrace), nebo ruční (cizí registrátor vrací NULL)
- `hosting_expires_at` — z VPS Centrum API
- Sjednocení: prvotně ručně, ±3 dny = sjednocené, automatizace později

## 4. DB Schema

### Tabulka `websites` (rename z `subscriptions`)

**Zachované sloupce:**
```
id, customer_id, name, server, status, notes, starts_at,
is_registered_by_us, ip_address, storage_quota_mb, storage_used_mb,
synced_at, auto_renew, auto_invoice, is_free, is_external,
sell_yearly, cost_yearly, alerts_ignored_at, admin_url,
created_at, updated_at, deleted_at
```

> **Poznámka:** `starts_at` zachován pro historický kontext (kdy web začal být spravován).

**Nové sloupce:**
```
domain_expires_at      TIMESTAMP NULL     -- expirace domény
hosting_expires_at     TIMESTAMP NULL     -- expirace hostingu
hosting_server_id      BIGINT NULL FK → vps_servers
alias_of_id            BIGINT NULL FK → websites (self-ref)
management_plan_id     BIGINT NULL FK → management_plans
management_cycle       VARCHAR NULL CHECK (quarterly, semi_annual, annual)
auto_invoice_management BOOLEAN DEFAULT false
```

**Odstraněné sloupce:**
```
type, provider, price_yearly, billing_cycle, monthly_price,
monthly_plan, portal_domain_id, vas_hosting_id, tariff,
managed_since, expires_at,
parent_subscription_id, vps_server_id,
admin_user, admin_password, client_user, client_password,
folder_id
```

> **Poznámka:** `customer_notified_at` ZACHOVÁN — přejmenovat na `last_expiry_notified_at`. Používá ho `CheckExpiringWebsites` command pro deduplikaci notifikací.

### Tabulka `website_credentials` (nová)

```sql
CREATE TABLE website_credentials (
    id BIGSERIAL PRIMARY KEY,
    website_id BIGINT NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    label VARCHAR(255) NOT NULL,        -- "Admin WP", "FTP", "DB", ...
    login VARCHAR(255),
    password TEXT,                        -- encrypted via Laravel cast
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
CREATE INDEX idx_website_credentials_website_id ON website_credentials(website_id);
```

### Tabulka `management_plans` (nová)

```sql
CREATE TABLE management_plans (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,          -- "Klidný spánek"
    price_monthly INTEGER NOT NULL DEFAULT 0, -- v CZK
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

**Seed:**
| name | price_monthly |
|------|--------------|
| Bez správy | 0 |
| Základ | 490 |
| Klidný spánek | 1490 |
| Aktivní rozvoj | 2990 |
| VIP péče | 5990 |

### Tabulka `sync_blacklist` (nová)

```sql
CREATE TABLE sync_blacklist (
    id BIGSERIAL PRIMARY KEY,
    domain_name VARCHAR(255) NOT NULL UNIQUE,
    reason VARCHAR(20) NOT NULL CHECK (reason IN ('lukas', 'deleted', 'manual')),
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Seed:** 33 domén (Lukášovy + synwase.cz + dtftransferytisk.cz + alfabrno.eu), reason: lukas.

### Tabulka `sync_pending` (nová)

```sql
CREATE TABLE sync_pending (
    id BIGSERIAL PRIMARY KEY,
    domain_name VARCHAR(255) NOT NULL UNIQUE,
    source VARCHAR(20) NOT NULL CHECK (source IN ('portal', 'sss06', 'ond08', 'thaimassage')),
    discovered_at TIMESTAMP DEFAULT NOW()
);
```

### Rename existujících tabulek

| Stará | Nová | FK změna |
|-------|------|----------|
| subscription_payments | website_payments | subscription_id → website_id |
| invoice_subscription | invoice_website | subscription_id → website_id |
| email_accounts | email_accounts (beze změny) | subscription_id → website_id |
| subscription_folders | **SMAZAT** | — |

### Pivot `invoice_website` — rozšíření

```sql
ALTER TABLE invoice_website ADD COLUMN invoice_type VARCHAR(20) DEFAULT 'hosting'
    CHECK (invoice_type IN ('hosting', 'management'));
```

### `vps_servers` — beze změn

## 5. Sync + Blacklist logika

### Sync flow (command `websites:sync`, manuální spouštění)

```
1. Načti blacklist z sync_blacklist (Set domain_name)
2. Portal API → pro každou doménu:
   - V blacklistu? → skip
   - Existuje v websites (match by name)? → update domain_expires_at, is_registered_by_us, ip_address, synced_at
   - Neexistuje? → INSERT do sync_pending (source: portal)
3. sss06 REST API → pro každý hosting:
   - V blacklistu? → skip
   - Existuje v websites? → update hosting_expires_at (NULL — sss06 nemá), storage_used_mb, storage_quota_mb, hosting_server_id
   - Neexistuje? → INSERT do sync_pending (source: sss06)
4. ond08 VPS Centrum API → pro každý hosting:
   - V blacklistu? → skip
   - Existuje? → update hosting_expires_at, hosting_server_id
   - Neexistuje? → INSERT do sync_pending (source: ond08)
5. thaimassage VPS Centrum API → stejné jako bod 4
6. Vrátit počty: updated, pending, skipped
```

### Blacklist pravidla

| Trigger | Akce |
|---------|------|
| Force delete webu z koše | → auto INSERT do sync_blacklist (reason: deleted) |
| "Ignorovat" na Ke schválení | → INSERT sync_blacklist (reason: manual), DELETE sync_pending |
| Seed migrace | → 35 Lukášových domén (reason: lukas) |
| Odebrání z blacklistu v Nastavení | → DELETE ze sync_blacklist, příští sync znovu nabídne |

### Párování domén ↔ hostingů

Automatické: Portal vrátí "goldsgym.cz", VPS Centrum vrátí hosting "goldsgym.cz" → **stejný název = stejný website záznam**. Sync aktualizuje příslušná pole na tom samém záznamu.

## 6. Invoice::processPayment() — přepis

```php
// Aktuální logika (zjednodušeně):
foreach ($this->subscriptions as $subscription) {
    $subscription->payments()->create([
        'amount' => (float) $subscription->sell_yearly ?: (float) $subscription->price_yearly,
        'period_start' => $subscription->expires_at,
        'period_end' => $subscription->expires_at?->addYear(),
        'status' => 'zaplaceno',
        'paid_at' => now(),
        'invoice_id' => $this->id,
    ]);
    if ($subscription->type === 'hosting') {
        $subscription->expires_at = $subscription->expires_at->addYear();
    }
}

// Nová logika:
foreach ($this->websites as $website) {
    $pivotType = $website->pivot->invoice_type;
    $amount = (float) $website->sell_yearly ?: (float) $website->cost_yearly;
    $website->payments()->create([
        'amount' => $amount,
        'period_start' => $website->hosting_expires_at ?? now(),
        'period_end' => ($website->hosting_expires_at ?? now())->copy()->addYear(),
        'status' => 'zaplaceno',
        'paid_at' => now(),
        'invoice_id' => $this->id,
        'payment_method' => $paymentMethod,
    ]);
    if ($pivotType === 'hosting') {
        $website->hosting_expires_at = $website->hosting_expires_at?->addYear() ?? now()->addYear();
        if ($website->is_registered_by_us) {
            $website->domain_expires_at = $website->domain_expires_at?->addYear() ?? now()->addYear();
        }
        $website->save();
    }
    // management type: žádné prodloužení expirace
}
```

## 7. Auto-fakturace command (`websites:auto-invoice`)

```
Denně 07:00:
1. Najdi websites kde:
   - auto_invoice = true
   - hosting_expires_at <= now() + 30 dní
   - alias_of_id IS NULL
   - sell_yearly > 0
   - nemá otevřenou fakturu (check invoice_website + invoice.status)
2. Skupinuj per customer_id
3. Pro každého zákazníka:
   - Vytvoř Invoice (řada 6XXX)
   - Položky: "{web.name} — hosting+doména {období}"
   - Připoj přes invoice_website (invoice_type: hosting)
   - Cache::lock() pro mutex
4. Notifikace WebsiteInvoiceCreated
```

## 8. Frontend — Routes

```
GET    /webove-sluzby                         websites.index
GET    /webove-sluzby/{website}               websites.show
GET    /webove-sluzby/vytvorit                websites.create
POST   /webove-sluzby                         websites.store
GET    /webove-sluzby/{website}/upravit       websites.edit
PUT    /webove-sluzby/{website}               websites.update
DELETE /webove-sluzby/{website}               websites.destroy

POST   /webove-sluzby/sync                    websites.sync
POST   /webove-sluzby/bulk-update             websites.bulk-update
POST   /webove-sluzby/{website}/toggle-ignore websites.toggleIgnore

POST   /webove-sluzby/{website}/platby        websites.payments.store
PUT    /webove-sluzby/{website}/platby/{p}    websites.payments.paid
POST   /webove-sluzby/{website}/faktura       websites.invoice.create
POST   /webove-sluzby/faktura-zakaznik/{c}    websites.invoice.createCustomer

POST   /webove-sluzby/{website}/credentials   credentials.store
PUT    /webove-sluzby/credentials/{c}         credentials.update
DELETE /webove-sluzby/credentials/{c}         credentials.destroy

POST   /webove-sluzby/{website}/emaily        email-accounts.store
PUT    /webove-sluzby/emaily/{e}              email-accounts.update
DELETE /webove-sluzby/emaily/{e}              email-accounts.destroy

GET    /webove-sluzby/ke-schvaleni            websites.pending
POST   /webove-sluzby/ke-schvaleni/approve    websites.pending.approve
POST   /webove-sluzby/ke-schvaleni/ignore     websites.pending.ignore

POST   /webove-sluzby/vps/sync               vps.sync
POST   /webove-sluzby/vps                     vps.store
PUT    /webove-sluzby/vps/{vp}                vps.update
DELETE /webove-sluzby/vps/{vp}                vps.destroy
```

**301 redirecty:** `/neniweb*` → `/webove-sluzby*`, `/pozadavky` zůstává → `/zpravy`

**Route registration order:** Statické routy (`/sync`, `/bulk-update`, `/vytvorit`, `/ke-schvaleni`, `/vps/*`, `/faktura-zakaznik/*`) MUSÍ být registrovány PŘED `{website}` parametrizovanými routami. Jinak Laravel interpretuje "vytvorit" jako model binding ID. Existující pattern z routes/web.php (řádek 111).

## 9. Frontend — Stránky

### Index (jeden seznam + filtry)
- Hlavní view: všechny weby v jednom seznamu (DataTable)
- Aliasy vizuálně odsazené pod parent webem
- Filtry: zákazník, server, stav, balíček správy, expirace, is_registered_by_us
- Badge "Ke schválení (X)" v headeru
- Bulk akce: přiřadit zákazníka, nastavit balíček, smazat
- Tab "VPS servery" (přehled kapacity, obsazenost)
- Tab "Výjimky syncu" (blacklist s možností odebrat)

### Show (karta webu)
- Header: název, zákazník, stav, dvě expirace (doména + hosting)
- Info: server, storage, IP, is_registered_by_us, sell_yearly, balíček správy
- Sekce Credentials: dynamický seznam (label + login + heslo encrypted, eye+copy, přidat/edit/smazat)
- Sekce Emaily: jako dosud (email + heslo + kvóta)
- Sekce Platby: historie plateb
- Sekce Faktury: navázané faktury
- Tlačítka: Fakturovat, Fakturovat vše (per zákazník), Sync, Edit, Delete

### Create / Edit
- Formulář: název, zákazník (select), hosting_server (select z vps_servers), domain_expires_at, hosting_expires_at, sell_yearly, cost_yearly, management_plan (select), management_cycle (select), alias_of (select z websites), is_registered_by_us, auto_invoice, auto_invoice_management, is_external, is_free, auto_renew, admin_url, poznámky

### Ke schválení
- Seznam domain_name z sync_pending
- Per řádek: "Přidat" / "Ignorovat"
- Přidat → vytvoří Website (auto_invoice OFF, bez zákazníka), smaže z pending
- Ignorovat → přesune do blacklist, smaže z pending

### Nastavení — nové taby
- **Balíčky správy**: CRUD management_plans (název, cena, aktivní, řazení)
- **Výjimky syncu**: seznam blacklist (domain_name, reason, datum), tlačítko "Odebrat"

## 10. Přepojení závislostí (43 souborů)

### Backend (modely)
| Starý | Nový |
|-------|------|
| Subscription | Website |
| SubscriptionPayment | WebsitePayment |
| SubscriptionFolder | SMAZAT |
| EmailAccount.subscription_id | EmailAccount.website_id |
| Invoice->subscriptions() | Invoice->websites() |
| Customer->subscriptions() | Customer->websites() |
| VpsServer->subscriptions() | VpsServer->websites() (FK: `hosting_server_id`, ne starý `vps_server_id`) |

### Backend (controllery)
| Starý | Nový |
|-------|------|
| SubscriptionController | WebsiteController |
| FolderController | SMAZAT |
| DashboardController (6 metod) | přepojit na Website. **MRR kalkulace:** `sell_yearly / 12` (vždy roční, billing_cycle odpadá). Management plan MRR = `management_plans.price_monthly` (pokud přiřazeno). |
| FinanceController (6 metod) | přepojit na Website/WebsitePayment. **Stejná MRR logika.** |
| SearchController | kategorie "websites", link /webove-sluzby/{id} |
| CustomerController::show() | websites relace, websiteCosts |
| InvoiceController::show/sendEmail | load websites místo subscriptions |
| TaskController (kalendář) | Website query pro events |

### Backend (commands + notifikace)
| Starý | Nový |
|-------|------|
| AutoInvoiceSubscriptions | AutoInvoiceWebsites (websites:auto-invoice) |
| CheckExpiringSubscriptions | CheckExpiringWebsites (websites:check-expiring, uses `last_expiry_notified_at`) |
| GenerateNotifications | přepojit na Website (query `website_id` v JSON, ne `subscription_id`) |
| SubscriptionExpiring | WebsiteExpiring (link /webove-sluzby/{id}) |
| SubscriptionInvoiceCreated | WebsiteInvoiceCreated |
| **bootstrap/app.php** | **Scheduler: `subscriptions:*` → `websites:*`** |
| SendInvoiceReminders | přepojit linky na /webove-sluzby/{id} |
| VpsServerController | FK `vps_server_id` → `hosting_server_id`, model Subscription → Website |

### Frontend
| Starý | Nový |
|-------|------|
| pages/Neniweb/* | pages/WeboveSluzby/* |
| components/neniweb/* | components/webove-sluzby/* |
| components/dashboard/NeniwebOverview | přepracovat na WebsiteOverview |
| components/dashboard/AttentionAlerts | linky /webove-sluzby/{id} |
| components/dashboard/Receivables | WebsitePayment |
| components/finance/MrrDetail | linky /webove-sluzby/{id} |
| components/customers/CustomerServices | linky /webove-sluzby/{id} |
| components/layout/SearchPalette | kategorie websites |
| components/layout/Sidebar | "Webové služby" → /webove-sluzby |
| components/planner/CalendarGrid | event type website |

## 11. Migrace dat

Jedna atomická migrace v 6 krocích:

### Krok 1: Nové tabulky
- management_plans + seed (5 balíčků)
- sync_blacklist + seed (35 Lukášových domén)
- sync_pending
- website_credentials

### Krok 2: Rename tabulek
- subscriptions → websites
- subscription_payments → website_payments
- invoice_subscription → invoice_website
- Rename FK sloupců: subscription_id → website_id (website_payments, invoice_website, email_accounts)
- **PostgreSQL unique constraint:** DROP `invoice_subscription_invoice_id_subscription_id_unique`, ADD `invoice_website_invoice_id_website_id_unique` (PostgreSQL nerenameruje constraint automaticky při column rename)

### Krok 3: Alter websites
- Přidat: domain_expires_at, hosting_expires_at, hosting_server_id, alias_of_id, management_plan_id, management_cycle, auto_invoice_management
- Rename: customer_notified_at → last_expiry_notified_at
- Data migrace:
  - hosting_expires_at = expires_at (kde stará type=hosting)
  - domain_expires_at = expires_at (kde stará type=domena AND is_registered_by_us=true)
  - hosting_server_id = vps_server_id
  - alias_of_id = parent_subscription_id
- Odebrat: type, provider, price_yearly, billing_cycle, monthly_price, monthly_plan, portal_domain_id, vas_hosting_id, tariff, managed_since, expires_at, parent_subscription_id, vps_server_id, admin_user, admin_password, client_user, client_password, folder_id

### Krok 3b: Cleanup notifications
- UPDATE notifications SET data = REPLACE(data, 'subscription_id', 'website_id') WHERE type LIKE '%Subscription%'
- UPDATE notifications SET data = REPLACE(data, '/neniweb/', '/webove-sluzby/') WHERE data LIKE '%/neniweb/%'
- UPDATE notifications SET type = REPLACE(type, 'Subscription', 'Website') WHERE type LIKE '%Subscription%'

### Krok 4: Migrace credentials
- Pro každý website s admin_url + admin_user → INSERT website_credentials (label: "Admin")
- Pro každý website s client_user → INSERT website_credentials (label: "Zákazník")

### Krok 5: Pivot rozšíření
- invoice_website: přidat invoice_type (default 'hosting')

### Krok 6: Cleanup
- DROP TABLE subscription_folders

### down() metoda (explicitní rollback)

```
1. DROP TABLE website_credentials, management_plans, sync_pending, sync_blacklist
2. Rename: invoice_website → invoice_subscription
3. Rename: website_payments → subscription_payments
4. Rename FK: website_id → subscription_id (v subscription_payments, invoice_subscription, email_accounts)
5. PostgreSQL: DROP + re-ADD unique constraint s původním názvem
6. ALTER websites: re-add dropped columns (type VARCHAR, expires_at TIMESTAMP, provider, price_yearly, billing_cycle, monthly_price, monthly_plan, portal_domain_id, vas_hosting_id, tariff, managed_since, parent_subscription_id, vps_server_id, admin_user, admin_password, client_user, client_password, folder_id)
7. Data restore:
   - expires_at = hosting_expires_at
   - type = CASE WHEN hosting_server_id IS NOT NULL THEN 'hosting' ELSE 'domena' END
   - vps_server_id = hosting_server_id
   - parent_subscription_id = alias_of_id
   - Rename last_expiry_notified_at → customer_notified_at
8. DROP added columns (domain_expires_at, hosting_expires_at, hosting_server_id, alias_of_id, management_plan_id, management_cycle, auto_invoice_management)
9. DROP invoice_type from invoice_subscription
10. Re-CREATE subscription_folders
11. Rename: websites → subscriptions
12. Revert notification data (website_id → subscription_id, /webove-sluzby/ → /neniweb/)
```

> **Varování:** down() neobnoví credentials data (admin_user/password se ztratí pokud rollback po delším provozu). Rollback je bezpečný jen v rámci hodin po deploy.

## 12. Fázování implementace

### Fáze 1 — Backend + minimální frontend (jeden deploy)
Vše výše: migrace, modely, controllery, commands, notifikace, routes, VasHostingService přepojení, minimální frontend úpravy (rename importů/props aby stávající stránky fungovaly).

**Výsledek:** CRM funguje, data zachována, URL /webove-sluzby, stávající UI layout.

### Fáze 2 — Nový frontend (druhý deploy)
Nový Index (jeden seznam + filtry), nový Show (credentials, dvě expirace), Create/Edit (management_plan), "Ke schválení" stránka, Nastavení (balíčky + blacklist), Dashboard přepracování.

**Výsledek:** Kompletní nový modul "Webové služby".

## 13. Rollback plán

```bash
# Na lokálu
git checkout backup/v1.1.0-pre-weby-rewrite

# Na VPS
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && php artisan migrate:rollback --step=1"

# Rsync + cache
rsync ... && ssh ... "php artisan config:cache && php artisan route:cache && php artisan view:cache"
```

## 14. Domény v scope

### Budou se syncovat (46)
16 s mojí registrací + hostingem, 11 s cizím registrátorem + hostingem, 14 jen domény, 5 pod thaimassage VPS.

### Blacklist (35)
33 unikátních domén (Lukášovy + synwase.cz + dtftransferytisk.cz + alfabrno.eu)

### Kompletní blacklist seed
```
alfabrno.eu (POZOR: má hosting na ond08, ale patří Lukášovi — OVĚŘIT S UŽIVATELEM)
beautyateliervoznicova.cz, bropit.cz, ceskapropiska.cz, dominikpodsednik.cz,
dtftransferytisk.cz, hotel-slaviaholesov.cz, kempujstylove.cz,
kovovepropiskypotisk.cz, kubicek-shop.com, mipak.cz, mltfa.cz, natisknito.cz,
okruhovejizdy.cz, orelslapanice.cz, orlovnaslapanice.cz, podolisrdcem.cz,
prolepsibosonohy.cz, rautec.cz, rdpromo.cz, reklamnidarky.cz,
reklamnipropiskypotisk.cz, reklamnitextilpotisk.cz, rismont.cz,
sedlackovi2026.cz, snurkynakrkpotisk.cz, strakovi2025.cz,
svobodapridal.cz, synwase.cz, tabarin.cz, truhlarstvidv.cz,
vonkypotisk.cz, zapalovacepotisk.cz, zapalovacepotisk.cz
```

**Poznámka:** alfabrno.eu je v seznamu Lukáše na screenshotu, ALE v sekci B (cizí registrátor + hosting) jsme ji nechali. Je třeba ověřit — pokud patří Lukášovi, přidat do blacklistu.
