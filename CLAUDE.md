# CRM hq.thesafari.cz — Project Instructions

## Stack
- **Backend**: Laravel 12, PHP 8.3, PostgreSQL
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
- PHP NENÍ na macOS — artisan příkazy JEN na VPS
- SSH alias: `NENIWEB-VPS` nebo `root@sss06.vas-server.cz`
- Web: https://hq.thesafari.cz
- DB: PostgreSQL `safari_crm` (localhost na VPS)

## Konvence
- **Jazyk UI**: čeština s diakritikou (VŽDY)
- **Routes**: české URL (`/zakazky`, `/zakaznici`, `/faktury`, `/domeny`, `/hostingy`, `/vps`, `/tikety`)
- **Modely**: anglické názvy (Order, Customer, Invoice, Hosting, HostingPayment, HostingCredential, Domain, TimeEntry, OrderItem, OrderCost)
- **Nový model**: vždy přidat `use LogsActivity` + `$logFillable = true` + `$logOnlyDirty = true`
- **Finance**: ceny v CZK, neplátce DPH, auto-sum z child items
- **Soft deletes**: na Customer, Order, Invoice, Hosting, Domain
- **DB**: VARCHAR+CHECK místo ENUM, JSONB pro adresy/tagy/settings

## Architektura
- **Inertia shared props**: `auth.user`, `flash`, `runningTimer` (HandleInertiaRequests.php)
- **Running timer**: amber sticky bar pod navbarem (RunningTimerBar.tsx)
- **Dashboard**: StatCards, RevenueChart, DivisionChart (donut), ActivityTimeline (reálná data z activity_log), RecentTickets
- **Glass Modal**: GlassModal.tsx pro Create/Edit dialogy (Zákazníci, Zakázky, VPS)
- **OrderItems**: inline CRUD s auto-přepočtem order.price
- **Invoice**: auto-numbering s lockForUpdate(), SPD QR kódy

## Divize
- thesafari (tisk, reklama, polepy, montáže)
- webové služby (weby, domény, hosting, správa)
- thajskydotek (masáže — budoucí integrace)

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

### Fakturace
- `AutoInvoiceHostings` (09:00) — hosting.sell_yearly, 30d před expirací, série 6XXX
- `AutoInvoiceDomains` (09:05) — domain.sell_yearly kde is_registered_by_us=true
- `is_registered_by_us` = Wedos cli=Viktor (Klienti folder) NEBO vas-hosting isRegisteredByUs=true
- Manuální fakturace: tlačítko na detailu hostingu/domény

### Ceny (standard)
- CZ doména: sell 300, cost 223
- EU doména: sell 280, cost 206
- .click doména: sell 480, cost 331
- Hosting standard: sell 2050, cost 0 (VPS se fakturuje celý ročně)
- Thaimassage hostingy: is_free=true (VPS celé)
