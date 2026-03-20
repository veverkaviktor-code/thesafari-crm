# Weby Module Rewrite — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the "Webové služby" module from subscription-based to website-based architecture, preserving all data, dashboard stats, invoicing, and financial reporting.

**Architecture:** Rename-in-place approach (Approach A/C from spec). Single atomic DB migration renames tables + columns + adds new schema. Backend fully rewritten in Phase 1 (one deploy), frontend redesigned in Phase 2 (second deploy). All 72 files touched.

**Tech Stack:** Laravel 12, PostgreSQL, Inertia.js, React 19, TypeScript, Tailwind 4

**Spec:** `docs/superpowers/specs/2026-03-20-weby-module-rewrite-design.md`

**Backup:** `backup/v1.1.0-pre-weby-rewrite` (tag + branch)

**IMPORTANT:** No PHP on macOS — all artisan/migration commands run on VPS only. Verify via `npm run build` locally, then deploy + browser test.

---

## Phase 1 — Backend + Minimal Frontend (single deploy)

### Task 1: Database Migration

**Files:**
- Create: `database/migrations/2026_03_20_300000_rewrite_subscriptions_to_websites.php`

This is the most critical task. One atomic migration that does everything.

- [ ] **Step 1: Create migration file**

The migration must execute these steps in order:

```php
// UP:
// 1. Create new tables: management_plans, sync_blacklist, sync_pending, website_credentials
// 2. Seed management_plans (6 rows) and sync_blacklist (35 Lukáš domains)
// 3. Migrate credentials data BEFORE dropping columns:
//    - For each subscription with admin_url+admin_user → INSERT website_credentials
//    - For each subscription with client_user → INSERT website_credentials
// 4. Rename tables: subscriptions→websites, subscription_payments→website_payments, invoice_subscription→invoice_website
// 5. Rename FK columns: subscription_id→website_id (in website_payments, invoice_website, email_accounts)
// 6. PostgreSQL: DROP old unique constraint, ADD new one on invoice_website
// 7. Add new columns to websites: domain_expires_at, hosting_expires_at, hosting_server_id, alias_of_id, management_plan_id, management_cycle, auto_invoice_management
// 8. Rename column: customer_notified_at → last_expiry_notified_at
// 9. Data migration:
//    - UPDATE websites SET hosting_expires_at = expires_at WHERE type = 'hosting' OR type = 'sluzba'
//    - UPDATE websites SET domain_expires_at = expires_at WHERE type = 'domena' AND is_registered_by_us = true
//    - UPDATE websites SET hosting_server_id = vps_server_id
//    - UPDATE websites SET alias_of_id = parent_subscription_id
// 10. Drop old columns: type, provider, price_yearly, billing_cycle, monthly_price, monthly_plan, portal_domain_id, vas_hosting_id, tariff, managed_since, expires_at, parent_subscription_id, vps_server_id, admin_user, admin_password, client_user, client_password, folder_id
// 11. Add invoice_type column to invoice_website (default 'hosting')
// 12. Cleanup notifications JSON data (subscription_id→website_id, /neniweb/→/webove-sluzby/)
// 13. DROP TABLE subscription_folders

// DOWN: Full 12-step rollback as described in spec Section 11
```

**Blacklist seed data (35 domains):**
```
beautyateliervoznicova.cz, bropit.cz, ceskapropiska.cz, dominikpodsednik.cz,
dtftransferytisk.cz, hotel-slaviaholesov.cz, kempujstylove.cz,
kovovepropiskypotisk.cz, kubicek-shop.com, mipak.cz, mltfa.cz, natisknito.cz,
okruhovejizdy.cz, orelslapanice.cz, orlovnaslapanice.cz, podolisrdcem.cz,
prolepsibosonohy.cz, rautec.cz, rdpromo.cz, reklamnidarky.cz,
reklamnipropiskypotisk.cz, reklamnitextilpotisk.cz, rismont.cz,
sedlackovi2026.cz, snurkynakrkpotisk.cz, strakovi2025.cz,
svobodapridal.cz, synwase.cz, tabarin.cz, truhlarstvidv.cz,
vonkypotisk.cz, zapalovacepotisk.cz, alfabrno.eu
```

**Management plans seed:**
```
(Bez správy, 0), (Základ, 490), (Klidný spánek, 1490),
(Aktivní rozvoj, 2990), (VIP péče, 5990)
```

- [ ] **Step 2: Verify migration syntax**

Since no PHP locally, review the migration carefully for PostgreSQL compatibility:
- All `DB::statement()` for renames (not Schema builder which may fail on PG constraint renames)
- `RENAME TABLE` → `ALTER TABLE ... RENAME TO ...` (PG syntax)
- `RENAME COLUMN` → `ALTER TABLE ... RENAME COLUMN ... TO ...`
- Check all CHECK constraints survive rename

- [ ] **Step 3: Commit**

```bash
git add database/migrations/2026_03_20_300000_rewrite_subscriptions_to_websites.php
git commit -m "feat: add atomic migration for subscriptions→websites rewrite"
```

---

### Task 2: New Models

**Files:**
- Create: `app/Models/Website.php` (rewrite of Subscription.php)
- Create: `app/Models/WebsitePayment.php` (rewrite of SubscriptionPayment.php)
- Create: `app/Models/WebsiteCredential.php` (new)
- Create: `app/Models/ManagementPlan.php` (new)
- Create: `app/Models/SyncBlacklist.php` (new)
- Create: `app/Models/SyncPending.php` (new)
- Delete: `app/Models/Subscription.php`
- Delete: `app/Models/SubscriptionPayment.php`
- Delete: `app/Models/SubscriptionFolder.php`

- [ ] **Step 1: Create Website model**

Based on `Subscription.php` but with new schema:
- Table: `websites`
- Fillable: remove dropped columns, add new ones (domain_expires_at, hosting_expires_at, hosting_server_id, alias_of_id, management_plan_id, management_cycle, auto_invoice_management, last_expiry_notified_at)
- Casts: `domain_expires_at` → datetime, `hosting_expires_at` → datetime, `starts_at` → date
- Hidden: (none — credentials moved to separate model)
- Relations:
  - `customer()` → BelongsTo Customer
  - `payments()` → HasMany WebsitePayment (FK: website_id)
  - `emailAccounts()` → HasMany EmailAccount (FK: website_id)
  - `credentials()` → HasMany WebsiteCredential
  - `hostingServer()` → BelongsTo VpsServer (FK: hosting_server_id)
  - `aliasOf()` → BelongsTo Website (FK: alias_of_id)
  - `aliases()` → HasMany Website (FK: alias_of_id)
  - `managementPlan()` → BelongsTo ManagementPlan
  - `invoices()` → BelongsToMany Invoice via `invoice_website` with pivot `invoice_type`
- Scopes: `scopeActive`, remove `scopeByType`
- Methods: update `daysUntilExpiry()` to use hosting_expires_at, update `monthlyRevenue()` to `sell_yearly / 12`
- Traits: HasFactory, LogsActivity, SoftDeletes

- [ ] **Step 2: Create WebsitePayment model**

Copy from SubscriptionPayment, change:
- Table: `website_payments`
- FK: `website_id` (not subscription_id)
- Relation: `website()` → BelongsTo Website

- [ ] **Step 3: Create WebsiteCredential model**

```php
class WebsiteCredential extends Model {
    protected $fillable = ['website_id', 'label', 'login', 'password', 'notes', 'sort_order'];
    protected $hidden = ['password'];
    protected $casts = ['password' => 'encrypted'];
    public function website(): BelongsTo { return $this->belongsTo(Website::class); }
}
```

- [ ] **Step 4: Create ManagementPlan model**

```php
class ManagementPlan extends Model {
    protected $fillable = ['name', 'price_monthly', 'is_active', 'sort_order'];
    protected $casts = ['is_active' => 'boolean'];
    public function websites(): HasMany { return $this->hasMany(Website::class); }
}
```

- [ ] **Step 5: Create SyncBlacklist + SyncPending models**

Simple models with fillable fields, no relations needed.

- [ ] **Step 6: Delete old models**

```bash
rm app/Models/Subscription.php app/Models/SubscriptionPayment.php app/Models/SubscriptionFolder.php
```

- [ ] **Step 7: Update EmailAccount model**

Modify: `app/Models/EmailAccount.php`
- Change `subscription()` → `website()` BelongsTo
- FK: `website_id`

- [ ] **Step 8: Update Invoice model**

Modify: `app/Models/Invoice.php`
- Line 112-115: `subscriptions()` → `websites()`, pivot table `invoice_website`, FK `website_id`, withPivot `invoice_type`
- Lines 132-173: Rewrite `processPayment()`:
  - `$this->websites` instead of `$this->subscriptions`
  - Payment amount: `$website->sell_yearly ?: $website->cost_yearly`
  - Hosting type: extend `hosting_expires_at` + conditionally `domain_expires_at`
  - Include period_start, period_end, status, paid_at, invoice_id fields

- [ ] **Step 9: Update Customer model**

Modify: `app/Models/Customer.php`
- Line 66-69: `subscriptions()` → `websites()` HasMany

- [ ] **Step 10: Update VpsServer model**

Modify: `app/Models/VpsServer.php`
- Lines 47-56: Change FK from `vps_server_id` to `hosting_server_id`
- Change `Subscription::class` → `Website::class`
- Remove `where('type', 'hosting')` filter (no type column anymore)

- [ ] **Step 11: Commit**

```bash
git add app/Models/
git commit -m "feat: replace Subscription models with Website models"
```

---

### Task 3: Controllers — WebsiteController

**Files:**
- Create: `app/Http/Controllers/WebsiteController.php` (rewrite of SubscriptionController.php)
- Create: `app/Http/Controllers/WebsiteCredentialController.php` (new)
- Delete: `app/Http/Controllers/SubscriptionController.php`
- Delete: `app/Http/Controllers/SubscriptionFolderController.php`

- [ ] **Step 1: Create WebsiteController**

Rewrite from SubscriptionController (966 lines). Key changes:
- All `Subscription` → `Website`, `SubscriptionPayment` → `WebsitePayment`
- `index()`: Remove 3-tab structure (domény/hostingy/služby). Single paginated query of all websites. Load aliases nested under parents. Include credentials, emailAccounts.
- `show()`: Load credentials, emailAccounts, payments, invoices. Use `makeVisible()` for credentials passwords.
- `store()`/`update()`: New validation rules for domain_expires_at, hosting_expires_at, hosting_server_id, alias_of_id, management_plan_id, management_cycle
- `createInvoice()`: Use `invoice_website` pivot with `invoice_type: hosting`
- `sync()`: Add blacklist filtering + sync_pending logic (see spec Section 5)
- Remove: `updateFolder()` method (folders gone)
- Add: `pending()`, `approvePending()`, `ignorePending()` methods for Ke schválení

- [ ] **Step 2: Create WebsiteCredentialController**

CRUD for credentials:
- `store(Request $request, Website $website)` — validate label/login/password, create
- `update(Request $request, WebsiteCredential $credential)` — validate, update
- `destroy(WebsiteCredential $credential)` — delete

- [ ] **Step 3: Delete old controllers**

```bash
rm app/Http/Controllers/SubscriptionController.php app/Http/Controllers/SubscriptionFolderController.php
```

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/
git commit -m "feat: replace SubscriptionController with WebsiteController"
```

---

### Task 4: Controllers — Dashboard, Finance, Customer, Invoice, Search, Task, VpsServer, EmailAccount

**Files:**
- Modify: `app/Http/Controllers/DashboardController.php`
- Modify: `app/Http/Controllers/FinanceController.php`
- Modify: `app/Http/Controllers/CustomerController.php`
- Modify: `app/Http/Controllers/InvoiceController.php`
- Modify: `app/Http/Controllers/SearchController.php`
- Modify: `app/Http/Controllers/TaskController.php`
- Modify: `app/Http/Controllers/VpsServerController.php`
- Modify: `app/Http/Controllers/EmailAccountController.php`

- [ ] **Step 1: Update DashboardController**

- Replace `use App\Models\Subscription` → `use App\Models\Website`
- Replace `use App\Models\SubscriptionPayment` → `use App\Models\WebsitePayment`
- `getMRR()`: Remove `billing_cycle`/`monthly_price` logic. Always `sell_yearly / 12`. Add management plan MRR: `managementPlan->price_monthly`.
- `getAttentionAlerts()`: Replace `Subscription::` → `Website::`, use `hosting_expires_at` instead of `expires_at`, use `hosting_server_id` instead of `vps_server_id`
- `getIgnoredAlerts()`: Same replacements
- `getNeniwebStats()`: Rename to `getWebsiteStats()`, use new column names
- Activity mapping: `'Subscription'` → `'Website'`
- Navigation links: `/neniweb/` → `/webove-sluzby/`
- `getReceivables()`: `SubscriptionPayment` → `WebsitePayment`

- [ ] **Step 2: Update FinanceController**

- Same import replacements
- `getOverallMetrics()`: `SubscriptionPayment` → `WebsitePayment`, `Subscription::sum('cost_yearly')` → `Website::sum('cost_yearly')`
- MRR calculation: same simplification as Dashboard
- All `subscription` references → `website`
- Links: `/neniweb/{id}` → `/webove-sluzby/{id}`

- [ ] **Step 3: Update CustomerController**

- Line 41: `$customer->load(['websites'])` (was subscriptions)
- Lines 47-56: `websiteCosts` calculation from websites relation
- Stats: `active_websites` count (was active_subscriptions)
- Pass `websites` to Inertia (was subscriptions)

- [ ] **Step 4: Update InvoiceController**

- Line 60: Load `websites:id,name,hosting_expires_at,domain_expires_at` (was subscriptions:id,name,type,expires_at)
- Line 286: Load `websites` (was subscriptions)

- [ ] **Step 5: Update SearchController**

- Line 9: `use App\Models\Website`
- Lines 76-90: Query `Website::where(...)`, link `/webove-sluzby/{id}`, type `website`

- [ ] **Step 6: Update TaskController (calendar)**

- Line 8: `use App\Models\Website`
- Lines 78-89: Query `Website::where('status', 'aktivni')->whereNotNull('hosting_expires_at')`, use `hosting_expires_at` for calendar events, type `website`, link `/webove-sluzby/{id}`

- [ ] **Step 7: Update VpsServerController**

- Line 5: `use App\Models\Website`
- Line 56: `Website::where('hosting_server_id', $vp->id)->update(['hosting_server_id' => null])`
- Lines 72-98: Reference `hosting_server_id` instead of `vps_server_id`, `Website` instead of `Subscription`

- [ ] **Step 8: Update EmailAccountController**

- Line 6: `use App\Models\Website`
- Line 11: `public function store(Request $request, Website $website)`

- [ ] **Step 9: Commit**

```bash
git add app/Http/Controllers/
git commit -m "feat: update all controllers from Subscription to Website references"
```

---

### Task 5: Commands + Notifications + Scheduler

**Files:**
- Create: `app/Console/Commands/AutoInvoiceWebsites.php` (rewrite)
- Create: `app/Console/Commands/CheckExpiringWebsites.php` (rewrite)
- Create: `app/Notifications/WebsiteExpiring.php` (rewrite)
- Create: `app/Notifications/WebsiteInvoiceCreated.php` (rewrite)
- Modify: `app/Console/Commands/GenerateNotifications.php`
- Modify: `app/Console/Commands/SendInvoiceReminders.php` (if links exist)
- Modify: `bootstrap/app.php`
- Delete: `app/Console/Commands/AutoInvoiceSubscriptions.php`
- Delete: `app/Console/Commands/CheckExpiringSubscriptions.php`
- Delete: `app/Notifications/SubscriptionExpiring.php`
- Delete: `app/Notifications/SubscriptionInvoiceCreated.php`

- [ ] **Step 1: Create AutoInvoiceWebsites command**

Signature: `websites:auto-invoice {--dry-run}`
Key changes from old:
- Query `Website::where(...)` instead of `Subscription`
- Filter: `whereNull('alias_of_id')` (was `whereNull('parent_subscription_id')`)
- Use `hosting_expires_at` (was `expires_at`)
- Price: `sell_yearly` (no `price_yearly` fallback)
- Pivot: `invoice_website` with `invoice_type: hosting`
- Notification: `WebsiteInvoiceCreated`

- [ ] **Step 2: Create CheckExpiringWebsites command**

Signature: `websites:check-expiring`
- Query `Website` instead of `Subscription`
- Use `hosting_expires_at` instead of `expires_at`
- Use `last_expiry_notified_at` instead of `customer_notified_at`
- Notification: `WebsiteExpiring`

- [ ] **Step 3: Create WebsiteExpiring + WebsiteInvoiceCreated notifications**

- `WebsiteExpiring`: Link `/webove-sluzby/{id}`, data key `website_id`
- `WebsiteInvoiceCreated`: Rename `subscriptionNames` → `websiteNames`

- [ ] **Step 4: Update GenerateNotifications**

- `use App\Models\Website`
- `use App\Notifications\WebsiteExpiring`
- Query `Website::where(...)` for expiring/expired
- Dedup: `data::jsonb->>'website_id'` (was `subscription_id`)

- [ ] **Step 5: Update SendInvoiceReminders** (if has /neniweb links)

Check file and update any links to `/webove-sluzby/`

- [ ] **Step 6: Update bootstrap/app.php scheduler**

```php
$schedule->command('websites:auto-invoice')->dailyAt('07:00');
$schedule->command('websites:check-expiring')->dailyAt('08:30');
```

- [ ] **Step 7: Delete old files**

```bash
rm app/Console/Commands/AutoInvoiceSubscriptions.php
rm app/Console/Commands/CheckExpiringSubscriptions.php
rm app/Notifications/SubscriptionExpiring.php
rm app/Notifications/SubscriptionInvoiceCreated.php
```

- [ ] **Step 8: Commit**

```bash
git add app/Console/ app/Notifications/ bootstrap/app.php
git commit -m "feat: rename subscription commands and notifications to website"
```

---

### Task 6: Routes

**Files:**
- Modify: `routes/web.php`

- [ ] **Step 1: Rewrite routes**

Replace all `/neniweb` routes with `/webove-sluzby`. Key rules:
- **Static routes FIRST** (before `{website}` parameter): `/sync`, `/bulk-update`, `/vytvorit`, `/ke-schvaleni`, `/vps/*`, `/faktura-zakaznik/*`
- Use `WebsiteController::class` everywhere
- Use `WebsiteCredentialController::class` for credentials
- Remove `SubscriptionFolderController` routes
- Add: `/ke-schvaleni` (GET), `/ke-schvaleni/approve` (POST), `/ke-schvaleni/ignore` (POST)
- Add: credential CRUD routes
- Add: 301 redirect for old `/neniweb*` URLs

Route names: `websites.*` (was `neniweb.*`)

Remove imports:
```php
// Remove:
use App\Http\Controllers\SubscriptionController;
use App\Http\Controllers\SubscriptionFolderController;
// Add:
use App\Http\Controllers\WebsiteController;
use App\Http\Controllers\WebsiteCredentialController;
```

- [ ] **Step 2: Add 301 redirects**

```php
// Legacy redirects
Route::get('/neniweb/{any?}', fn($any = '') => redirect("/webove-sluzby/{$any}", 301))->where('any', '.*');
```

- [ ] **Step 3: Commit**

```bash
git add routes/web.php
git commit -m "feat: rewrite routes from /neniweb to /webove-sluzby"
```

---

### Task 7: VasHostingService Update

**Files:**
- Modify: `app/Services/VasHostingService.php`

- [ ] **Step 1: Update service**

No model references in this file — it returns raw arrays. But the `sync()` method in `WebsiteController` will call it differently. The service itself stays mostly unchanged.

Check if any method references `Subscription` model directly. If not, no changes needed.

- [ ] **Step 2: Commit (if changes made)**

---

### Task 8: Frontend — Minimal Updates (Phase 1)

**Goal:** Make existing Neniweb pages work with new backend. NOT a redesign — just rename props/interfaces/links so the build passes and pages render.

**Files to rename (directory):**
- `resources/js/pages/Neniweb/` → `resources/js/pages/WeboveSluzby/`
- `resources/js/components/neniweb/` → `resources/js/components/webove-sluzby/`

**Files to modify:**
- All 4 pages: Index.tsx, Show.tsx, Create.tsx, Edit.tsx
- NeniwebForm.tsx → WebsiteForm.tsx
- ExpirationBadge.tsx (if exists)
- Sidebar.tsx
- SearchPalette.tsx
- AttentionAlerts.tsx
- Receivables.tsx
- NeniwebOverview.tsx → WebsiteOverview.tsx
- CalendarGrid.tsx
- CustomerTabs.tsx + CustomerServices.tsx + CustomerMiniDashboard.tsx
- MrrDetail.tsx
- NotificationBell.tsx
- Invoices/Show.tsx
- Customers/Show.tsx
- Dashboard.tsx
- Finance.tsx
- Planner/Index.tsx

- [ ] **Step 1: Rename directories**

```bash
mv resources/js/pages/Neniweb resources/js/pages/WeboveSluzby
mv resources/js/components/neniweb resources/js/components/webove-sluzby
```

- [ ] **Step 2: Update page files (WeboveSluzby/*)**

In each page (Index, Show, Create, Edit):
- Update Inertia page component registration (the component path used by Inertia)
- Replace all `subscription` → `website` in props interfaces
- Replace all `/neniweb/` → `/webove-sluzby/` in router.post/visit/delete calls
- Replace all `neniweb.*` route names if used
- Replace `Subscription` interface → `Website` interface
- Replace `SubscriptionPayment` → `WebsitePayment` type
- Remove folder-related code (SubscriptionFolder, folder_id)
- Keep the tab-based UI layout for now (Phase 2 will redesign)

- [ ] **Step 3: Rename component files**

```bash
mv resources/js/components/webove-sluzby/NeniwebForm.tsx resources/js/components/webove-sluzby/WebsiteForm.tsx
```

Update WebsiteForm.tsx: interface names, prop names.

- [ ] **Step 4: Update Sidebar.tsx**

Line 42: `{ label: 'Webové služby', href: '/webove-sluzby', icon: Globe }`
Active detection: `url.startsWith('/webove-sluzby')`

- [ ] **Step 5: Update SearchPalette.tsx**

- Category: `websites` (was `subscriptions`)
- Type: `website` (was `subscription`)

- [ ] **Step 6: Update AttentionAlerts.tsx**

- Lines 73, 96: `router.post('/webove-sluzby/${id}/toggle-ignore')` (was `/neniweb/${subscription_id}/toggle-ignore-alerts`)
- Field: `website_id` (was `subscription_id`)

- [ ] **Step 7: Update Receivables.tsx**

- Type: `website` (was `subscription`)
- Stat: `unpaid_websites` (was `unpaid_subscriptions`)
- Links: `/webove-sluzby/{id}`

- [ ] **Step 8: Update NeniwebOverview → WebsiteOverview**

```bash
mv resources/js/components/dashboard/NeniwebOverview.tsx resources/js/components/dashboard/WebsiteOverview.tsx
```
- Interface: `ExpiringWebsite` (was `ExpiringSubscription`)
- Links: `/webove-sluzby/{id}`
- Prop name: `websiteStats` (was `neniwebStats`)

- [ ] **Step 9: Update CalendarGrid.tsx**

- `calendarEvents.websites` (was `subscriptions`)
- Type: `website`, router.visit `/webove-sluzby/{id}`

- [ ] **Step 10: Update Customer components**

CustomerTabs.tsx, CustomerServices.tsx, CustomerMiniDashboard.tsx:
- Interface: `Website` (was `Subscription`)
- Prop: `websites` (was `subscriptions`)
- Stat: `active_websites` (was `active_subscriptions`)
- Links: `/webove-sluzby/{id}`

- [ ] **Step 11: Update MrrDetail.tsx**

- Links: `router.visit('/webove-sluzby/${id}')`

- [ ] **Step 12: Update NotificationBell.tsx**

- `website_expiring` (was `subscription_expiring`)

- [ ] **Step 13: Update Invoices/Show.tsx**

- `invoice.websites` (was `invoice.subscriptions`)
- Links: `/webove-sluzby/{id}`

- [ ] **Step 14: Update Dashboard.tsx, Finance.tsx, Planner/Index.tsx, Customers/Show.tsx**

- Prop names: `websiteStats`, `websites` etc.
- Remove any `subscription`/`Subscription` references
- Update import paths from `Neniweb` → `WeboveSluzby`

- [ ] **Step 15: Build check**

```bash
cd "/Users/viktorveverka/CLAUDE PROJECTS/thesafari/crm" && npm run build
```

Fix any TypeScript errors until build passes.

- [ ] **Step 16: Commit**

```bash
git add resources/js/
git commit -m "feat: rename all frontend from Neniweb/subscription to WeboveSluzby/website"
```

---

### Task 9: Documentation Update

**Files:**
- Modify: `CLAUDE.md`
- Modify: `PROJECT-BRIEF.md`

- [ ] **Step 1: Update CLAUDE.md**

- Routes: `/neniweb` → `/webove-sluzby`
- Models: Subscription → Website
- Table names in konvence section

- [ ] **Step 2: Update PROJECT-BRIEF.md**

- Module name: "Webové služby" (Websites)
- Update model counts, page counts
- Update scheduler commands table
- Add new features: credentials, management plans, blacklist, ke schválení

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md PROJECT-BRIEF.md
git commit -m "docs: update project docs for websites rewrite"
```

---

### Task 10: Phase 1 Deploy + Verify

- [ ] **Step 1: Final build check**

```bash
npm run build
```

- [ ] **Step 2: Deploy to VPS**

```bash
# Rsync PHP files
rsync -avz --include='app/***' --include='database/***' --include='resources/***' --include='routes/***' --include='bootstrap/***' --exclude='*' ./ root@sss06.vas-server.cz:/var/www/hq.thesafari.cz/

# Rsync built assets
rsync -avz --delete public/build/ root@sss06.vas-server.cz:/var/www/hq.thesafari.cz/public/build/

# Run migration + clear caches
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && php artisan migrate --force && php artisan config:cache && php artisan route:cache && php artisan view:cache"
```

- [ ] **Step 3: Verify via Playwright browser walkthrough**

Check:
1. Login works
2. Dashboard loads (stats, MRR, attention alerts, receivables)
3. `/webove-sluzby` loads (list of websites)
4. `/webove-sluzby/{id}` shows detail
5. `/neniweb` redirects to `/webove-sluzby`
6. Search finds websites
7. Customer detail shows linked websites
8. Invoice detail shows linked websites
9. Finance page loads (MRR, cashflow)
10. Calendar shows website expiration events
11. No console errors

- [ ] **Step 4: Tag release**

```bash
git tag v1.2.0-phase1 -m "Weby module rewrite Phase 1 — backend complete"
```

---

## Phase 2 — New Frontend (second deploy)

### Task 11: New Index Page — Single List + Filters

**Files:**
- Rewrite: `resources/js/pages/WeboveSluzby/Index.tsx`

- [ ] **Step 1: Redesign Index**

Single DataTable (no tabs for domény/hostingy/služby). Columns:
- Name (+ alias badge if alias_of_id)
- Zákazník
- Server (hosting_server.name)
- Doména exp. (domain_expires_at with ExpirationBadge)
- Hosting exp. (hosting_expires_at with ExpirationBadge)
- Storage (bar: used/quota)
- Cena (sell_yearly)
- Správa (management_plan.name)

Aliasy odsazené pod parent webem (tree view).

Filtry: zákazník, server, stav, balíček, expirace urgence, is_registered_by_us.

Badge "Ke schválení (X)" button in header → links to `/webove-sluzby/ke-schvaleni`.

Tabs zachovat pro:
- Tab "VPS servery" (přehled kapacity) — keep existing
- Tab "Výjimky syncu" (blacklist management)

- [ ] **Step 2: Build + commit**

---

### Task 12: New Show Page — Credentials + Two Expirations

**Files:**
- Rewrite: `resources/js/pages/WeboveSluzby/Show.tsx`

- [ ] **Step 1: Redesign Show**

Header card: name, customer, status, two expiration badges side by side.

Info section: server, storage bar, IP, is_registered_by_us, sell_yearly, management plan + cycle.

Sections (accordion or tabs):
1. **Credentials** — dynamic list, each row: label, login, password (eye+copy), notes. Add/edit/delete buttons.
2. **Emaily** — same as before (email + password + quota)
3. **Platby** — payment history table
4. **Faktury** — linked invoices

Action buttons: Fakturovat, Fakturovat vše, Edit, Delete.

- [ ] **Step 2: Build + commit**

---

### Task 13: New Create/Edit Forms

**Files:**
- Rewrite: `resources/js/pages/WeboveSluzby/Create.tsx`
- Rewrite: `resources/js/pages/WeboveSluzby/Edit.tsx`
- Rewrite: `resources/js/components/webove-sluzby/WebsiteForm.tsx`

- [ ] **Step 1: Redesign form**

Fields:
- name, customer (select), hosting_server (select from vps_servers)
- domain_expires_at (date), hosting_expires_at (date)
- sell_yearly, cost_yearly
- management_plan (select from management_plans), management_cycle (select: quarterly/semi_annual/annual)
- alias_of (select from websites, optional)
- is_registered_by_us (toggle), auto_invoice (toggle), auto_invoice_management (toggle)
- is_external, is_free, auto_renew (toggles)
- admin_url, notes

Remove: type, provider, billing_cycle, monthly_price, folder_id, parent_subscription_id

- [ ] **Step 2: Build + commit**

---

### Task 14: Ke Schválení Page

**Files:**
- Create: `resources/js/pages/WeboveSluzby/Pending.tsx`

- [ ] **Step 1: Create Pending page**

Simple list from `sync_pending` table:
- Domain name
- Source (portal/sss06/ond08/thaimassage)
- Discovered date
- Actions: "Přidat" button, "Ignorovat" button

"Přidat" → POST `/webove-sluzby/ke-schvaleni/approve` with domain_name
"Ignorovat" → POST `/webove-sluzby/ke-schvaleni/ignore` with domain_name

- [ ] **Step 2: Build + commit**

---

### Task 15: Settings — Management Plans + Blacklist

**Files:**
- Modify: `resources/js/pages/Settings/Index.tsx` (add tabs)
- Create: `app/Http/Controllers/ManagementPlanController.php`
- Create: `app/Http/Controllers/SyncBlacklistController.php`
- Modify: `routes/web.php` (add settings routes)

- [ ] **Step 1: Management Plans CRUD**

Backend: simple CRUD controller.
Frontend: Settings tab "Balíčky správy" — table with name, price, active toggle, sort order. Add/edit/delete.

- [ ] **Step 2: Sync Blacklist management**

Backend: list + delete controller.
Frontend: Settings tab "Výjimky syncu" — table with domain_name, reason, date. "Odebrat" button.

- [ ] **Step 3: Build + commit**

---

### Task 16: Dashboard Components Redesign

**Files:**
- Rewrite: `resources/js/components/dashboard/WebsiteOverview.tsx`

- [ ] **Step 1: Update WebsiteOverview**

Show:
- Total websites count
- Expiring soon (7 days) count
- Storage overview per server (bar charts)
- Top 5 expiring websites (links)

- [ ] **Step 2: Build + commit**

---

### Task 17: Phase 2 Deploy + Final Verify

- [ ] **Step 1: Build**
- [ ] **Step 2: Deploy**
- [ ] **Step 3: Full Playwright walkthrough**
- [ ] **Step 4: Run first sync manually** (button on /webove-sluzby)
- [ ] **Step 5: Verify sync results** — check websites updated, pending items shown
- [ ] **Step 6: Tag release**

```bash
git tag v1.2.0 -m "Weby module rewrite complete — Phase 1+2"
```

- [ ] **Step 7: Update CHANGELOG.md, PROJECT-BRIEF.md, version in footer**
- [ ] **Step 8: Push to GitHub**

---

## Summary

| Phase | Tasks | Files | Est. commits |
|-------|-------|-------|-------------|
| Phase 1 | Tasks 1-10 | ~50 files | 8 commits |
| Phase 2 | Tasks 11-17 | ~15 files | 7 commits |
| **Total** | **17 tasks** | **~65 files** | **15 commits** |
