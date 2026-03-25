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
- **Routes**: české URL (`/zakazky`, `/zakaznici`, `/faktury`, `/webove-sluzby`, `/tikety`)
- **Modely**: anglické názvy (Order, Customer, Invoice, Website, WebsitePayment, WebsiteCredential, TimeEntry, OrderItem, OrderCost)
- **Nový model**: vždy přidat `use LogsActivity` + `$logFillable = true` + `$logOnlyDirty = true`
- **Finance**: ceny v CZK, neplátce DPH, auto-sum z child items
- **Soft deletes**: na Customer, Order, Invoice, Website
- **DB**: VARCHAR+CHECK místo ENUM, JSONB pro adresy/tagy/settings

## Architektura
- **Inertia shared props**: `auth.user`, `flash`, `runningTimer` (HandleInertiaRequests.php)
- **Running timer**: amber sticky bar pod navbarem (RunningTimerBar.tsx)
- **Dashboard**: StatCards, RevenueChart, DivisionChart (donut), ActivityTimeline (reálná data z activity_log), RecentTickets
- **Glass Modal**: GlassModal.tsx pro Create/Edit dialogy (Zákazníci, Zakázky, Webové služby)
- **OrderItems**: inline CRUD s auto-přepočtem order.price
- **Invoice**: auto-numbering s lockForUpdate(), SPD QR kódy

## Divize
- thesafari (tisk, reklama, polepy, montáže)
- webové služby (weby, domény, hosting, správa)
- thajskydotek (masáže — budoucí integrace)

## Gotchas — KRITICKÉ
- **PostgreSQL decimal → JS string**: `sell_yearly` přichází jako `"0.00"` (truthy!). VŽDY `parseFloat()` před porovnáním
- **`sell_yearly` = `domain_sell_yearly` + `hosting_sell_yearly`**: po změně split cen MUSÍ se přepočítat totals
- **GlassModal focus trap**: `onClose` prop NESMÍ být inline arrow funkce v useEffect deps — uložit do `useRef`, deps jen `[open]`
- **VPS tab počítá weby přes `hosting_server_id`** (FK), ne přes `server` (string) — sync musí nastavovat obojí
- **VPS Centrum API (ond08/thaimassage) nevrací `storage_quota_mb`** — hardcoded 4096 MB v syncu
- **`storage_quota_mb` je NOT NULL** v DB — nikdy nenastavovat na `null` v syncu
- **Splatnost faktur**: minimum 14 dní od vystavení, i když expirace hostingu je dříve
- **Auto-invoice `update()` toggle**: quick toggle z Show.tsx posílá jen `{auto_invoice: v}` — controller musí mít early return PŘED plnou validací (která vyžaduje `name`, `status`)

## Webové služby — Sync z API
- **3 zdroje**: Portal API (domény), Server API/sss06 (hostingy), VPS Centrum/ond08+thaimassage (hostingy)
- Sync VŽDY nastavuje `server` + `hosting_server_id` (ne jen když je prázdný)
- Nové domény → `sync_pending` → admin schválí → `approvePending()` mapuje source→server
- Wedos domény se v API neobjevují — spravují se ručně v CRM
- `is_registered_by_us` = platíme doménu my (vas-hosting NEBO wedos "Klienti")

## Ceny domén (standard)
- CZ: sell 300, cost 223
- EU: sell 280, cost 206
- .click: sell 480, cost 331
- Hosting standard: sell 2050, cost 0 (VPS se fakturuje celý ročně)
