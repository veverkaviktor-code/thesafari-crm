# Auto-fakturace + Mobile Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Automaticka tvorba faktur za domeny/hostingy pred expiraci + mobilni zobrazeni CRM.

**Architecture:** 4 releasy (DB zaklad -> auto-fakturace command -> UI zmeny -> mobile). Domeny = zdroj pravdy vas-hosting API. Hosting follows domena. Domena+hosting se stejnym name = 1 faktura.

**Tech Stack:** Laravel 12, PHP 8.3, PostgreSQL, Inertia.js, React 19, TypeScript, Tailwind 4, Shadcn/UI

**DULEZITE:** PHP NENI na macOS. Artisan prikazy JEN na VPS pres SSH. Build frontend lokalne, rsync na VPS.

**Design:** docs/plans/2026-03-05-auto-invoicing-mobile-design.md

---

## RELEASE 1: DB + Backend zaklad

### Task 1: Migrace — auto_invoice na subscriptions

**Files:**
- Create: `database/migrations/2026_03_05_000001_add_auto_invoice_to_subscriptions.php`

**Step 1: Vytvor migraci**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->boolean('auto_invoice')->default(true)->after('auto_renew');
        });
    }

    public function down(): void
    {
        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn('auto_invoice');
        });
    }
};
```

**Step 2: Commit**

```bash
git add database/migrations/2026_03_05_000001_add_auto_invoice_to_subscriptions.php
git commit -m "feat: add auto_invoice column to subscriptions"
```

---

### Task 2: Migrace — invoice_subscription pivot tabulka

**Files:**
- Create: `database/migrations/2026_03_05_000002_create_invoice_subscription_table.php`

**Step 1: Vytvor migraci**

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_subscription', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->foreignId('subscription_id')->constrained('subscriptions')->onDelete('restrict');
            $table->timestampTz('created_at')->useCurrent();

            $table->unique(['invoice_id', 'subscription_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_subscription');
    }
};
```

**Step 2: Commit**

```bash
git add database/migrations/2026_03_05_000002_create_invoice_subscription_table.php
git commit -m "feat: create invoice_subscription pivot table"
```

---

### Task 3: Update Invoice model — ciselne rady + subscriptions relace

**Files:**
- Modify: `app/Models/Invoice.php`

**Step 1: Pridej subscriptions relaci**

Na konec tridy (pred posledni `}`), pridej:

```php
public function subscriptions(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
{
    return $this->belongsToMany(Subscription::class, 'invoice_subscription')
        ->withPivot('created_at');
}
```

**Step 2: Uprav getNextInvoiceNumber() — pridej $series parametr**

Nahrad metodu `getNextInvoiceNumber()` (radky 73-91):

```php
public static function getNextInvoiceNumber(string $series = '1'): string
{
    return DB::transaction(function () use ($series) {
        $year = now()->year;
        $prefix = $year . $series;

        $lastInvoice = static::withTrashed()
            ->where('invoice_number', 'LIKE', $prefix . '%')
            ->orderByRaw('CAST(invoice_number AS INTEGER) DESC')
            ->lockForUpdate()
            ->first();

        if ($lastInvoice) {
            return (string) ((int) $lastInvoice->invoice_number + 1);
        }

        return $prefix . '001';
    });
}
```

**Step 3: Commit**

```bash
git add app/Models/Invoice.php
git commit -m "feat: add invoice series support and subscription relation"
```

---

### Task 4: Update Subscription model — auto_invoice + invoices relace

**Files:**
- Modify: `app/Models/Subscription.php`

**Step 1: Pridej 'auto_invoice' do $fillable (za 'auto_renew' na radku 40)**

V poli $fillable pridej radek za `'auto_renew'`:
```php
'auto_invoice',
```

**Step 2: Pridej cast do casts() metody (za 'auto_renew' => 'boolean')**

```php
'auto_invoice' => 'boolean',
```

**Step 3: Pridej invoices relaci na konec tridy (pred posledni `}`)**

```php
public function invoices(): \Illuminate\Database\Eloquent\Relations\BelongsToMany
{
    return $this->belongsToMany(Invoice::class, 'invoice_subscription')
        ->withPivot('created_at');
}

public function hasOpenInvoice(): bool
{
    return $this->invoices()
        ->whereIn('status', ['vystavena', 'odeslana'])
        ->exists();
}
```

**Step 4: Commit**

```bash
git add app/Models/Subscription.php
git commit -m "feat: add auto_invoice field and invoice relation to Subscription"
```

---

### Task 5: Sync fix — domeny prepisuji expires_at z API

**Files:**
- Modify: `app/Http/Controllers/SubscriptionController.php` (sync metoda, radky 437-611)

**Step 1: Portal API sync (domeny) — radky kolem 470-490**

Najdi blok kde se updatuje existujici domena (kolem radku 477 s komentarem "NEVER overwrite expires_at").
Nahrad ten blok:

```php
if ($domain) {
    // Domains: API is source of truth for expires_at
    if ($info['expiration'] ?? null) {
        $data['expires_at'] = $info['expiration'];
    }
    $oldExpiresAt = $domain->expires_at?->toDateString();
    $domain->update($data);

    // If domain expiration changed, update linked hosting
    if (isset($data['expires_at']) && $oldExpiresAt !== $data['expires_at']) {
        Subscription::where('type', 'hosting')
            ->where('name', $domainName)
            ->where('customer_id', $domain->customer_id)
            ->update(['expires_at' => $data['expires_at']]);
    }

    $syncedDomains++;
}
```

**Step 2: VPS Centrum API sync (radky kolem 580-590)**

Najdi blok s komentarem "NEVER overwrite expires_at" pro VPS Centrum domeny.
Tyto domeny jsou taky zdrojem pravdy — updatuj stejne:

```php
if ($hosting) {
    // VPS Centrum: update storage but NOT expires_at for hostings
    // (hosting expires_at follows domain, updated by portal sync)
    $hosting->update($data);
    $syncedHostings++;
}
```

**Step 3: Server API sync (hostingy na sss06) — radky kolem 520-530**

Hostingy: ponech "NEVER overwrite" — hosting expires_at ridi CRM (follows domena):

```php
if ($hosting) {
    // Hostings: CRM manages expires_at (follows domain expiration)
    $hosting->update($data);
    $syncedHostings++;
}
```

Pozn: expires_at NENI v $data pro hostingy (jen storage + synced_at), takze se neprepise.

**Step 4: Commit**

```bash
git add app/Http/Controllers/SubscriptionController.php
git commit -m "fix: domain sync overwrites expires_at from registrar (source of truth)"
```

---

### Task 6: Deploy Release 1

**Step 1: Build + deploy**

```bash
cd "/Users/viktorveverka/CLAUDE PROJECTS/thesafari/crm"
rsync -avz --include='app/***' --include='database/***' --include='resources/***' --include='routes/***' --exclude='*' ./ root@sss06.vas-server.cz:/var/www/hq.thesafari.cz/
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && php artisan migrate --force && php artisan config:cache && php artisan route:cache"
```

**Step 2: Overeni na VPS**

```bash
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && php artisan tinker --execute=\"echo Subscription::first()->auto_invoice;\""
```

Ocekavany vysledek: `1` (true, default)

**Step 3: Commit tag**

```bash
git tag release-1-db-foundation
```

---

## RELEASE 2: Auto-fakturace

### Task 7: Vytvor SubscriptionInvoiceCreated notifikaci

**Files:**
- Create: `app/Notifications/SubscriptionInvoiceCreated.php`

**Step 1: Vytvor notifikaci**

```php
<?php

namespace App\Notifications;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SubscriptionInvoiceCreated extends Notification
{
    use Queueable;

    public function __construct(
        public Invoice $invoice,
        public array $subscriptionNames
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toArray($notifiable): array
    {
        $names = implode(', ', $this->subscriptionNames);
        return [
            'type' => 'subscription_invoice_created',
            'title' => "Faktura za obnovu: {$names}",
            'message' => number_format((float) $this->invoice->total, 0, ',', ' ') . ' Kc — zkontroluj a odesli',
            'link' => "/faktury/{$this->invoice->id}",
            'invoice_id' => $this->invoice->id,
        ];
    }
}
```

**Step 2: Commit**

```bash
git add app/Notifications/SubscriptionInvoiceCreated.php
git commit -m "feat: add SubscriptionInvoiceCreated notification"
```

---

### Task 8: Vytvor AutoInvoiceSubscriptions command

**Files:**
- Create: `app/Console/Commands/AutoInvoiceSubscriptions.php`

**Step 1: Vytvor command**

```php
<?php

namespace App\Console\Commands;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Subscription;
use App\Models\User;
use App\Notifications\SubscriptionInvoiceCreated;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoInvoiceSubscriptions extends Command
{
    protected $signature = 'subscriptions:auto-invoice {--dry-run : Only show what would be invoiced}';
    protected $description = 'Create invoices for subscriptions expiring within 30 days';

    public function handle(): int
    {
        $dryRun = $this->option('dry-run');
        $admin = User::first();

        // Find eligible subscriptions
        $subscriptions = Subscription::where('status', 'aktivni')
            ->where('auto_renew', true)
            ->where('auto_invoice', true)
            ->where('is_free', false)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>', now())
            ->where('expires_at', '<=', now()->addDays(30))
            ->where(function ($q) {
                $q->where('sell_yearly', '>', 0)
                  ->orWhere('price_yearly', '>', 0);
            })
            // Exclude subs that already have an open invoice
            ->whereDoesntHave('invoices', function ($q) {
                $q->whereIn('status', ['vystavena', 'odeslana']);
            })
            ->with('customer')
            ->get();

        if ($subscriptions->isEmpty()) {
            $this->info('No subscriptions to invoice.');
            return 0;
        }

        // Group by customer_id + name (domain + hosting = 1 invoice)
        $groups = $subscriptions->groupBy(function ($sub) {
            return $sub->customer_id . '|' . $sub->name;
        });

        $created = 0;

        foreach ($groups as $key => $subs) {
            $customer = $subs->first()->customer;
            $name = $subs->first()->name;

            if (!$customer) {
                Log::warning("AutoInvoice: subscription {$subs->first()->id} has no customer, skipping.");
                continue;
            }

            // Calculate items
            $items = [];
            foreach ($subs as $sub) {
                $price = (float) $sub->sell_yearly ?: (float) $sub->price_yearly;
                if ($price <= 0) {
                    Log::warning("AutoInvoice: subscription {$sub->id} ({$sub->name}) has zero price, skipping.");
                    continue;
                }

                $typeLabel = match ($sub->type) {
                    'domena' => 'Obnova domeny',
                    'hosting' => 'Hosting',
                    'sluzba' => 'Sluzba',
                    default => 'Sluzba',
                };

                $items[] = [
                    'subscription' => $sub,
                    'description' => "{$typeLabel} {$sub->name} (1 rok)",
                    'quantity' => 1,
                    'unit' => 'rok',
                    'unit_price' => $price,
                    'total_price' => $price,
                ];
            }

            if (empty($items)) {
                continue;
            }

            $total = collect($items)->sum('total_price');
            $earliestExpiry = $subs->min('expires_at');

            if ($dryRun) {
                $subTypes = $subs->pluck('type')->unique()->implode('+');
                $this->line("  [{$subTypes}] {$name} — {$customer->name} — " . number_format($total, 0) . " Kc (expires: {$earliestExpiry->format('d.m.Y')})");
                $created++;
                continue;
            }

            // Create invoice in transaction
            DB::transaction(function () use ($customer, $items, $total, $earliestExpiry, $admin) {
                $invoiceNumber = Invoice::getNextInvoiceNumber('6');

                $invoice = Invoice::create([
                    'customer_id' => $customer->id,
                    'invoice_number' => $invoiceNumber,
                    'variable_symbol' => $invoiceNumber,
                    'issue_date' => now()->toDateString(),
                    'due_date' => $earliestExpiry->toDateString(),
                    'status' => 'vystavena',
                    'payment_method' => 'banka',
                    'total' => $total,
                    'notes' => 'Automaticky vygenerovana faktura za obnovu sluzeb.',
                ]);

                foreach ($items as $i => $item) {
                    $invoice->items()->create([
                        'description' => $item['description'],
                        'quantity' => $item['quantity'],
                        'unit' => $item['unit'],
                        'unit_price' => $item['unit_price'],
                        'total_price' => $item['total_price'],
                        'sort_order' => $i,
                    ]);

                    // Pivot
                    $invoice->subscriptions()->attach($item['subscription']->id);
                }

                // Notify admin
                if ($admin) {
                    $names = collect($items)->pluck('subscription.name')->unique()->toArray();
                    $admin->notify(new SubscriptionInvoiceCreated($invoice, $names));
                }
            });

            $created++;
        }

        $verb = $dryRun ? 'Would create' : 'Created';
        $this->info("{$verb} {$created} invoices.");

        return 0;
    }
}
```

**Step 2: Commit**

```bash
git add app/Console/Commands/AutoInvoiceSubscriptions.php
git commit -m "feat: add subscriptions:auto-invoice command"
```

---

### Task 9: Registruj cron schedule

**Files:**
- Modify: `routes/console.php`

**Step 1: Pridej schedule (za existujici radek 11)**

```php
Schedule::command('subscriptions:auto-invoice')->dailyAt('07:00');
```

**Step 2: Commit**

```bash
git add routes/console.php
git commit -m "feat: schedule auto-invoice command daily at 07:00"
```

---

### Task 10: Rozsir markAsPaid() pro subscription faktury

**Files:**
- Modify: `app/Http/Controllers/InvoiceController.php` (metoda markAsPaid, radky 250-271)

**Step 1: Nahrad metodu markAsPaid()**

```php
public function markAsPaid(Request $request, Invoice $invoice)
{
    $paymentMethod = $request->input('payment_method', $invoice->payment_method ?? 'banka');

    $invoice->update([
        'status' => 'zaplacena',
        'paid_at' => now(),
        'payment_method' => $paymentMethod,
    ]);

    // Order invoice: update order status
    if ($invoice->order_id) {
        $invoice->order->update(['status' => 'fakturovano']);
    }

    // Subscription invoice: extend hosting + create payment records
    $invoice->load('subscriptions');
    if ($invoice->subscriptions->isNotEmpty()) {
        foreach ($invoice->subscriptions as $subscription) {
            // Create payment record
            $subscription->payments()->create([
                'amount' => (float) $subscription->sell_yearly ?: (float) $subscription->price_yearly,
                'period_start' => $subscription->expires_at,
                'period_end' => $subscription->expires_at->copy()->addYear(),
                'status' => 'zaplaceno',
                'paid_at' => now(),
                'invoice_id' => $invoice->id,
                'payment_method' => $paymentMethod,
            ]);

            // Hosting: extend expires_at by 1 year (CRM manages)
            // Domain: DON'T change — wait for sync from registrar
            if ($subscription->type !== 'domena') {
                $subscription->update([
                    'expires_at' => $subscription->expires_at->copy()->addYear(),
                ]);
            }
        }
    }

    $invoice->loadMissing('customer');
    $user = auth()->user();
    $user->notify(new \App\Notifications\PaymentReceived($invoice));

    $label = $paymentMethod === 'hotovost' ? 'hotove' : 'prevodem';

    return back()->with('success', "Faktura oznacena jako zaplacena ({$label}).");
}
```

**Step 2: Commit**

```bash
git add app/Http/Controllers/InvoiceController.php
git commit -m "feat: extend markAsPaid to handle subscription invoices"
```

---

### Task 11: Deploy Release 2

**Step 1: Deploy**

```bash
cd "/Users/viktorveverka/CLAUDE PROJECTS/thesafari/crm"
rsync -avz --include='app/***' --include='database/***' --include='resources/***' --include='routes/***' --exclude='*' ./ root@sss06.vas-server.cz:/var/www/hq.thesafari.cz/
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && php artisan migrate --force && php artisan config:cache && php artisan route:cache"
```

**Step 2: Otestuj dry-run na VPS**

```bash
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && php artisan subscriptions:auto-invoice --dry-run"
```

Ocekavany vysledek: seznam subscriptions ktere by se fakturovaly (nebo "No subscriptions to invoice" pokud zadna neexpiruje do 30 dni).

**Step 3: Otestuj cron registraci**

```bash
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && php artisan schedule:list"
```

Ocekavany vysledek: radek s `subscriptions:auto-invoice` daily at 07:00.

**Step 4: Tag**

```bash
git tag release-2-auto-invoicing
```

---

## RELEASE 3: UI zmeny

### Task 12: NeniwebForm — auto_invoice prepinac

**Files:**
- Modify: `resources/js/components/neniweb/NeniwebForm.tsx`

**Step 1: Pridej auto_invoice do TypeScript interface (kolem radku 41)**

Najdi interface kde je `auto_renew: boolean;` a pridej za nej:
```typescript
auto_invoice: boolean;
```

**Step 2: Pridej do defaultnich hodnot (kolem radku 63)**

Najdi `auto_renew: true,` a pridej za nej:
```typescript
auto_invoice: true,
```

**Step 3: Pridej Switch komponentu za auto_renew (za radek ~507)**

Za existujici auto_renew Switch blok pridej:

```tsx
<div className="flex items-center gap-3 pt-2">
    <Switch
        checked={data.auto_invoice}
        onCheckedChange={(v) => setData('auto_invoice', v)}
        disabled={!data.auto_renew}
    />
    <Label className={!data.auto_renew ? 'text-muted-foreground/50' : 'text-muted-foreground'}>
        Automaticka fakturace
    </Label>
</div>
```

**Step 4: Pridej useEffect pro zavislost auto_renew -> auto_invoice**

Na zacatek komponenty (za existujici useEffect bloky):

```tsx
React.useEffect(() => {
    if (!data.auto_renew) {
        setData('auto_invoice', false);
    }
}, [data.auto_renew]);
```

**Step 5: Commit**

```bash
git add resources/js/components/neniweb/NeniwebForm.tsx
git commit -m "feat: add auto_invoice switch to NeniwebForm"
```

---

### Task 13: SubscriptionController — validace auto_invoice

**Files:**
- Modify: `app/Http/Controllers/SubscriptionController.php`

**Step 1: Pridej 'auto_invoice' do validacnich pravidel**

Najdi `'auto_renew' => 'boolean',` (radky 277 a 323 — store i update metoda) a za nej pridej:
```php
'auto_invoice' => 'boolean',
```

**Step 2: Commit**

```bash
git add app/Http/Controllers/SubscriptionController.php
git commit -m "feat: add auto_invoice validation to SubscriptionController"
```

---

### Task 14: Invoices/Show — subscription info

**Files:**
- Modify: `resources/js/pages/Invoices/Show.tsx`

**Step 1: Rozsir TypeScript interface o subscriptions**

Najdi interface pro invoice props a pridej:
```typescript
subscriptions?: Array<{
    id: number;
    name: string;
    type: string;
    expires_at: string | null;
}>;
```

**Step 2: Za existujici order blok (radky 359-373) pridej subscription blok**

```tsx
{invoice.subscriptions && invoice.subscriptions.length > 0 && (
    <>
        <Separator className="my-6 bg-border" />
        <div>
            <p className="text-xs text-muted-foreground mb-2">Sluzby:</p>
            {invoice.subscriptions.map((sub) => (
                <div key={sub.id} className="flex items-center gap-2 text-sm mb-1">
                    <span>{sub.type === 'domena' ? '🌐' : '🖥️'}</span>
                    <Link
                        href={`/neniweb/${sub.id}`}
                        className="text-primary hover:underline"
                    >
                        {sub.name}
                    </Link>
                    <span className="text-muted-foreground text-xs">
                        — {sub.type === 'domena' ? 'domena' : 'hosting'}
                        {sub.expires_at && ` (exp. ${new Date(sub.expires_at).toLocaleDateString('cs-CZ')})`}
                    </span>
                </div>
            ))}
        </div>
    </>
)}
```

**Step 3: Uprav InvoiceController::show() — pridej subscriptions do response**

V `app/Http/Controllers/InvoiceController.php`, v metode `show()`, pridej do `$invoice->load()`:
```php
$invoice->load(['items', 'customer', 'order', 'subscriptions:id,name,type,expires_at']);
```

**Step 4: Pridej tlacitko "Obnovit u registratora" (pod subscription info, jen kdyz zaplacena)**

```tsx
{invoice.status === 'zaplacena' && invoice.subscriptions && invoice.subscriptions.some(s => s.type === 'domena') && (
    <a
        href="https://portal.vas-hosting.cz"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-2 text-sm text-amber-500 hover:text-amber-400"
    >
        <ExternalLink className="h-4 w-4" />
        Obnovit domeny u registratora
    </a>
)}
```

Pridej `ExternalLink` do importu z lucide-react.

**Step 5: Commit**

```bash
git add resources/js/pages/Invoices/Show.tsx app/Http/Controllers/InvoiceController.php
git commit -m "feat: show linked subscriptions on invoice detail + registrar link"
```

---

### Task 15: Dashboard alert — sluzby k rucni fakturaci

**Files:**
- Modify: `app/Http/Controllers/DashboardController.php` (metoda getAttentionAlerts)

**Step 1: Pridej novy alert typ na konec metody getAttentionAlerts() (pred sort)**

Najdi komentare `// Sort: danger first` (radek ~388) a vloz pred nej:

```php
// 7. Subscriptions to manually invoice (auto_renew=true, auto_invoice=false, expiring soon)
$manualInvoiceSubs = Subscription::where('status', 'aktivni')
    ->where('auto_renew', true)
    ->where('auto_invoice', false)
    ->where('is_free', false)
    ->whereNotNull('expires_at')
    ->where('expires_at', '>=', now())
    ->where('expires_at', '<=', now()->addDays(30))
    ->orderBy('expires_at')
    ->limit(3)
    ->get();

foreach ($manualInvoiceSubs as $sub) {
    $days = (int) now()->diffInDays($sub->expires_at);
    $label = $days === 0 ? 'dnes' : ($days === 1 ? 'zitra' : "za {$days} dni");
    $alerts[] = [
        'type' => 'warning',
        'icon' => 'invoice',
        'title' => "{$sub->name} — rucne fakturovat ({$label})",
        'subtitle' => ucfirst($sub->type) . ' — auto-fakturace vypnuta',
        'link' => "/neniweb/{$sub->id}",
    ];
}
```

**Step 2: Commit**

```bash
git add app/Http/Controllers/DashboardController.php
git commit -m "feat: dashboard alert for manual invoicing subscriptions"
```

---

### Task 16: Deploy Release 3

**Step 1: Build frontend + deploy**

```bash
cd "/Users/viktorveverka/CLAUDE PROJECTS/thesafari/crm"
npm run build
rsync -avz --include='app/***' --include='database/***' --include='resources/***' --include='routes/***' --exclude='*' ./ root@sss06.vas-server.cz:/var/www/hq.thesafari.cz/
rsync -avz --delete public/build/ root@sss06.vas-server.cz:/var/www/hq.thesafari.cz/public/build/
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && php artisan config:cache && php artisan route:cache && php artisan view:cache"
```

**Step 2: Overeni**

- Otevri https://hq.thesafari.cz/neniweb — edituj subscription, over auto_invoice switch
- Otevri fakturu se subscription vazbou — over ze se zobrazi info o sluzbech

**Step 3: Tag**

```bash
git tag release-3-ui-changes
```

---

## RELEASE 4: Mobilni zobrazeni

### Task 17: Sidebar — hamburger menu na mobilu

**Files:**
- Modify: `resources/js/components/Sidebar.tsx`
- Modify: `resources/js/layouts/AuthenticatedLayout.tsx`

**Step 1: Uprav AuthenticatedLayout — pridej mobilni stav**

Na zacatek komponenty pridej state:
```tsx
const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
```

Uprav JSX layout:
```tsx
<div className="flex h-screen bg-background">
    {/* Desktop sidebar */}
    <div className="hidden md:block dark">
        <Sidebar />
    </div>

    {/* Mobile overlay */}
    {mobileMenuOpen && (
        <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setMobileMenuOpen(false)}
        />
    )}

    {/* Mobile sidebar */}
    <div className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 md:hidden dark ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar />
    </div>

    <div className="flex flex-1 flex-col overflow-hidden">
        <TopBar
            breadcrumbs={breadcrumbs}
            onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <RunningTimerBar timer={props.runningTimer ?? null} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
            {children}
        </main>
    </div>
</div>
```

**Step 2: Uprav TopBar — pridej hamburger ikonu**

V TopBar.tsx pridej prop `onMenuClick` a hamburger tlacitko:
```tsx
interface TopBarProps {
    breadcrumbs?: Breadcrumb[];
    onMenuClick?: () => void;
}

// Na zacatek TopBaru, pred breadcrumbs:
{onMenuClick && (
    <button
        onClick={onMenuClick}
        className="mr-2 p-2 text-muted-foreground hover:text-foreground md:hidden"
    >
        <Menu className="h-5 w-5" />
    </button>
)}
```

Pridej `Menu` do importu z lucide-react.

**Step 3: Commit**

```bash
git add resources/js/layouts/AuthenticatedLayout.tsx resources/js/components/TopBar.tsx resources/js/components/Sidebar.tsx
git commit -m "feat: mobile hamburger menu with overlay sidebar"
```

---

### Task 18: Responsive tabulky

**Files:**
- Create: `resources/js/components/ui/responsive-table.tsx`

**Step 1: Vytvor wrapper komponentu**

```tsx
import React from 'react';

interface ResponsiveTableProps {
    children: React.ReactNode;
    className?: string;
}

export function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
    return (
        <div className={`overflow-x-auto -mx-4 md:mx-0 ${className}`}>
            <div className="inline-block min-w-full align-middle">
                {children}
            </div>
        </div>
    );
}
```

**Step 2: Aplikuj na hlavni tabulky**

V souborech `Customers/Index.tsx`, `Orders/Index.tsx`, `Invoices/Index.tsx`:
Obal existujici `<table>` nebo tabulkovy kontejner do `<ResponsiveTable>`:

```tsx
import { ResponsiveTable } from '@/components/ui/responsive-table';

// ... v JSX:
<ResponsiveTable>
    {/* existujici tabulka */}
</ResponsiveTable>
```

**Step 3: Commit**

```bash
git add resources/js/components/ui/responsive-table.tsx resources/js/pages/Customers/Index.tsx resources/js/pages/Orders/Index.tsx resources/js/pages/Invoices/Index.tsx
git commit -m "feat: responsive table wrapper with horizontal scroll on mobile"
```

---

### Task 19: Mobilni tweaky — stat cards, formulare, timer bar

**Files:**
- Modify: `resources/js/pages/Dashboard.tsx` — stat cards grid
- Modify: `resources/js/components/RunningTimerBar.tsx` — zkraceny text
- Modify: Various form pages

**Step 1: Dashboard stat cards — 2x2 grid na mobilu**

Najdi grid kontejner stat cards a uprav:
```tsx
<div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
```

**Step 2: RunningTimerBar — zkraceny text na mobilu**

V textu timeru pridej responsive tridy:
```tsx
<span className="hidden md:inline">{fullText}</span>
<span className="md:hidden">{shortText}</span>
```

Kde `shortText` = "⏱ 0:45 — {customer}" a `fullText` = stavajici plny text.

**Step 3: Formulare — 1 sloupec na mobilu**

V formularovych strankach najdi 2-sloupcove gridy a uprav:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
```

**Step 4: Commit**

```bash
git add resources/js/pages/Dashboard.tsx resources/js/components/RunningTimerBar.tsx
git commit -m "feat: mobile responsive tweaks for dashboard, timer, and forms"
```

---

### Task 20: Deploy Release 4

**Step 1: Build + deploy**

```bash
cd "/Users/viktorveverka/CLAUDE PROJECTS/thesafari/crm"
npm run build
rsync -avz --include='app/***' --include='database/***' --include='resources/***' --include='routes/***' --exclude='*' ./ root@sss06.vas-server.cz:/var/www/hq.thesafari.cz/
rsync -avz --delete public/build/ root@sss06.vas-server.cz:/var/www/hq.thesafari.cz/public/build/
ssh root@sss06.vas-server.cz "cd /var/www/hq.thesafari.cz && php artisan config:cache && php artisan route:cache && php artisan view:cache"
```

**Step 2: Overeni na mobilu**

Otevri https://hq.thesafari.cz na telefonu:
- Sidebar skryty, hamburger ikona viditelna
- Tabulky scrollovatelne horizontalne
- Dashboard stat cards 2x2
- Timer bar zkraceny

**Step 3: Final tag**

```bash
git tag release-4-mobile-responsive
```

---

## Poradek tasku

| Task | Release | Zavislost | Popis |
|------|---------|-----------|-------|
| 1 | R1 | — | Migrace auto_invoice |
| 2 | R1 | — | Migrace invoice_subscription pivot |
| 3 | R1 | 1,2 | Invoice model (series + relace) |
| 4 | R1 | 1 | Subscription model (auto_invoice + relace) |
| 5 | R1 | — | Sync fix (domeny = zdroj pravdy) |
| 6 | R1 | 1-5 | Deploy Release 1 |
| 7 | R2 | 3,4 | SubscriptionInvoiceCreated notifikace |
| 8 | R2 | 7 | AutoInvoiceSubscriptions command |
| 9 | R2 | 8 | Cron schedule |
| 10 | R2 | 3,4 | markAsPaid() rozsireni |
| 11 | R2 | 7-10 | Deploy Release 2 |
| 12 | R3 | 4 | NeniwebForm auto_invoice switch |
| 13 | R3 | 12 | Validace auto_invoice |
| 14 | R3 | 3 | Invoices/Show subscription info |
| 15 | R3 | 4 | Dashboard alert rucni fakturace |
| 16 | R3 | 12-15 | Deploy Release 3 |
| 17 | R4 | — | Hamburger menu |
| 18 | R4 | — | Responsive tabulky |
| 19 | R4 | — | Mobilni tweaky |
| 20 | R4 | 17-19 | Deploy Release 4 |
