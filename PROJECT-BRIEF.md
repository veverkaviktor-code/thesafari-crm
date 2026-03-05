# PROJECT BRIEF — CRM hq.thesafari.cz

## Přehled
Interní CRM pro thesafari.cz — kreativní studio (tisk, reklama, polepy, montáže, weby via neniweb.cz).
Single admin, role-ready struktura. Neplátce DPH. Air Bank (budoucí API integrace).

## Tech Stack
Laravel 12 + Inertia.js + React 19 + TypeScript + Tailwind 4 + Shadcn/UI + PostgreSQL

## Moduly (stav k 2026-03-06)

### Dokončené (MVP + Round 1-5)
- **Dashboard** — stat cards, revenue chart, division donut chart, MRR, financial summary bar, activity timeline (reálná data)
- **Zákazníci** — CRUD, glass modal, mini dashboard, tabs (kontakt, služby, faktury, tikety), ARES napojení
- **Zakázky** — CRUD, glass modal, divize, stavy, OrderItems (inline CRUD s auto-price), OrderCosts, TimeTracker s running timer, marže
- **Faktury** — CRUD, auto-numbering (lockForUpdate), SPD QR, PDF, email odesílání, stavy, položky editor, CSV export
- **Neniweb** — domény + hosting + služby, tabs UI, sync z vas-hosting API (Portal + Server + VPS Centrum), platby, auto-invoice
- **Subscriptions** — auto-fakturace (cron 07:00), per-služba auto_invoice přepínač, markAsPaid s rozšířením expirace
- **Finance** — cashflow, revenue breakdown, MRR detail, cost breakdown, invoice aging, profit chart
- **Tikety** — email-based (n8n integrace), thread view, priority, stavy
- **Planner** — tasks CRUD s calendar grid, toggle complete
- **Nastavení** — firma (singleton), profil, heslo
- **Running Timer Bar** — amber sticky lišta pod navbarem
- **Notifikace** — overdue faktury, expirující subscriptions, auto-generování (cron)
- **Přílohy** — file upload/download na zákazníky, zakázky, tikety
- **Globální vyhledávání** — SearchPalette (Cmd+K) přes zákazníky, zakázky, faktury, tikety

### Round 5 — Audit opravy (2026-03-06)
**Backend:**
- FIX: Auto-invoice command (dříve chyběl, scheduler selhal tiše)
- FIX: Race condition v invoice numbering (store obaleno do DB::transaction)
- FIX: Null pointer v markAsPaid (expires_at fallback na now())
- FIX: TimeEntry user auth (abort_if user_id check v update/stop/destroy)
- FIX: Sync bez transakce → DB::transaction (API IO mimo transakci)
- FIX: Scheduler konsolidace (vše v bootstrap/app.php, seřazeno 07:00-09:00)
- FIX: CheckOverdueInvoices deduplikace notifikací
- FIX: Attachment upload s try/catch (cleanup souboru při DB chybě)
- ADD: LogsActivity na User, CompanySetting, Attachment
- ADD: Chybějící relace (Invoice→bankTransaction, Invoice→tasks, BankTransaction→invoices, Customer→tasks/vpsServers, Order→tasks, User→timeEntries)

**Frontend:**
- FIX: Debounce memory leak v search (3 Index stránky — useRef pattern)
- FIX: window.history.back() → router.visit() (5 formulářů)
- FIX: formatCurrency extrahováno do lib/utils.ts (z 21 souborů)
- FIX: FieldError extrahováno do components/ui/FieldError.tsx
- FIX: DataTable key={i} → key={getItemId(item)} pro správný React reconciliation
- FIX: GlassModal ARIA atributy (role="dialog", aria-modal, aria-labelledby)
- FIX: Login stránka diakritika (Přihlášení, Přihlaste se do systému)

**Databáze (migrace):**
- ADD: Indexy na FK sloupce (order_items.order_id, subscription_payments.invoice_id, time_entries.started_at, time_entries(order_id,user_id), tickets(customer_id,status), tasks(customer_id,status))
- FIX: users timestamps → timestampTz (konzistence)
- FIX: billing_cycle normalizace ('one_time' → 'once', zpevněný CHECK)

### Budoucí (backlog)
- [ ] Air Bank API integrace (bankovní výpisy, párování plateb)
- [ ] Email notifikace (faktury, tikety) přes queue
- [ ] Multi-user + role-based access
- [ ] Statistiky a reporty (filtry, export)
- [ ] thajskydotek integrace (WooCommerce sync)
- [ ] confirm() → GlassModal dialog (4 soubory: CustomerProfile, Orders/Show, Neniweb/Edit, Neniweb/Show)
- [ ] SearchController hardcoded URL → route() helper
- [ ] Dashboard/Neniweb index stats cachování (Cache::remember)
- [ ] Mail odesílání přes queue (ne synchronně)

## Design
Safari Dark paleta — warm dark backgrounds (#0a0a08, #16140f), amber accent (#D97706), warm white (#F5F0E8).
Shadcn/UI komponenty customizované na dark theme.

## Server
- VPS: 37.235.108.29 (sss06.vas-server.cz)
- Nginx + PHP 8.3-FPM + PostgreSQL
- SSL: Let's Encrypt
- Deploy: rsync + ssh (viz CLAUDE.md)

## Scheduler (cron)
| Čas | Příkaz | Popis |
|-----|--------|-------|
| 07:00 | `subscriptions:auto-invoice` | Auto-fakturace expirujících subscriptions (30d) |
| 08:00 | `invoices:check-overdue` | Označení + notifikace overdue faktur |
| 08:30 | `subscriptions:check-expiring` | Notifikace expirujících subscriptions (30/14/7d) |
| 09:00 | `notifications:generate` | Deduplikované notifikace (overdue + expiring) |

## Statistiky projektu
| Metrika | Hodnota |
|---------|---------|
| Modely | 18 |
| Kontrolery | 17 |
| React stránky | 27 |
| React komponenty | 50+ |
| Migrace | 41 |
| Console Commands | 4 |
