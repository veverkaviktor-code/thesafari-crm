# CRM hq.thesafari.cz — Project Instructions

## Stack
- **Backend**: Laravel 12, PHP 8.4, PostgreSQL
- **Frontend**: Inertia.js + React 19 + TypeScript + Tailwind 4 + Shadcn/UI
- **Design**: Safari Dark paleta (warm #0a0a08/#16140f, amber #D97706, warm white #F5F0E8)
- **Icons**: Lucide React
- **Activity log**: spatie/activitylog (LogsActivity trait na modelech)

## Deploy
```bash
# 1. Build lokálně
npm run build

# 2. Rsync na VPS
rsync -avz --include='app/***' --include='database/***' --include='resources/***' --include='routes/***' --exclude='*' ./ root@sss06.vas-server.cz:/var/www/hq.thesafari.cz/
rsync -avz --delete public/build/ root@sss06.vas-server.cz:/var/www/hq.thesafari.cz/public/build/

# 3. Migrace + cache na serveru
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && php artisan migrate --force && php artisan config:cache && php artisan route:cache && php artisan view:cache"
```
- SSH alias: `NENIWEB-VPS` nebo `root@sss06.vas-server.cz`
- Web: https://hq.thesafari.cz
- DB: PostgreSQL **`thesafari_crm`** (localhost na VPS) — NE `safari_crm`; záloha: `sudo -u postgres pg_dump thesafari_crm | gzip > ...`

## Lokální prostředí (od 2026-09-16)
- **PHP 8.4** (`brew install php@8.4`) — `composer.lock` vyžaduje ≥ 8.4 kvůli Symfony 8. Pod 8.3 `composer install` selže a `vendor/` vůbec nevznikne.
  ```bash
  export PATH="/opt/homebrew/opt/php@8.4/bin:$PATH"
  ```
- **Testy běží na PostgreSQL**, ne SQLite — migrace používají syrové Postgres DDL (`::timestamptz`, `ALTER TABLE ... ADD CHECK`), které SQLite neumí naparsovat.
  ```bash
  createdb -h 127.0.0.1 thesafari_crm_test   # jednorázově
  php artisan test
  ```
  DB jméno/uživatel jsou v `phpunit.xml`.

## Konvence
- **Jazyk UI**: čeština s diakritikou (VŽDY)
- **Routes**: české URL (`/zakazky`, `/zakaznici`, `/faktury`, `/domeny`, `/hostingy`, `/vps`, `/tikety`)
- **Modely**: anglické názvy (Order, Customer, Invoice, Hosting, HostingPayment, HostingCredential, Domain, TimeEntry, OrderItem, OrderCost)
- **Nový model**: vždy přidat `use LogsActivity` + `$logFillable = true` + `$logOnlyDirty = true`
- **Finance**: ceny v CZK, neplátce DPH, auto-sum z child items. Záporné položky povoleny (kompenzace).
- **Soft deletes**: na Customer, Order, Invoice, Hosting, Domain
- **DB**: VARCHAR+CHECK místo ENUM, JSONB pro adresy/tagy/settings. CHECK constrainty na invoice_items ODSTRANĚNY (záporné ceny).

## Architektura
- **Inertia shared props**: `auth.user`, `flash`, `runningTimer` (HandleInertiaRequests.php)
- **Running timer**: amber sticky bar pod navbarem (RunningTimerBar.tsx)
- **Dashboard**: StatCards, RevenueChart, DivisionChart (donut), ActivityTimeline (reálná data z activity_log), RecentTickets
- **Glass Modal**: GlassModal.tsx pro Create/Edit dialogy (Zákazníci, Zakázky, VPS)
- **OrderItems**: inline CRUD s auto-přepočtem order.price, záporné ceny povoleny
- **Invoice**: auto-numbering s lockForUpdate(), SPD QR kódy
- **CustomerCombobox**: `@/components/ui/CustomerCombobox.tsx` — searchable combobox pro výběr zákazníka, použito ve VŠECH formulářích (OrderForm, InvoiceCreate/Edit, HostingForm, DomainForm)
- **Fio Bank zůstatek**: `FioApiService::getBalance()` → cache `fio_balance` (24 h) → Dashboard StatCard "Stav účtu". Dashboard cache jen ČTE, nikdy nevolá API synchronně (blokovalo render 30 s). Zapisuje výhradně `fio:sync`.
  - **Rate limit:** Fio odmítá dvě volání do 30 s od sebe s **HTTP 409**, který `getBalance()` hlásí jako `null`. Zůstatek se čte hned po transakcích, takže první pokus je odmítnut VŽDY → `refreshBalanceCache()` počká 31 s a zkusí znovu. Při ručním ladění přes `tinker` počítej s tím, že tě vlastní dotaz zablokuje.
  - **`closingBalance` je 0.0 ve dni bez pohybu** — skutečná částka je v `openingBalance`. Řeší `resolveBalance()`; nikdy nebrat `closingBalance` napřímo.
  - **Token je v URL** → maskovat před logováním (`redact()`), jinak skončí v plaintextu v `laravel.log`.

## Divize
- 4 divize: `digital`, `design`, `lab`, `ostatni` (Safari Digital / Safari Design / Safari Lab / Ostatní)
- Sloupec `orders.division` = **JSONB pole** (multi-select, zakázka může mít více divizí)
- Model cast: `'division' => 'array'`, scope `byDivision` používá `whereJsonContains`
- Frontend: toggle tlačítka (ne select), `DivisionBadge` renderuje pole
- `allDivisions` export z DivisionBadge.tsx pro selecty/filtry

## Fakturace — číselné řady
- **Převodem**: 2026**0**001 nahoru (20260001, 20260002, ...)
- **Hotově**: 2026**9**001 nahoru (20269001, 20269002, ...)
- `Invoice::getNextInvoiceNumber($paymentMethod)` — parametr `'banka'` (default) nebo `'hotove'`
- Sequence tabulka `invoice_sequences`: prefix `{year}_bank` / `{year}_cash`
- Staré faktury (20261xxx, 20266xxx) zůstávají beze změny — historická data

## Gotchas — KRITICKÉ
- **PostgreSQL decimal → JS string**: `sell_yearly` přichází jako `"0.00"` (truthy!). VŽDY `parseFloat()` před porovnáním
- **GlassModal focus trap**: `onClose` prop NESMÍ být inline arrow funkce v useEffect deps — uložit do `useRef`, deps jen `[open]`
- **Relationship `vpsServer()`** (NE `server()`) — kolize s VARCHAR sloupcem `server`. Eloquent `with('server')` by přepsal string objeklem.
- **VPS Centrum API (ond08/thaimassage) nevrací `storage_quota_mb`** — hardcoded 4096 MB v syncu
- **`storage_quota_mb` je NOT NULL** v DB — nikdy nenastavovat na `null` v syncu
- **Splatnost faktur**: minimum 14 dní od vystavení, i když expirace je dříve. Platí pro hosting, doménu i VPS.
- **Auto-invoice `update()` toggle**: quick toggle z Show.tsx posílá jen `{auto_invoice: v}` — controller musí mít early return PŘED plnou validací
- **PHP `when('0', ...)` je falsy** — pro filtry s hodnotou '0' použít `$request->filled()` místo `$request->input()`
- **Hosting a doména se fakturují NEZÁVISLE** — každý má svou expiraci, cenu, auto_invoice toggle
- **Thaimassage hostingy = is_free=true** — VPS se fakturuje celé ročně, jednotlivé hostingy ne
- **Carbon 3 `diffInDays`** vrací záporné číslo (signed) — VŽDY `abs()` při výpočtu dní po splatnosti/do expirace
- **Po v1.3.0 rename**: `websites` relace neexistuje → `hostings`. Zkontrolovat VŠECHNY commands/services při budoucích úpravách
- **Invoice model `total`**: sloupec se jmenuje `total` (NE `total_amount`), cast `decimal:2`. Při ručním updatu vždy `$inv->total = X`.
- **Invoice prefill z zakázky**: `InvoiceController::create()` loaduje `items` + `timeEntries` (dokončené). Time entries se předvyplní jako řádky faktury (popis, billable_hours, hourly_rate).
- **DB CHECK constrainty**: Při povolení záporných hodnot NESTAČÍ upravit Laravel validaci — musíš dropnout i PostgreSQL CHECK constraint (`ALTER TABLE x DROP CONSTRAINT y`). Ověř přes `pg_constraint`.
- **DataTable `selectable`**: VŽDY předat `getItemId={(o) => o.id}` když je `selectable` — jinak header má checkbox ale data řádky ne → sloupce posunuté o 1.

## Domény + Hostingy + VPS (v1.3.0)

### Modely
- `Hosting` (tabulka `hostings`) — serverové služby s credentials, email accounts, management plans
- `Domain` (tabulka `domains`) — registrace domén s `hosting_id` FK (nullable, propojení na hosting)
- `VpsServer` — VPS servery (tabulka `vps_servers`)
- Auto-párování: při vytvoření hostingu/domény se automaticky propojí pokud mají stejný název

### Sync z API (4 zdroje)
- **Portal API** (`portal.vas-hosting.cz`) — sync domén, VŠECHNY v účtu (ne jen registered by us)
- **Server API** (`sss06.vas-server.cz`) — sync hostingů na sss06 (storage, expirace)
- **VPS Centrum** (ond08, thaimassage) — sync hostingů přes starší POST API
- **Wedos WAPI** (`api.wedos.com`) — sync domén z Wedos (23 domén, `domains-list` + `domain-info`)
- Per-hosting sync: tlačítko na detailu volá `POST /hostingy/{id}/sync` (detekuje server automaticky)
- Nové záznamy → `sync_pending` (type: domain/hosting) → admin schválí
- **Auto-párování**: při každém syncu se domény automaticky propojí s hostingem podle shodného názvu

### Redirect hostingy
- `redirect_of_id` FK na hostings(id) — redirect na parent hosting
- Automaticky: `is_free=true`, bez expirace, bez fakturace, bez management plánu
- UI: fialový badge `↪ parent.cz`, zjednodušený detail (jen tab Přehled)
- Formulář: select "Redirect na hosting" skryje pravý sloupec (server, ceny, správa)
- Pending approval: možnost rovnou označit jako redirect

### Fakturace (auto)
- `AutoInvoiceHostings` (09:00) — hosting.sell_yearly, 30d před expirací
- `AutoInvoiceDomains` (09:05) — domain.sell_yearly kde is_registered_by_us=true
- Auto-fakturace používá `getNextInvoiceNumber('banka')` — vždy řada převodem
- `is_registered_by_us` = Wedos cli=Viktor (Klienti folder) NEBO vas-hosting isRegisteredByUs=true
- Manuální fakturace: tlačítko na detailu hostingu/domény

### Ceny (standard)
- CZ doména: sell 300, cost 223
- EU doména: sell 280, cost 206
- .click doména: sell 480, cost 331
- Hosting standard: sell 2050, cost 0 (VPS se fakturuje celý ročně)
- Thaimassage hostingy: is_free=true (VPS celé)
