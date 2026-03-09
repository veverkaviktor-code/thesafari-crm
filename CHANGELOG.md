# Changelog — CRM hq.thesafari.cz

## [Round 9] — 2026-03-08
### Brand & UI
- Brand barva opravena: `#333933` → `#2e3a36`
- Logo v emailech: CID PNG embedding (600px, bílé pozadí se sloganem)
- Logo v sidebaru: h-9, bez textu "HQ"
- Tlačítka sjednocena: ghost/outline → filled s pozadím (`bg-color/15 + border`)
- Smazat = vždy červená (`bg-red-500/15`) napříč celým CRM

### Nové stránky
- `/logy` — 3 taby: Emaily (z `email_logs`), Aktivita (spatie/activitylog), Chyby (laravel.log)
- `/podpora` — veřejná stránka (bez auth) s kontaktním formulářem
- API `POST /api/zpravy` pro externí formuláře (neniweb.cz atd.)

### Přejmenování
- "Požadavky" → "Zprávy" (sidebar, routes `/zpravy`, search, dashboard)
- `/pozadavky` → 301 redirect na `/zpravy`
- `thesafari.cz/podpora` → nginx 301 redirect na `hq.thesafari.cz/podpora`

### Models
- `EmailLog` model pro logování odeslaných emailů
- `Ticket` model rozšířen: source, first_name, last_name, phone, website, content

## [Round 8] — 2026-03-08
### DNS & Fakturace
- Fix DNS wildcard: `_acme-challenge.hq` TXT blokoval `*.thesafari.cz` CNAME
- Souhrnná fakturace: `POST /neniweb/faktura-zakaznik/{customer}` — sloučí všechny aktivní ne-free subscriptions
- Tlačítko "Fakturovat vše" na Neniweb/Show

### Email šablony
- SPD QR kód (PNG přes Imagick) embedován přímo do emailu (cid:qr-payment)
- Karel s fakturou (karel-invoice.png) v invoice šabloně
- Amber tabulka platebních údajů (#fffbeb bg, #fcd34d border)

## [Round 7] — 2026-03-07
### UX Polish
- Fulltext search rozšířen na 7 kategorií (customers, subscriptions, orders, invoices, estimates, tickets, tasks)
- SearchPalette seskupuje výsledky podle typu
- AttentionAlerts dashboard widget (expirující domény, nezaplacené faktury)
- `alerts_ignored_at` pattern na Subscription (toggle "Věnujte pozornost")

### Automatizace
- Payment-thanks email: automaticky po markAsPaid (ruční, Fio auto-match, manuální párování)
- Karel "Lenoch" s prachy jako maskot v payment-thanks emailu
- Activity log pruning: max 7 dní, scheduler maže staré záznamy denně v 03:30

## [Round 6] — 2026-03-07
### Fio Bank API
- `FioApiService` — stahování transakcí z Fio banky
- `SyncFioTransactions` command (cron hourly 8-20)
- Auto-match: VS + částka → markAsPaid
- Částečná shoda → `BankMatchRequired` notifikace
- Manuální párování na detailu faktury
- Sync tlačítko v UI

## [Round 5] — 2026-03-06
### Kompletní audit
- 54 souborů, P0-P3 opravy
- Utility funkce centralizovány (formatCurrency, FieldError)
- PostgreSQL FK sloupce: explicitní indexy
- `lockForUpdate()` opraven — musí být v `DB::transaction()`
- Scheduler konsolidován do `bootstrap/app.php` (09:00)
- PostgreSQL `notifications.data` je `text` → `data::jsonb->>'key'` pro JSON operátory
- Verifikace: Playwright browser walkthrough

## [Round 4] — 2026-03-05
### Auto-fakturace & Mobile
- Auto-invoice cron pro subscriptions
- Číselné řady: 1XXX (zakázky) / 6XXX (subscriptions)
- Domény = zdroj pravdy vas-hosting API (sync přepisuje expires_at)
- `invoice_subscription` M:N pivot
- `auto_invoice` per-služba přepínač
- Hamburger menu < 768px
- Responsive tabulky (DataTable overflow-x-auto)
- Stat cards 2x2 grid na mobilu

## [Round 3] — 2026-03-03
### Timer & UI
- Running timer: amber sticky bar pod navbarem
- Auto-update `order.price` ze součtu OrderItems
- LogsActivity (spatie/activitylog) na všech modelech
- Activity feed na Dashboard

## [Round 2] — 2026-03-02
### Core CRM
- Customers, Orders, Invoices CRUD
- Neniweb (domény, hosting) management
- Invoice auto-numbering s `lockForUpdate()`
- SPD QR kódy pro české bankovní platby
- CompanySetting singleton pattern
- VARCHAR+CHECK místo ENUM, JSONB pro adresy/tagy/settings
- Soft deletes na Customer, Order, Invoice, Subscription

## [Round 1] — 2026-03-02
### MVP
- Laravel 12 + Inertia.js + React 19 + TypeScript + Tailwind 4
- Safari Dark paleta (warm #0a0a08/#16140f, amber #D97706)
- Dashboard: StatCards, RevenueChart, DivisionChart
- GlassModal pro Create/Edit dialogy
- Auth: login, session-based
- PostgreSQL database

## [Auth Update] — 2026-03-09
### Přihlášení & Heslo
- Remember me checkbox na login stránce
- Zapomenuté heslo: `/zapomenute-heslo` → email s odkazem
- Reset hesla: `/obnovit-heslo/{token}` → nové heslo
- Custom česká notifikace pro reset hesla
- Safari logo (SVG) v PDF faktuře (width=300, dompdf-compatible)
