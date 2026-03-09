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
- **Routes**: české URL (`/zakazky`, `/zakaznici`, `/faktury`, `/neniweb`, `/tikety`)
- **Modely**: anglické názvy (Order, Customer, Invoice, TimeEntry, OrderItem, OrderCost)
- **Nový model**: vždy přidat `use LogsActivity` + `$logFillable = true` + `$logOnlyDirty = true`
- **Finance**: ceny v CZK, neplátce DPH, auto-sum z child items
- **Soft deletes**: na Customer, Order, Invoice, Subscription
- **DB**: VARCHAR+CHECK místo ENUM, JSONB pro adresy/tagy/settings

## Architektura
- **Inertia shared props**: `auth.user`, `flash`, `runningTimer` (HandleInertiaRequests.php)
- **Running timer**: amber sticky bar pod navbarem (RunningTimerBar.tsx)
- **Dashboard**: StatCards, RevenueChart, DivisionChart (donut), ActivityTimeline (reálná data z activity_log), RecentTickets
- **Glass Modal**: GlassModal.tsx pro Create/Edit dialogy (Zákazníci, Zakázky, Neniweb)
- **OrderItems**: inline CRUD s auto-přepočtem order.price
- **Invoice**: auto-numbering s lockForUpdate(), SPD QR kódy

## Divize
- thesafari (tisk, reklama, polepy, montáže)
- neniweb (weby, domény, hosting)
- thajskydotek (masáže — budoucí integrace)
