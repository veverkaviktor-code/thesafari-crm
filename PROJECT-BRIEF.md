# PROJECT BRIEF — CRM hq.thesafari.cz

## Přehled
Interní CRM pro thesafari.cz — kreativní studio (tisk, reklama, polepy, montáže, weby via neniweb.cz).
Single admin, role-ready struktura. Neplátce DPH. Fio Bank API integrace.

## Tech Stack
Laravel 12 + Inertia.js + React 19 + TypeScript + Tailwind 4 + Shadcn/UI + PostgreSQL

## Moduly (stav k 2026-03-07)

### Dokončené (MVP + Round 1-7)
- **Dashboard** — stat cards, revenue chart, division donut chart, MRR, financial summary bar, activity timeline (reálná data, max 7 dní, s odkazy), AttentionAlerts (expand/collapse + ignorování)
- **Zákazníci** — CRUD, glass modal, mini dashboard, tabs (kontakt, služby jako odkazy, faktury, tikety), ARES napojení
- **Zakázky** — CRUD, glass modal, divize, stavy, OrderItems (inline CRUD s auto-price), OrderCosts, TimeTracker s running timer, marže
- **Faktury** — CRUD, auto-numbering (lockForUpdate), SPD QR, PDF, email odesílání, stavy, položky editor, CSV export, Fio bank sync + auto-match, manuální párování, payment-thanks email
- **Neniweb** — domény + hosting + služby, tabs UI, sync z vas-hosting API, platby, auto-invoice, alerts_ignored_at pro ignorování upozornění
- **Subscriptions** — auto-fakturace (cron 07:00), per-služba auto_invoice přepínač, markAsPaid s rozšířením expirace
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

### Budoucí (backlog)
- [ ] Multi-user + role-based access
- [ ] Statistiky a reporty (filtry, export)
- [ ] thajskydotek integrace (WooCommerce sync)
- [ ] confirm() → GlassModal dialog (4 soubory: CustomerProfile, Orders/Show, Neniweb/Edit, Neniweb/Show)
- [ ] Dashboard/Neniweb index stats cachování (Cache::remember)
- [ ] Mail odesílání přes queue (ne synchronně)
- [ ] Soft delete/trash pattern na všechny modely (princip koše)

## Design
Safari Dark paleta — warm dark backgrounds (#0a0a08, #16140f), amber accent (#D97706), warm white (#F5F0E8).
Shadcn/UI komponenty customizované na dark theme.

## Email šablony
| Šablona | Soubor | Trigger |
|---------|--------|---------|
| Faktura | `emails/invoice.blade.php` | Manuální odeslání |
| Upomínka 1-3 | `emails/invoice-reminder.blade.php` | Cron 09:30 (3/10/21 dní po splatnosti) |
| Poděkování za úhradu | `emails/payment-thanks.blade.php` | Automaticky po markAsPaid |

Karel "Lenoch" (lenochod) = maskot fakturace. Obrázky v `storage/app/email-assets/`.

## Server
- VPS: 37.235.108.29 (sss06.vas-server.cz)
- Nginx + PHP 8.3-FPM + PostgreSQL
- SSL: Let's Encrypt
- Deploy: rsync + ssh (viz CLAUDE.md)

## Scheduler (cron)
| Čas | Příkaz | Popis |
|-----|--------|-------|
| 03:00 | `model:prune` | Pruning prunable modelů |
| 03:30 | activity_log cleanup | Mazání activity_log starších 7 dní |
| 07:00 | `subscriptions:auto-invoice` | Auto-fakturace expirujících subscriptions (30d) |
| 08:00-20:00 | `fio:sync` (hourly) | Sync transakcí z Fio Bank API |
| 08:00 | `invoices:check-overdue` | Označení + notifikace overdue faktur |
| 08:30 | `subscriptions:check-expiring` | Notifikace expirujících subscriptions (30/14/7d) |
| 09:00 | `notifications:generate` | Deduplikované notifikace (overdue + expiring + inactive estimates) |
| 09:30 | `invoices:send-reminders` | Email upomínky (3/10/21 dní po splatnosti) |

## Statistiky projektu
| Metrika | Hodnota |
|---------|---------|
| Modely | 19 (+ BankTransaction) |
| Kontrolery | 18 (+ SearchController) |
| React stránky | 28 |
| React komponenty | 55+ |
| Migrace | 43 |
| Console Commands | 6 |
| Email šablony | 3 |
