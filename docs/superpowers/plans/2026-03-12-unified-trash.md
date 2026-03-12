# Sjednocený koš (Unified Trash) — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sjednotit koš (soft delete + restore + force delete + auto-prune 30d) na 5 entitách: Faktury, Kalkulátor, Zprávy, Plánovač, Zákazníci.

**Architecture:** Přidat `MassPrunable` trait na modely (Invoice, Ticket, Task, Customer), přidat `restore()` + `forceDelete()` do controllerů (Ticket, Task, Customer), sjednotit frontend na tab-based koš ve stylu Invoices/Index.tsx. Kalkulátor přepsat z toggle na taby. `model:prune` scheduler už běží denně v 03:00.

**Tech Stack:** Laravel 12, Inertia.js, React 19, TypeScript, Tailwind 4

---

## Chunk 1: Backend — Modely + Controllery + Routes

### Task 1: Přidat MassPrunable na modely

**Files:**
- Modify: `app/Models/Invoice.php`
- Modify: `app/Models/Ticket.php`
- Modify: `app/Models/Task.php`
- Modify: `app/Models/Customer.php`

- [ ] **Step 1: Invoice model — přidat MassPrunable**

```php
// app/Models/Invoice.php — přidat import
use Illuminate\Database\Eloquent\MassPrunable;

// Přidat trait
class Invoice extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, MassPrunable;

    public function prunable()
    {
        return static::onlyTrashed()->where('deleted_at', '<=', now()->subDays(30));
    }
```

- [ ] **Step 2: Ticket model — přidat MassPrunable**

```php
// app/Models/Ticket.php — přidat import
use Illuminate\Database\Eloquent\MassPrunable;

// Přidat trait
class Ticket extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, MassPrunable;

    public function prunable()
    {
        return static::onlyTrashed()->where('deleted_at', '<=', now()->subDays(30));
    }
```

- [ ] **Step 3: Task model — přidat MassPrunable**

```php
// app/Models/Task.php — přidat import
use Illuminate\Database\Eloquent\MassPrunable;

// Přidat trait
class Task extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, MassPrunable;

    public function prunable()
    {
        return static::onlyTrashed()->where('deleted_at', '<=', now()->subDays(30));
    }
```

- [ ] **Step 4: Customer model — přidat MassPrunable**

```php
// app/Models/Customer.php — přidat import
use Illuminate\Database\Eloquent\MassPrunable;

// Přidat trait
class Customer extends Model
{
    use HasFactory, SoftDeletes, LogsActivity, MassPrunable;

    public function prunable()
    {
        return static::onlyTrashed()->where('deleted_at', '<=', now()->subDays(30));
    }
```

- [ ] **Step 5: Commit**

```bash
git add app/Models/Invoice.php app/Models/Ticket.php app/Models/Task.php app/Models/Customer.php
git commit -m "feat: add MassPrunable (30d auto-delete) to Invoice, Ticket, Task, Customer"
```

---

### Task 2: TicketController — přidat koš backend

**Files:**
- Modify: `app/Http/Controllers/TicketController.php`

- [ ] **Step 1: Upravit index() pro trashed support**

Nahradit stávající `index()` metodu. Přidat `$trashed` filtr a `trashedCount`:

```php
public function index(Request $request)
{
    $trashed = $request->boolean('trashed');

    $query = $trashed
        ? Ticket::onlyTrashed()->with('customer:id,name,company')
        : Ticket::query()->with('customer:id,name,company');

    $query->withCount('messages')
        ->when($request->input('search'), function ($q, $term) {
            $q->where('subject', 'ilike', "%{$term}%")
              ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', "%{$term}%"));
        })
        ->when(!$trashed && $request->input('status'), fn ($q, $s) => $q->where('status', $s))
        ->when(!$trashed && $request->input('priority'), fn ($q, $p) => $q->where('priority', $p))
        ->when(!$trashed && $request->input('source'), fn ($q, $s) => $q->where('source', $s))
        ->when($request->input('customer_id'), fn ($q, $id) => $q->where('customer_id', $id))
        ->latest();

    $tickets = $query->paginate(25)->withQueryString();
    $trashedCount = Ticket::onlyTrashed()->count();

    return Inertia::render('Tickets/Index', [
        'tickets' => $tickets,
        'filters' => $request->only(['search', 'status', 'priority', 'source', 'customer_id', 'trashed']),
        'trashedCount' => $trashedCount,
    ]);
}
```

- [ ] **Step 2: Přidat restore() a forceDelete()**

```php
public function restore(int $id)
{
    $ticket = Ticket::onlyTrashed()->findOrFail($id);
    $ticket->restore();

    return redirect()->route('zpravy.index')
        ->with('success', "Zpráva \"{$ticket->subject}\" obnovena.");
}

public function forceDelete(int $id)
{
    $ticket = Ticket::onlyTrashed()->findOrFail($id);
    $ticket->messages()->delete();
    $ticket->forceDelete();

    return redirect()->route('zpravy.index', ['trashed' => 1])
        ->with('success', 'Zpráva trvale smazána.');
}
```

- [ ] **Step 3: Upravit destroy() — přidat flash zprávu s info o koši**

```php
public function destroy(Ticket $zpravy)
{
    $zpravy->delete();

    return redirect()->route('zpravy.index')
        ->with('success', 'Zpráva přesunuta do koše.');
}
```

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/TicketController.php
git commit -m "feat: add trash support to TicketController (restore, forceDelete, trashed filter)"
```

---

### Task 3: TaskController — přidat koš backend

**Files:**
- Modify: `app/Http/Controllers/TaskController.php`

- [ ] **Step 1: Upravit index() pro trashed support**

Přidat `$trashed` filtr — v trash módu nezobrazovat kalendář a neprovádět filtry stavu/priority/period:

```php
public function index(Request $request)
{
    $trashed = $request->boolean('trashed');

    $query = $trashed
        ? Task::onlyTrashed()->with(['customer:id,name,company', 'order:id,title', 'invoice:id,invoice_number'])
        : Task::query()->with(['customer:id,name,company', 'order:id,title', 'invoice:id,invoice_number']);

    $query->when($request->input('search'), fn ($q, $term) => $q->search($term))
        ->when(!$trashed && $request->input('status'), fn ($q, $s) => $q->byStatus($s))
        ->when(!$trashed && $request->input('priority'), fn ($q, $p) => $q->byPriority($p))
        ->when(!$trashed && $request->input('period'), function ($q, $period) {
            return match ($period) {
                'today'   => $q->dueToday(),
                'week'    => $q->dueThisWeek(),
                'overdue' => $q->overdue(),
                default   => $q,
            };
        })
        ->latest();

    $tasks = $query->paginate(25)->withQueryString();
    $trashedCount = Task::onlyTrashed()->count();

    // Calendar data only for active view
    $calendarEvents = ['tasks' => [], 'subscriptions' => [], 'invoices' => []];
    $customers = [];
    $orders = [];
    $invoices = [];
    $alerts = [];
    $ignoredAlerts = [];

    if (!$trashed) {
        $calendarStart = now()->subMonth()->startOfMonth();
        $calendarEnd = now()->addMonth()->endOfMonth();

        $calendarTasks = Task::open()
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$calendarStart, $calendarEnd])
            ->select('id', 'title', 'due_date', 'priority', 'status')
            ->get()
            ->map(fn ($t) => [
                'id'       => $t->id,
                'title'    => $t->title,
                'date'     => $t->due_date->toDateString(),
                'type'     => 'task',
                'priority' => $t->priority,
            ]);

        $expiringSubscriptions = \App\Models\Subscription::where('status', 'aktivni')
            ->whereNotNull('expires_at')
            ->whereBetween('expires_at', [$calendarStart, $calendarEnd])
            ->select('id', 'name', 'type', 'expires_at')
            ->get()
            ->map(fn ($s) => [
                'id'      => $s->id,
                'title'   => $s->name,
                'date'    => $s->expires_at->toDateString(),
                'type'    => 'subscription',
                'subtype' => $s->type,
            ]);

        $dueInvoices = \App\Models\Invoice::whereIn('status', ['vystavena', 'odeslana'])
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$calendarStart, $calendarEnd])
            ->select('id', 'invoice_number', 'due_date', 'total')
            ->get()
            ->map(fn ($i) => [
                'id'    => $i->id,
                'title' => "Faktura {$i->invoice_number}",
                'date'  => $i->due_date->toDateString(),
                'type'  => 'invoice',
                'total' => (float) $i->total,
            ]);

        $calendarEvents = [
            'tasks'         => $calendarTasks,
            'subscriptions' => $expiringSubscriptions,
            'invoices'      => $dueInvoices,
        ];

        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();
        $orders    = Order::whereIn('status', ['nova', 'v_reseni'])
            ->select('id', 'title')->orderBy('title')->get();
        $invoices  = \App\Models\Invoice::whereIn('status', ['vystavena', 'odeslana'])
            ->select('id', 'invoice_number')->orderBy('invoice_number')->get();

        $alerts = DashboardController::getAttentionAlerts();
        $ignoredAlerts = DashboardController::getIgnoredAlerts();
    }

    return Inertia::render('Planner/Index', [
        'tasks'          => $tasks,
        'calendarEvents' => $calendarEvents,
        'filters'        => $request->only(['search', 'status', 'priority', 'period', 'trashed']),
        'customers'      => $customers,
        'orders'         => $orders,
        'invoices'       => $invoices,
        'alerts'         => $alerts,
        'ignoredAlerts'  => $ignoredAlerts,
        'trashedCount'   => $trashedCount,
    ]);
}
```

- [ ] **Step 2: Přidat restore() a forceDelete()**

```php
public function restore(int $id)
{
    $task = Task::onlyTrashed()->findOrFail($id);
    $task->restore();

    return redirect()->route('planovac.index')
        ->with('success', "Úkol \"{$task->title}\" obnoven.");
}

public function forceDelete(int $id)
{
    $task = Task::onlyTrashed()->findOrFail($id);
    $task->forceDelete();

    return redirect()->route('planovac.index', ['trashed' => 1])
        ->with('success', 'Úkol trvale smazán.');
}
```

- [ ] **Step 3: Upravit destroy() flash**

```php
public function destroy(Task $planovac)
{
    $planovac->delete();

    return back()->with('success', 'Úkol přesunut do koše.');
}
```

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/TaskController.php
git commit -m "feat: add trash support to TaskController (restore, forceDelete, trashed filter)"
```

---

### Task 4: CustomerController — přidat koš backend

**Files:**
- Modify: `app/Http/Controllers/CustomerController.php`

- [ ] **Step 1: Upravit index() pro trashed support**

```php
public function index(Request $request)
{
    $trashed = $request->boolean('trashed');
    $sortField = $request->input('sort', 'created_at');
    $sortDir = $request->input('direction', 'desc');
    $allowedSorts = ['name', 'email', 'created_at', 'company'];

    $query = $trashed
        ? Customer::onlyTrashed()
        : Customer::query();

    $customers = $query
        ->search($request->input('search'))
        ->when(!$trashed && $request->input('type'), fn ($q, $type) => $q->where('type', $type))
        ->orderBy(in_array($sortField, $allowedSorts) ? $sortField : 'created_at', $sortDir === 'asc' ? 'asc' : 'desc')
        ->paginate(25)
        ->withQueryString();

    $trashedCount = Customer::onlyTrashed()->count();

    return Inertia::render('Customers/Index', [
        'customers' => $customers,
        'filters' => $request->only(['search', 'type', 'sort', 'direction', 'trashed']),
        'trashedCount' => $trashedCount,
    ]);
}
```

- [ ] **Step 2: Přidat restore() a forceDelete() s ochranou**

```php
public function restore(int $id)
{
    $customer = Customer::onlyTrashed()->findOrFail($id);
    $customer->restore();

    return redirect()->route('zakaznici.index')
        ->with('success', "Zákazník \"{$customer->name}\" obnoven.");
}

public function forceDelete(int $id)
{
    $customer = Customer::onlyTrashed()->findOrFail($id);

    // Ochrana: zkontroluj aktivní vazby
    $activeOrders = $customer->orders()->withTrashed()->whereNull('deleted_at')->count();
    $unpaidInvoices = $customer->invoices()->withTrashed()->whereNull('deleted_at')
        ->where('status', '!=', 'zaplacena')->count();
    $activeSubscriptions = $customer->subscriptions()->where('status', 'aktivni')->count();

    if ($activeOrders > 0 || $unpaidInvoices > 0 || $activeSubscriptions > 0) {
        $reasons = [];
        if ($activeOrders > 0) $reasons[] = "{$activeOrders} aktivních zakázek";
        if ($unpaidInvoices > 0) $reasons[] = "{$unpaidInvoices} nezaplacených faktur";
        if ($activeSubscriptions > 0) $reasons[] = "{$activeSubscriptions} aktivních služeb";

        return back()->with('error', 'Zákazníka nelze trvale smazat — má: ' . implode(', ', $reasons) . '.');
    }

    $customer->forceDelete();

    return redirect()->route('zakaznici.index', ['trashed' => 1])
        ->with('success', 'Zákazník trvale smazán.');
}
```

- [ ] **Step 3: Upravit destroy() flash**

```php
public function destroy(Customer $zakaznici)
{
    $zakaznici->delete();

    return redirect()->route('zakaznici.index')
        ->with('success', 'Zákazník přesunut do koše.');
}
```

- [ ] **Step 4: Commit**

```bash
git add app/Http/Controllers/CustomerController.php
git commit -m "feat: add trash support to CustomerController (restore, forceDelete with protection, trashed filter)"
```

---

### Task 5: Routes — přidat restore/force-delete

**Files:**
- Modify: `routes/web.php`

- [ ] **Step 1: Přidat routes pro zprávy**

Za `Route::post('zpravy/{ticket}/reply', ...)`:

```php
Route::post('zpravy/{id}/restore', [TicketController::class, 'restore'])->name('zpravy.restore');
Route::delete('zpravy/{id}/force-delete', [TicketController::class, 'forceDelete'])->name('zpravy.forceDelete');
```

- [ ] **Step 2: Přidat routes pro plánovač**

Za `Route::post('planovac/{task}/toggle', ...)`:

```php
Route::post('planovac/{id}/restore', [TaskController::class, 'restore'])->name('planovac.restore');
Route::delete('planovac/{id}/force-delete', [TaskController::class, 'forceDelete'])->name('planovac.forceDelete');
```

- [ ] **Step 3: Přidat routes pro zákazníky**

Za `Route::get('zakaznici/{zakaznici}/upravit', ...)`:

```php
Route::post('zakaznici/{id}/restore', [CustomerController::class, 'restore'])->name('zakaznici.restore');
Route::delete('zakaznici/{id}/force-delete', [CustomerController::class, 'forceDelete'])->name('zakaznici.forceDelete');
```

- [ ] **Step 4: Commit**

```bash
git add routes/web.php
git commit -m "feat: add restore/force-delete routes for zpravy, planovac, zakaznici"
```

---

## Chunk 2: Frontend — Sjednocení koše na všech stránkách

### Task 6: Tickets/Index.tsx — přidat koš taby

**Files:**
- Modify: `resources/js/pages/Tickets/Index.tsx`

Přidat do Props: `trashedCount: number`, `filters.trashed?: string`

Přidat tab řádek nad DataTable (styl z Invoices/Index.tsx):
- Tab "Všechny" (default) — zobrazuje stávající filtry
- Tab "Koš" s badge počtu

V koši: jiné sloupce (bez filtrů), přidat `deleted_at` sloupec, akce Obnovit + Trvale smazat.

**Klíčové vzory z Invoices/Index.tsx k replikování:**
- Taby: `border-b border-border` wrapper, `border-b-2 -mb-px` na aktivním tabu
- Badge: `bg-red-500/10 text-red-400` pro koš count
- Restore button: `hover:bg-emerald-500/10 hover:text-emerald-500`, RotateCcw ikona
- Force delete: `hover:bg-red-500/10 hover:text-red-500`, Trash2 ikona
- Delete modal: rozlišuje soft delete ("přesunuta do koše") vs force delete ("trvale smazat, nelze vrátit")

Přidat import `RotateCcw` z lucide-react.

Přidat `trashedColumns` (subject, customer, deleted_at, actions s restore+forceDelete).

V koši nezobrazovat toolbar s filtry (status, priority, source).

`emptyMessage`: v koši "Žádné smazané zprávy", jinak "Žádné zprávy".

`onRowClick`: v koši `undefined` (neklickatelné řádky).

- [ ] **Step 1: Implementovat koš taby na Tickets/Index.tsx**
- [ ] **Step 2: Commit**

```bash
git add resources/js/pages/Tickets/Index.tsx
git commit -m "feat: add trash tabs to Tickets/Index (unified trash pattern)"
```

---

### Task 7: Planner/Index.tsx — přidat koš taby

**Files:**
- Modify: `resources/js/pages/Planner/Index.tsx`

Přidat do Props: `trashedCount: number`, `filters.trashed?: string`

Tab řádek: "Všechny" + "Koš" (se badge).

V koši:
- Skrýt kalendář (celý pravý sloupec) a AttentionAlerts
- Layout: single column místo 7fr/3fr grid
- Sloupce: title, priority, due_date, deleted_at, actions (restore + force delete)
- Bez toggle checkbox sloupce
- Bez toolbar filtrů

`handleDelete` upravit: v koši → force-delete, jinak soft delete.

Přidat `handleRestore` callback.

Přidat `trashedColumns` s delete_at a restore+forceDelete akcemi.

- [ ] **Step 1: Implementovat koš taby na Planner/Index.tsx**
- [ ] **Step 2: Commit**

```bash
git add resources/js/pages/Planner/Index.tsx
git commit -m "feat: add trash tabs to Planner/Index (unified trash pattern)"
```

---

### Task 8: Customers/Index.tsx — přidat koš taby

**Files:**
- Modify: `resources/js/pages/Customers/Index.tsx`

Přidat do Props: `trashedCount: number`, `filters.trashed?: string`

Tab řádek: "Všechny" + "Koš" (se badge).

V koši:
- Sloupce: name, company, email, deleted_at, actions (restore + force delete)
- Bez "Nový zákazník" tlačítka (schovej v koši)
- handleDelete: force-delete s textem "Zákazníka nelze obnovit"
- handleRestore: `router.post('/zakaznici/{id}/restore')`
- Force delete error: zobrazit flash error pokud má aktivní vazby

- [ ] **Step 1: Implementovat koš taby na Customers/Index.tsx**
- [ ] **Step 2: Commit**

```bash
git add resources/js/pages/Customers/Index.tsx
git commit -m "feat: add trash tabs to Customers/Index (unified trash pattern)"
```

---

### Task 9: Estimates/Index.tsx — sjednotit toggle na taby

**Files:**
- Modify: `resources/js/pages/Estimates/Index.tsx`

Přepsat z toggle button ("Koš"/"Zpět") na tab řádek: "Všechny" + "Koš" (se badge).

Potřeba:
- Přidat `trashedCount` do backend response (EstimateController::index)
- Nahradit ghost button "Koš" + "Zpět" za taby ve stylu faktur
- Zachovat stávající card grid layout (ne DataTable) — jen přidat taby nahoře
- V tab řádku: vlevo taby, vpravo "Nová kalkulace" tlačítko (jen na aktivním tabu)

**Files (backend):**
- Modify: `app/Http/Controllers/EstimateController.php` — přidat `trashedCount` do index response

- [ ] **Step 1: EstimateController — přidat trashedCount**

```php
// V index() přidat před return:
$trashedCount = Estimate::onlyTrashed()->count();

// V return přidat:
'trashedCount' => $trashedCount,
```

- [ ] **Step 2: Estimates/Index.tsx — přepsat na taby**
- [ ] **Step 3: Commit**

```bash
git add app/Http/Controllers/EstimateController.php resources/js/pages/Estimates/Index.tsx
git commit -m "feat: unify Estimates/Index trash from toggle to tabs (matches Invoice pattern)"
```

---

### Task 10: Build + verifikace

- [ ] **Step 1: Build frontend**

```bash
cd "/Users/viktorveverka/CLAUDE PROJECTS/thesafari/crm" && npm run build
```

Očekávaný výstup: úspěšný build bez chyb.

- [ ] **Step 2: Finální commit s bump verze**

Zvýšit verzi v `resources/js/layouts/AuthenticatedLayout.tsx` na v1.0.2 (minor feature).

```bash
git add -A
git commit -m "feat: unified trash system v1.0.2 — tabs + auto-prune 30d on 5 entities"
git tag v1.0.2
```
