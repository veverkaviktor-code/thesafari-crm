# PROJECT BRIEF — CRM hq.thesafari.cz

## Přehled
Interní CRM pro thesafari.cz — kreativní studio (tisk, reklama, polepy, montáže, weby via neniweb.cz).
Single admin, role-ready struktura. Neplátce DPH. Fio Bank API integrace.

## Tech Stack
Laravel 12 + Inertia.js + React 19 + TypeScript + Tailwind 4 + Shadcn/UI + PostgreSQL

## Moduly (stav k 2026-03-22)

### Dokončené (MVP + Round 1-7)
- **Dashboard** — stat cards, revenue chart, division donut chart, MRR, financial summary bar, activity timeline (reálná data, max 7 dní, s odkazy), AttentionAlerts (expand/collapse + ignorování)
- **Zákazníci** — CRUD, glass modal, mini dashboard, tabs (kontakt, služby jako odkazy, faktury, tikety), ARES napojení
- **Zakázky** — CRUD, glass modal, divize, stavy, OrderItems (inline CRUD s auto-price), OrderCosts, TimeTracker s running timer, marže
- **Faktury** — CRUD, auto-numbering (lockForUpdate), SPD QR, PDF, email odesílání, stavy, položky editor, CSV export, Fio bank sync + auto-match, manuální párování, payment-thanks email
- **Webové služby** (v1.2.0) — split pricing (doména/hosting oddělené), 5-tab detail, credentials CRUD, alias domény (vlastní expirace, pod parentem v seznamu), VPS servery s auto-fakturací, sync z vas-hosting API, sync blacklist/pending
- **Auto-fakturace** — cron 07:00, split položky (hosting + doména + alias domény), VPS servery, budoucí období, splatnost = expirace, processPayment s idempotency guard
- **Finance** — cashflow, revenue breakdown, MRR detail, cost breakdown, invoice aging, profit chart, pohledávky (plný seznam se scrollem)
- **Tikety** — email-based (n8n integrace), thread view, priority, stavy
- **Plánovač** — tasks CRUD s calendar grid, toggle complete, AttentionAlerts pod seznamem úkolů
- **Kalkulátor** — estimates CRUD, nesting algorithm (FFDH), materiály, fotky, soft delete + restore
- **Nastavení** — firma (singleton), profil, heslo
- **Running Timer Bar** — amber sticky lišta pod navbarem
- **Notifikace** — overdue faktury, expirující subscriptions, neaktivní kalkulace (7+ dní), auto-generování (cron), payment received, bank match required, reminder sent
- **Přílohy** — file upload/download na zákazníky, zakázky, tikety
- **Globální vyhledávání** — SearchPalette (Cmd+K), 7 kategorií (zákazníci, služby, zakázky, faktury, kalkulace, požadavky, úkoly)
- **Fio Bank** — API sync (hourly 8-20), auto-match VS+částka, BankMatchRequired notifikace, manuální párování UI
- **Email automatizace** — odesílání faktur, 3-stupňové upomínky (Karel lenochod), děkovný email po úhradě

### Round 7 — UX polish + alerts + email (2026-03-07) ✅ NASAZENO
- Fulltext search rozšířen na 7 kategorií
- AttentionAlerts: expand/collapse, ignorování (alerts_ignored_at), sekce "Ignorované" s obnovením
- Receivables (dashboard): compact 3 záznamy + expand + link na Finance
- ActivityTimeline: overflow-x fix, 7-day limit, odkazy na záznamy
- Customer services jako klikatelné odkazy
- Payment-thanks email (Karel s prachy 🦥) — automaticky po úhradě
- Activity log pruning (scheduler 03:30, starší 7 dní)
- Kalkulátor: řezaná fólie 2cm margin, overlap 0→0, mobile UX (větší ikony, viditelné buttony)
- Estimate inactive notifikace (7+ dní bez aktivity)

### Round 8 — Přílohy + Admin přístupy + Rebranding (2026-03-20) ✅ NASAZENO
- **Přílohy na zakázkách**: drag & drop upload (multiple, sekvenční), seznam s ikonou/názvem/velikostí/datem, download/open/delete akce
- **Zákaznický tab "Soubory"**: agreguje přílohy ze všech zakázek zákazníka (read-only)
- **Admin přístupy na hostingu**: admin_url + dva páry credentials (můj + zákazník), šifrované hesla, eye toggle + copy s checkmark feedback
- **Přejmenování**: Neniweb → "Webové služby" (sidebar + breadcrumbs + page titles)
- **Organizovaná storage**: soubory v `attachments/orders/{id}-{slug}/` pro přehlednost na FTP
- **ForceDelete cleanup**: automatické smazání příloh z disku při force delete zakázky
- **VPS infra**: PHP 8.4-FPM limity (upload_max=12M, post_max=64M), nginx client_max_body_size=64m
- **Preview endpoint**: `/attachments/{id}/preview` pro inline zobrazení PDF/SVG/obrázků v novém tabu
- **Verze**: v1.1.0

### Round 9+10 — Audit + Opravy + Features (2026-03-21/22) ✅ NASAZENO
- **Kompletní audit**: 44+ issues nalezeno a opraveno (processPayment idempotency, NPE fix, safe CAST, HTTP timeouts, focus trap, dark mode, is_free filter, float porovnání...)
- **Light/dark mode toggle**: Sun/Moon ikona v TopBaru, localStorage persistence
- **Barter platební metoda**: třetí volba vedle banka/hotovost, vyloučen z cashflow, bez QR v PDF
- **VPS auto-fakturace**: expires_at + auto_invoice na VPS, cron generuje fakturu 30d před expirací, processPayment prodlužuje přes vps_server_id FK
- **Alias domény opraveny**: vlastní období na faktuře, hosting data skrytá v seznamu, vyloučeny z filtrů/řazení
- **Fakturace sjednocena**: createInvoice, createCustomerInvoice, AutoInvoice — identický formát (split pricing, aliasy, budoucí období)
- **MRR opraveno**: is_free filtr v Dashboard, free weby sell_yearly vynulováno
- **Verze**: v1.2.1

### Budoucí (backlog)
- [ ] Multi-user + role-based access (RBAC)
- [ ] Stránka "Ke schválení" (sync_pending UI)
- [ ] Auto-fakturace správy (management plans)
- [ ] 2FA (TOTP)
- [ ] Mail odesílání přes queue
- [ ] Email odeslání příloh (výběr souborů → email tiskárně)

## Design
Safari Dark paleta — warm dark backgrounds (#232e2a, #2e3a36), amber accent (#CF995F), warm white (#dac8b6).
Light mode: cream (#F8F7F4), white cards, dark text (#1C1917).
Toggle v TopBaru (Sun/Moon), localStorage persistence, default dark.
Shadcn/UI komponenty s CSS proměnnými pro oba módy.

## Email šablony
| Šablona | Soubor | Trigger |
|---------|--------|---------|
| Faktura | `emails/invoice.blade.php` | Manuální odeslání |
| Upomínka 1-3 | `emails/invoice-reminder.blade.php` | Cron 09:30 (3/10/21 dní po splatnosti) |
| Poděkování za úhradu | `emails/payment-thanks.blade.php` | Automaticky po markAsPaid |

Karel "Lenoch" (lenochod) = maskot fakturace. Obrázky v `storage/app/email-assets/`.

## Server
- VPS: 37.235.108.29 (sss06.vas-server.cz)
- Nginx + PHP 8.4-FPM + PostgreSQL
- SSL: Let's Encrypt
- Deploy: rsync + ssh (viz CLAUDE.md)

## Scheduler (cron)
| Čas | Příkaz | Popis |
|-----|--------|-------|
| 03:00 | `model:prune` | Pruning prunable modelů |
| 03:30 | activity_log cleanup | Mazání activity_log starších 30 dní |
| 07:00 | `websites:auto-invoice` | Auto-fakturace webů + VPS expirujících do 30d |
| 08:00-20:00 | `fio:sync` (hourly) | Sync transakcí z Fio Bank API |
| 08:00 | `invoices:check-overdue` | Označení + notifikace overdue faktur |
| 08:30 | `websites:check-expiring` | Notifikace expirujících webů (30/14/7d) |
| 09:00 | `notifications:generate` | Notifikace (inactive estimates) |
| 09:00 | `invoices:send-pre-reminders` | Připomínka 4 dny před splatností (Karel "visí na větvi") |
| 09:30 | `invoices:send-reminders` | Email upomínky (3/10/21d po splatnosti, jen sent_at != NULL) |

## Email flow (faktura)
```
Den 0:  Faktura odeslána zákazníkovi
Den 10: Připomínka (4 dny před splatností) — 09:00
Den 14: Splatnost
Den 17: 1. upomínka (3 dny po splatnosti) — 09:30
Den 24: 2. upomínka (10 dní po splatnosti) — 09:30
Den 35: 3. upomínka — poslední (21 dní po splatnosti) — 09:30
```
Všechny emaily se logují do `email_logs` a zobrazují v timeline na detailu faktury.

## Statistiky projektu
| Metrika | Hodnota |
|---------|---------|
| Modely | 27 |
| Kontrolery | 32 |
| React stránky | 34 |
| React komponenty | 63 |
| Migrace | 61 |
| Console Commands | 8 |
| Email šablony | 4 |
| Verze | v1.2.2 |
