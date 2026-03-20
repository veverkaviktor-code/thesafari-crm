<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Subscription;
use App\Models\SubscriptionFolder;
use App\Models\SubscriptionPayment;
use App\Models\VpsServer;
use App\Services\VasHostingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class SubscriptionController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min((int) ($request->input('per_page') ?: 30), 100);

        $baseQuery = Subscription::query()
            ->with('customer:id,name,company')
            ->when($request->input('search'), function ($q, $term) {
                $q->where(function ($sub) use ($term) {
                    $sub->where('name', 'ilike', "%{$term}%")
                        ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', "%{$term}%"));
                });
            })
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('expiry_filter'), function ($q, $filter) {
                match ($filter) {
                    'expired' => $q->where('status', 'aktivni')
                        ->whereNotNull('expires_at')
                        ->where('expires_at', '<', now()),
                    'expiring_soon' => $q->where('status', 'aktivni')
                        ->whereNotNull('expires_at')
                        ->where('expires_at', '>=', now())
                        ->where('expires_at', '<=', now()->addDays(30)),
                    'active' => $q->where('status', 'aktivni')
                        ->where(fn ($q2) => $q2->whereNull('expires_at')
                            ->orWhere('expires_at', '>', now()->addDays(30))),
                    'no_expiry' => $q->where('status', 'aktivni')
                        ->whereNull('expires_at'),
                    'free' => $q->where('is_free', true),
                    default => null,
                };
            })
            // Column filters — all support comma-separated multi-values
            ->when($request->input('filter_customer'), fn ($q, $v) => $q->whereIn('customer_id', explode(',', $v)))
            ->when($request->input('filter_status'), fn ($q, $v) => $q->whereIn('status', explode(',', $v)))
            ->when($request->filled('filter_auto_renew'), function ($q) use ($request) {
                $vals = explode(',', $request->input('filter_auto_renew'));
                if (count($vals) === 1) $q->where('auto_renew', $vals[0] === '1');
            })
            ->when($request->filled('filter_external'), function ($q) use ($request) {
                $vals = explode(',', $request->input('filter_external'));
                if (count($vals) === 1) $q->where('is_external', $vals[0] === '1');
            })
            ->when($request->filled('filter_registered'), function ($q) use ($request) {
                $vals = explode(',', $request->input('filter_registered'));
                if (count($vals) === 1) $q->where('is_registered_by_us', $vals[0] === '1');
            })
            ->when($request->input('filter_server'), fn ($q, $v) => $q->whereIn('server', explode(',', $v)))
            ->when($request->filled('filter_has_hosting'), function ($q) use ($request) {
                $vals = explode(',', $request->input('filter_has_hosting'));
                if (count($vals) === 1) {
                    $hostingNames = Subscription::where('type', 'hosting')->select('name');
                    $vals[0] === '1' ? $q->whereIn('name', $hostingNames) : $q->whereNotIn('name', $hostingNames);
                }
            })
            ->when($request->filled('filter_has_domain'), function ($q) use ($request) {
                $vals = explode(',', $request->input('filter_has_domain'));
                if (count($vals) === 1) {
                    $domainNames = Subscription::where('type', 'domena')->select('name');
                    $vals[0] === '1' ? $q->whereIn('name', $domainNames) : $q->whereNotIn('name', $domainNames);
                }
            });

        $allowedSorts = ['name', 'expires_at', 'price_yearly', 'sell_yearly', 'cost_yearly', 'monthly_price', 'status', 'provider', 'server', 'created_at', 'storage_used_mb'];
        $sortBy = $request->input('sort_by');
        $sortDir = $request->input('sort_dir') === 'desc' ? 'desc' : 'asc';

        if ($sortBy && in_array($sortBy, $allowedSorts)) {
            $baseQuery->orderBy($sortBy, $sortDir);
        } else {
            $baseQuery->orderByRaw('expires_at IS NULL, expires_at ASC');
        }

        // Get all hosting names for quick lookup (domain ↔ hosting linking)
        $hostingNames = Subscription::where('type', 'hosting')->pluck('name')->flip();
        $domainNames = Subscription::where('type', 'domena')->pluck('name')->flip();

        $domains = (clone $baseQuery)->where('type', 'domena')
            ->paginate($perPage, ['*'], 'domains_page')
            ->withQueryString()
            ->through(fn ($sub) => array_merge($sub->toArray(), [
                'days_until_expiry' => $sub->daysUntilExpiry(),
                'urgency' => $sub->expiryUrgency(),
                'has_unpaid' => $sub->hasUnpaidPayments(),
                'yearly_margin' => $sub->yearlyMargin(),
                'has_linked_hosting' => $hostingNames->has($sub->name),
            ]));

        $hostings = (clone $baseQuery)->where('type', 'hosting')
            ->paginate($perPage, ['*'], 'hostings_page')
            ->withQueryString()
            ->through(fn ($sub) => array_merge($sub->toArray(), [
                'days_until_expiry' => $sub->daysUntilExpiry(),
                'urgency' => $sub->expiryUrgency(),
                'has_unpaid' => $sub->hasUnpaidPayments(),
                'yearly_margin' => $sub->yearlyMargin(),
                'has_linked_domain' => $domainNames->has($sub->name),
            ]));

        $services = (clone $baseQuery)->where('type', 'sluzba')
            ->paginate($perPage, ['*'], 'services_page')
            ->withQueryString()
            ->through(fn ($sub) => array_merge($sub->toArray(), [
                'days_until_expiry' => $sub->daysUntilExpiry(),
                'urgency' => $sub->expiryUrgency(),
                'has_unpaid' => $sub->hasUnpaidPayments(),
                'yearly_margin' => $sub->yearlyMargin(),
            ]));

        // VPS servers with stats
        $vpsServers = VpsServer::with('customer:id,name,company')
            ->withCount(['hostings'])
            ->get()
            ->map(fn ($vps) => array_merge($vps->toArray(), [
                'storage_used_mb' => $vps->totalStorageUsedMb(),
            ]));

        // Payments overview - all unpaid/overdue
        $paymentsQuery = SubscriptionPayment::query()
            ->with(['subscription.customer:id,name,company', 'subscription:id,name,type,customer_id'])
            ->when($request->input('payment_status'), function ($q, $status) {
                if ($status === 'nezaplaceno') $q->unpaid();
                elseif ($status === 'po_splatnosti') $q->overdue();
                elseif ($status === 'zaplaceno') $q->paid();
            }, function ($q) {
                // Default: show unpaid + overdue
                $q->whereIn('status', ['nezaplaceno', 'po_splatnosti']);
            })
            ->when($request->input('search'), function ($q, $term) {
                $q->whereHas('subscription', fn ($sq) =>
                    $sq->where('name', 'ilike', "%{$term}%")
                      ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', "%{$term}%"))
                );
            })
            ->orderBy('period_end');

        $payments = $paymentsQuery
            ->paginate($perPage, ['*'], 'payments_page')
            ->withQueryString();

        // Stats
        // Stats: only count our own subscriptions (not external)
        $ours = fn () => Subscription::where('is_external', false);

        $stats = [
            'total_domains'    => $ours()->where('type', 'domena')->where('status', 'aktivni')->count(),
            'total_hostings'   => $ours()->where('type', 'hosting')->where('status', 'aktivni')->count(),
            'total_services'   => $ours()->where('type', 'sluzba')->where('status', 'aktivni')->count(),
            'expired_count'    => $ours()->where('status', 'aktivni')
                                    ->whereNotNull('expires_at')->where('expires_at', '<', now())->count(),
            'total_vps'        => VpsServer::active()->count(),
            'unpaid_count'     => SubscriptionPayment::unpaid()->count()
                                + SubscriptionPayment::overdue()->count(),
            'unpaid_amount'    => (float) SubscriptionPayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])->sum('amount'),
            'arr_domains'      => (float) $ours()->where('status', 'aktivni')
                                    ->where('type', 'domena')
                                    ->selectRaw("COALESCE(SUM(COALESCE(NULLIF(sell_yearly, 0), price_yearly)), 0) as rev")
                                    ->value('rev'),
            'arr_hostings'     => (float) $ours()->where('status', 'aktivni')
                                    ->where('type', 'hosting')
                                    ->selectRaw("COALESCE(SUM(COALESCE(NULLIF(sell_yearly, 0), price_yearly)), 0) as rev")
                                    ->value('rev'),
            'mrr_services'     => (float) $ours()->where('status', 'aktivni')
                                    ->where('type', 'sluzba')
                                    ->sum('monthly_price'),
            'external_count'   => Subscription::where('is_external', true)->where('status', 'aktivni')->count(),
            // Billing overview: expired subs that need invoicing
            'to_invoice_count' => $ours()->where('status', 'aktivni')
                                    ->whereNotNull('expires_at')
                                    ->where('expires_at', '<', now())
                                    ->where('is_free', false)
                                    ->whereDoesntHave('payments', fn ($q) => $q->where('status', 'zaplaceno')
                                        ->where('period_end', '>=', now()->subYear()))
                                    ->count(),
            'to_invoice_amount' => (float) $ours()->where('status', 'aktivni')
                                    ->whereNotNull('expires_at')
                                    ->where('expires_at', '<', now())
                                    ->where('is_free', false)
                                    ->whereDoesntHave('payments', fn ($q) => $q->where('status', 'zaplaceno')
                                        ->where('period_end', '>=', now()->subYear()))
                                    ->selectRaw("COALESCE(SUM(COALESCE(NULLIF(sell_yearly, 0), price_yearly)), 0) as total")
                                    ->value('total'),
        ];

        // Unique server hostnames for filter dropdown
        $serverOptions = Subscription::where('type', 'hosting')
            ->whereNotNull('server')->where('server', '!=', '')
            ->distinct()->pluck('server')->sort()->values();

        $folders = SubscriptionFolder::orderBy('sort_order')->get();

        return Inertia::render('Neniweb/Index', [
            'domains'       => $domains,
            'hostings'      => $hostings,
            'services'      => $services,
            'vpsServers'    => $vpsServers,
            'payments'      => $payments,
            'stats'         => $stats,
            'folders'       => $folders,
            'customers'     => Customer::select('id', 'name', 'company')->orderBy('name')->get(),
            'filterOptions' => ['servers' => $serverOptions],
            'filters'       => $request->only([
                'search', 'tab', 'status', 'sort_by', 'sort_dir', 'payment_status', 'expiry_filter',
                'filter_customer', 'filter_status', 'filter_auto_renew', 'filter_external',
                'filter_registered', 'filter_server', 'filter_has_hosting', 'filter_has_domain',
            ]),
        ]);
    }

    public function show(Subscription $neniweb)
    {
        $neniweb->load([
            'customer',
            'payments' => fn ($q) => $q->orderBy('period_end', 'desc'),
            'invoices' => fn ($q) => $q->orderBy('issue_date', 'desc'),
            'emailAccounts',
        ]);

        $paymentStats = [
            'total_paid' => (float) $neniweb->payments()->paid()->sum('amount'),
            'total_unpaid' => (float) $neniweb->payments()->whereIn('status', ['nezaplaceno', 'po_splatnosti'])->sum('amount'),
            'payments_count' => $neniweb->payments()->count(),
        ];

        // Check if a linked subscription with the same name but different type exists
        $linkedType = $neniweb->type === 'domena' ? 'hosting' : 'domena';
        $hasLinked = Subscription::where('name', $neniweb->name)
            ->where('type', $linkedType)
            ->exists();

        $neniweb->makeVisible(['admin_password', 'client_password']);
        $neniweb->emailAccounts->each(fn ($e) => $e->makeVisible('password'));

        return Inertia::render('Neniweb/Show', [
            'subscription' => array_merge($neniweb->toArray(), [
                'days_until_expiry' => $neniweb->daysUntilExpiry(),
                'urgency' => $neniweb->expiryUrgency(),
                'yearly_margin' => $neniweb->yearlyMargin(),
                'monthly_revenue' => $neniweb->monthlyRevenue(),
                'total_annual_revenue' => $neniweb->totalAnnualRevenue(),
                'has_linked_hosting' => $neniweb->type === 'domena' ? $hasLinked : null,
                'has_linked_domain' => $neniweb->type !== 'domena' ? $hasLinked : null,
            ]),
            'paymentStats' => $paymentStats,
            'customers' => Customer::select('id', 'name', 'company')->orderBy('name')->get(),
        ]);
    }

    public function create()
    {
        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();

        return Inertia::render('Neniweb/Create', [
            'customers' => $customers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id'     => 'nullable|exists:customers,id',
            'type'            => 'required|in:hosting,domena,sluzba',
            'name'            => 'required|string|max:255',
            'provider'        => 'nullable|string|max:255',
            'server'          => 'nullable|string|max:255',
            'price_yearly'    => 'nullable|numeric|min:0',
            'cost_yearly'     => 'nullable|numeric|min:0',
            'sell_yearly'     => 'nullable|numeric|min:0',
            'billing_cycle'   => 'nullable|in:monthly,quarterly,yearly,once',
            'monthly_price'   => 'nullable|numeric|min:0',
            'monthly_plan'    => 'nullable|string|max:50',
            'starts_at'       => 'nullable|date',
            'expires_at'      => 'nullable|date',
            'managed_since'   => 'nullable|date',
            'auto_renew'      => 'boolean',
            'auto_invoice'    => 'boolean',
            'is_free'         => 'boolean',
            'is_external'     => 'boolean',
            'status'          => 'required|in:aktivni,pozastaveno,zruseno',
            'notes'           => 'nullable|string',
            'storage_quota_mb' => 'nullable|integer|min:0',
            'vps_server_id'   => 'nullable|exists:vps_servers,id',
            'admin_url'       => 'nullable|string|max:500',
            'admin_user'      => 'nullable|string|max:255',
            'admin_password'  => 'nullable|string|max:500',
            'client_user'     => 'nullable|string|max:255',
            'client_password' => 'nullable|string|max:500',
            'folder_id'       => 'nullable|exists:subscription_folders,id',
            'parent_subscription_id' => 'nullable|exists:subscriptions,id',
        ]);

        $validated['price_yearly'] = $validated['price_yearly'] ?? 0;
        $validated['cost_yearly'] = $validated['cost_yearly'] ?? 0;
        $validated['sell_yearly'] = $validated['sell_yearly'] ?? 0;
        $validated['storage_quota_mb'] = $validated['storage_quota_mb'] ?? 0;
        $subscription = Subscription::create($validated);

        return redirect()->route('neniweb.show', $subscription)
            ->with('success', 'Služba vytvořena.');
    }

    public function edit(Subscription $neniweb)
    {
        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();
        $folders = SubscriptionFolder::orderBy('sort_order')->get(['id', 'name']);
        $parentOptions = Subscription::where('id', '!=', $neniweb->id)
            ->whereIn('type', ['hosting', 'domena'])
            ->select('id', 'name', 'type')
            ->orderBy('name')
            ->get();
        $neniweb->makeVisible(['admin_password', 'client_password']);

        return Inertia::render('Neniweb/Edit', [
            'subscription' => $neniweb,
            'customers' => $customers,
            'folders' => $folders,
            'parentOptions' => $parentOptions,
        ]);
    }

    public function update(Request $request, Subscription $neniweb)
    {
        $validated = $request->validate([
            'customer_id'     => 'nullable|exists:customers,id',
            'type'            => 'required|in:hosting,domena,sluzba',
            'name'            => 'required|string|max:255',
            'provider'        => 'nullable|string|max:255',
            'server'          => 'nullable|string|max:255',
            'price_yearly'    => 'nullable|numeric|min:0',
            'cost_yearly'     => 'nullable|numeric|min:0',
            'sell_yearly'     => 'nullable|numeric|min:0',
            'billing_cycle'   => 'nullable|in:monthly,quarterly,yearly,once',
            'monthly_price'   => 'nullable|numeric|min:0',
            'monthly_plan'    => 'nullable|string|max:50',
            'starts_at'       => 'nullable|date',
            'expires_at'      => 'nullable|date',
            'managed_since'   => 'nullable|date',
            'auto_renew'      => 'boolean',
            'auto_invoice'    => 'boolean',
            'is_free'         => 'boolean',
            'is_external'     => 'boolean',
            'status'          => 'required|in:aktivni,pozastaveno,zruseno',
            'notes'           => 'nullable|string',
            'storage_quota_mb' => 'nullable|integer|min:0',
            'vps_server_id'   => 'nullable|exists:vps_servers,id',
            'admin_url'       => 'nullable|string|max:500',
            'admin_user'      => 'nullable|string|max:255',
            'admin_password'  => 'nullable|string|max:500',
            'client_user'     => 'nullable|string|max:255',
            'client_password' => 'nullable|string|max:500',
            'folder_id'       => 'nullable|exists:subscription_folders,id',
            'parent_subscription_id' => 'nullable|exists:subscriptions,id',
        ]);

        $validated['price_yearly'] = $validated['price_yearly'] ?? 0;
        $validated['cost_yearly'] = $validated['cost_yearly'] ?? 0;
        $validated['sell_yearly'] = $validated['sell_yearly'] ?? 0;
        $validated['storage_quota_mb'] = $validated['storage_quota_mb'] ?? 0;
        $neniweb->update($validated);

        $tabMap = ['domena' => 'domeny', 'hosting' => 'hostingy', 'sluzba' => 'sluzby'];

        return redirect()->route('neniweb.index', ['tab' => $tabMap[$neniweb->type] ?? 'domeny'])
            ->with('success', 'Služba aktualizována.');
    }

    public function destroy(Subscription $neniweb)
    {
        $neniweb->delete();

        return redirect()->route('neniweb.index')
            ->with('success', 'Služba smazána.');
    }

    /**
     * Bulk update subscriptions
     */
    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:subscriptions,id',
            'action' => 'required|in:set_free,unset_free,set_status,set_customer,clear_expiry,set_external,unset_external',
            'value' => 'nullable|string',
        ]);

        $subscriptions = Subscription::whereIn('id', $validated['ids']);

        match ($validated['action']) {
            'set_free' => $subscriptions->update(['is_free' => true]),
            'unset_free' => $subscriptions->update(['is_free' => false]),
            'set_status' => in_array($validated['value'], ['aktivni', 'pozastaveno', 'zruseno'])
                ? $subscriptions->update(['status' => $validated['value']])
                : null,
            'set_customer' => $this->bulkSetCustomer($validated['ids'], $validated['value'] ?: null),
            'clear_expiry' => $subscriptions->update(['expires_at' => null]),
            'set_external' => $subscriptions->update(['is_external' => true]),
            'unset_external' => $subscriptions->update(['is_external' => false]),
        };

        return back()->with('success', count($validated['ids']) . ' položek aktualizováno.');
    }

    /**
     * Set customer on selected subscriptions + auto-link by name (domain ↔ hosting).
     */
    private function bulkSetCustomer(array $ids, ?string $customerId): int
    {
        $names = Subscription::whereIn('id', $ids)->pluck('name')->unique();

        // Update selected + all subscriptions with the same name (different type)
        return Subscription::where(function ($q) use ($ids, $names) {
            $q->whereIn('id', $ids)->orWhereIn('name', $names);
        })->update(['customer_id' => $customerId]);
    }

    /**
     * Store a payment for a subscription
     */
    public function storePayment(Request $request, Subscription $neniweb)
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0',
            'period_start' => 'required|date',
            'period_end' => 'required|date|after_or_equal:period_start',
            'status' => 'required|in:zaplaceno,nezaplaceno,po_splatnosti',
            'paid_at' => 'nullable|date',
            'payment_method' => 'nullable|in:prevod,hotovost,karta',
            'notes' => 'nullable|string',
        ]);

        $validated['subscription_id'] = $neniweb->id;

        // If status is zaplaceno and no paid_at, set it to now
        if ($validated['status'] === 'zaplaceno' && empty($validated['paid_at'])) {
            $validated['paid_at'] = now();
        }

        SubscriptionPayment::create($validated);

        return back()->with('success', 'Platba zaznamenána.');
    }

    /**
     * Mark a payment as paid
     */
    public function markPaymentPaid(Subscription $neniweb, SubscriptionPayment $payment)
    {
        abort_if($payment->subscription_id !== $neniweb->id, 403);

        $payment->update([
            'status' => 'zaplaceno',
            'paid_at' => now(),
        ]);

        return back()->with('success', 'Platba označena jako zaplacená.');
    }

    /**
     * Create an invoice from a subscription (domain/hosting/service).
     * Groups domain + hosting with the same name into one invoice.
     */
    public function createInvoice(Subscription $neniweb)
    {
        if (!$neniweb->customer_id) {
            return back()->with('error', 'Nelze vystavit fakturu — služba nemá přiřazeného zákazníka.');
        }

        // Find related subscriptions with the same name + customer (e.g. domain + hosting)
        $subscriptions = Subscription::where('name', $neniweb->name)
            ->where('customer_id', $neniweb->customer_id)
            ->where('status', 'aktivni')
            ->where('is_free', false)
            ->get();

        if ($subscriptions->isEmpty()) {
            return back()->with('error', 'Žádné fakturovatelné služby.');
        }

        // Check for existing unpaid invoice
        $hasUnpaid = $neniweb->invoices()
            ->whereIn('status', ['vystavena', 'odeslana'])
            ->exists();

        if ($hasUnpaid) {
            return back()->with('error', 'Pro tuto službu již existuje nevyřízená faktura.');
        }

        $invoice = DB::transaction(function () use ($subscriptions) {
            $items = [];
            foreach ($subscriptions as $sub) {
                // Skip external domains — registered elsewhere, customer pays their registrar
                if ($sub->type === 'domena' && !$sub->is_registered_by_us) continue;

                $price = (float) $sub->sell_yearly ?: (float) $sub->price_yearly;
                if ($price <= 0) continue;

                $typeLabel = match ($sub->type) {
                    'domena' => 'Obnova domény',
                    'hosting' => 'Hosting',
                    'sluzba' => 'Služba',
                    default => 'Služba',
                };

                // Build period string from subscription dates
                $periodStr = '1 rok';
                if ($sub->expires_at) {
                    $expiry = \Carbon\Carbon::parse($sub->expires_at);
                    $start = $sub->billing_cycle === 'mesicni'
                        ? $expiry->copy()->subMonth()
                        : $expiry->copy()->subYear();
                    $periodStr = $start->format('j. n. Y') . ' – ' . $expiry->format('j. n. Y');
                }

                $items[] = [
                    'subscription' => $sub,
                    'description' => "{$typeLabel} {$sub->name} ({$periodStr})",
                    'quantity' => 1,
                    'unit' => 'rok',
                    'unit_price' => $price,
                    'total_price' => $price,
                ];
            }

            if (empty($items)) {
                return null;
            }

            $total = collect($items)->sum('total_price');
            $customer = $subscriptions->first()->customer;
            $invoiceNumber = Invoice::getNextInvoiceNumber('6');

            $invoice = Invoice::create([
                'customer_id' => $customer->id,
                'invoice_number' => $invoiceNumber,
                'variable_symbol' => $invoiceNumber,
                'issue_date' => now()->toDateString(),
                'due_date' => now()->addDays(14)->toDateString(),
                'status' => 'vystavena',
                'payment_method' => 'banka',
                'total' => $total,
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

                $invoice->subscriptions()->attach($item['subscription']->id);
            }

            return $invoice;
        });

        if (!$invoice) {
            return back()->with('error', 'Služby mají nulovou cenu — nelze vystavit fakturu.');
        }

        return redirect()->route('faktury.show', $invoice)
            ->with('success', "Faktura {$invoice->invoice_number} vystavena.");
    }

    /**
     * Create a single merged invoice for ALL active non-free subscriptions of a customer.
     * Skips external domains (is_registered_by_us=false).
     */
    public function createCustomerInvoice(\App\Models\Customer $customer)
    {
        $subscriptions = Subscription::where('customer_id', $customer->id)
            ->where('status', 'aktivni')
            ->where('is_free', false)
            ->get();

        if ($subscriptions->isEmpty()) {
            return back()->with('error', 'Zákazník nemá žádné fakturovatelné služby.');
        }

        $invoice = DB::transaction(function () use ($subscriptions, $customer) {
            $items = [];
            foreach ($subscriptions as $sub) {
                if ($sub->type === 'domena' && !$sub->is_registered_by_us) continue;

                $price = (float) $sub->sell_yearly ?: (float) $sub->price_yearly;
                if ($price <= 0) continue;

                $typeLabel = match ($sub->type) {
                    'domena' => 'Obnova domény',
                    'hosting' => 'Hosting',
                    'sluzba' => 'Služba',
                    default => 'Služba',
                };

                $periodStr = '1 rok';
                if ($sub->expires_at) {
                    $expiry = \Carbon\Carbon::parse($sub->expires_at);
                    $start = $sub->billing_cycle === 'mesicni'
                        ? $expiry->copy()->subMonth()
                        : $expiry->copy()->subYear();
                    $periodStr = $start->format('j. n. Y') . ' – ' . $expiry->format('j. n. Y');
                }

                $items[] = [
                    'subscription' => $sub,
                    'description' => "{$typeLabel} {$sub->name} ({$periodStr})",
                    'quantity' => 1,
                    'unit' => 'rok',
                    'unit_price' => $price,
                    'total_price' => $price,
                ];
            }

            if (empty($items)) return null;

            $total = collect($items)->sum('total_price');
            $invoiceNumber = Invoice::getNextInvoiceNumber('6');

            $invoice = Invoice::create([
                'customer_id' => $customer->id,
                'invoice_number' => $invoiceNumber,
                'variable_symbol' => $invoiceNumber,
                'issue_date' => now()->toDateString(),
                'due_date' => now()->addDays(14)->toDateString(),
                'status' => 'vystavena',
                'payment_method' => 'banka',
                'total' => $total,
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
                $invoice->subscriptions()->attach($item['subscription']->id);
            }

            return $invoice;
        });

        if (!$invoice) {
            return back()->with('error', 'Služby mají nulovou cenu — nelze vystavit fakturu.');
        }

        return redirect()->route('faktury.show', $invoice)
            ->with('success', "Souhrnná faktura {$invoice->invoice_number} vystavena.");
    }

    /**
     * Sync from both APIs:
     * 1. Portal API (portal.vas-hosting.cz) → 70 domain registrations
     * 2. Server API (sss06.vas-server.cz) → 4 hostings on dedicated server
     */
    public function sync(VasHostingService $vasHosting)
    {
        // Fetch data from APIs before transaction to avoid long-held locks
        $portalDomains  = $vasHosting->listPortalDomains();
        $serverHostings = $vasHosting->listServerHostings();
        $vpscServers    = $vasHosting->getVpsCentrumServers();

        // Pre-fetch VPS Centrum domain lists outside transaction
        $vpscData = [];
        foreach ($vpscServers as $server) {
            $apiKey = $server['api_key'] ?? '';
            if (empty($apiKey)) continue;
            $vpscData[] = [
                'server'  => $server,
                'domains' => $vasHosting->listVpsCentrumDomains($server['url'], $apiKey),
                'sizes'   => [], // fetched per-domain below
            ];
        }

        // Pre-fetch sizes for VPS Centrum domains
        foreach ($vpscData as &$vpsc) {
            foreach ($vpsc['domains'] as $domainInfo) {
                $domainName = $domainInfo['domena'] ?? '';
                if (empty($domainName)) continue;
                $vpsc['sizes'][$domainName] = $vasHosting->getVpsCentrumDomainSize(
                    $vpsc['server']['url'],
                    $vpsc['server']['api_key'],
                    $domainName
                );
            }
        }
        unset($vpsc);

        [$syncedDomains, $createdDomains, $syncedHostings, $createdHostings] = DB::transaction(
            function () use ($portalDomains, $serverHostings, $vpscData) {
                $syncedDomains   = 0;
                $createdDomains  = 0;
                $syncedHostings  = 0;
                $createdHostings = 0;

                // --- 1. Sync domains from Portal API ---
                if (!empty($portalDomains)) {
                    foreach ($portalDomains as $domainName => $info) {
                        $portalId = $info['id'] ?? null;

                        $domain = Subscription::where('type', 'domena')
                            ->where(function ($q) use ($portalId, $domainName) {
                                $q->where('portal_domain_id', $portalId)
                                  ->orWhere(function ($q2) use ($domainName) {
                                      $q2->whereNull('portal_domain_id')->where('name', $domainName);
                                  });
                            })
                            ->first();

                        $data = [
                            'portal_domain_id'   => $portalId,
                            'is_registered_by_us' => $info['isRegisteredByUs'] ?? false,
                            'ip_address'          => $info['ip'] ?? null,
                            'tariff'              => $info['tariff'] ?? null,
                            'storage_quota_mb'    => $info['storageQuota'] ?? 0,
                            'storage_used_mb'     => $info['storageUsed'] ?? 0,
                            'synced_at'           => now(),
                        ];

                        if ($domain) {
                            // Domains: registrar API is source of truth for expires_at
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
                        } else {
                            if ($info['expiration'] ?? null) {
                                $data['expires_at'] = $info['expiration'];
                            }
                            Subscription::create(array_merge($data, [
                                'type'     => 'domena',
                                'name'     => $domainName,
                                'provider' => ($info['isRegisteredByUs'] ?? false) ? 'Váš-Hosting' : null,
                                'status'   => 'aktivni',
                            ]));
                            $createdDomains++;
                        }
                    }
                }

                // --- 2. Sync hostings from Server API ---
                if (!empty($serverHostings)) {
                    foreach ($serverHostings as $domainName => $info) {
                        $vasId = $info['id'] ?? null;

                        $hosting = Subscription::where('type', 'hosting')
                            ->where(function ($q) use ($vasId, $domainName) {
                                $q->where('vas_hosting_id', $vasId)
                                  ->orWhere(function ($q2) use ($domainName) {
                                      $q2->whereNull('vas_hosting_id')->where('name', $domainName);
                                  });
                            })
                            ->first();

                        $quotaMb = (int) round(($info['storageQuota'] ?? 0) / 1048576);
                        $usedMb  = (int) round(($info['storageUsed'] ?? 0) / 1048576);

                        $data = [
                            'vas_hosting_id'   => $vasId,
                            'storage_quota_mb' => $quotaMb,
                            'storage_used_mb'  => $usedMb,
                            'synced_at'        => now(),
                        ];

                        if ($hosting) {
                            $hosting->update($data);
                            $syncedHostings++;
                        } else {
                            if ($info['expiration'] ?? null) {
                                $data['expires_at'] = $info['expiration'];
                            }
                            Subscription::create(array_merge($data, [
                                'type'     => 'hosting',
                                'name'     => $domainName,
                                'provider' => 'Váš-Hosting',
                                'server'   => 'sss06.vas-server.cz',
                                'status'   => 'aktivni',
                            ]));
                            $createdHostings++;
                        }
                    }
                }

                // --- 3. Sync hostings from VPS Centrum servers ---
                foreach ($vpscData as $vpsc) {
                    $serverName = $vpsc['server']['name'];

                    foreach ($vpsc['domains'] as $domainInfo) {
                        $domainName = $domainInfo['domena'] ?? '';
                        if (empty($domainName)) continue;

                        $hosting = Subscription::where('type', 'hosting')
                            ->where('name', $domainName)
                            ->where('server', $serverName)
                            ->first();

                        $data = [
                            'server'           => $serverName,
                            'storage_quota_mb' => 4096,
                            'synced_at'        => now(),
                        ];

                        $sizeInfo = $vpsc['sizes'][$domainName] ?? null;
                        if ($sizeInfo) {
                            $data['storage_used_mb'] = (int) round(
                                (float) ($sizeInfo['mail_size_mb'] ?? 0) +
                                (float) ($sizeInfo['db_size_mb'] ?? 0) +
                                (float) ($sizeInfo['ftp_size_mb'] ?? 0)
                            );
                        }

                        if ($hosting) {
                            $hosting->update($data);
                            $syncedHostings++;
                        } else {
                            if ($domainInfo['domena_expirace'] ?? null) {
                                $data['expires_at'] = $domainInfo['domena_expirace'];
                            }
                            Subscription::create(array_merge($data, [
                                'type'     => 'hosting',
                                'name'     => $domainName,
                                'provider' => 'Váš-Hosting',
                                'status'   => 'aktivni',
                            ]));
                            $createdHostings++;
                        }
                    }
                }

                return [$syncedDomains, $createdDomains, $syncedHostings, $createdHostings];
            }
        );

        $totalSynced  = $syncedDomains + $syncedHostings;
        $totalCreated = $createdDomains + $createdHostings;

        if ($totalSynced === 0 && $totalCreated === 0 && empty($portalDomains) && empty($serverHostings)) {
            return back()->with('error', 'Nepodařilo se načíst data z API. Zkontrolujte API klíče.');
        }

        $msg = "Sync dokončen: {$createdDomains} nových domén, {$createdHostings} nových hostingů, {$totalSynced} aktualizováno.";

        return back()->with('success', $msg);
    }

    /**
     * Activate a domain on vas-hosting server (create hosting space).
     * POST neniweb/activate-domain
     * Body: { domain_name: string }
     */
    public function activateDomain(Request $request, VasHostingService $vasHosting)
    {
        $validated = $request->validate([
            'domain_name' => ['required', 'string', 'max:253', 'regex:/^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/'],
        ], [
            'domain_name.required' => 'Název domény je povinný.',
            'domain_name.regex'    => 'Zadejte platný název domény (např. example.cz).',
            'domain_name.max'      => 'Název domény může mít nejvýše 253 znaků.',
        ]);

        $domainName = strtolower($validated['domain_name']);

        $result = $vasHosting->activateDomainOnServer($domainName);

        if ($result['success']) {
            return response()->json([
                'data'    => $result['data'] ?? null,
                'message' => "Doména {$domainName} byla úspěšně aktivována na serveru.",
                'errors'  => null,
            ]);
        }

        // "Domain already exists" = hosting je na serveru, jen ho nemáme v CRM → úspěch (spustí sync)
        $apiStatus = $result['status'] ?? 0;
        if ($apiStatus === 400 && str_contains($result['message'] ?? '', 'already exists')) {
            return response()->json([
                'data'    => null,
                'message' => "Doména {$domainName} již na serveru existuje. Spouštím sync.",
            ]);
        }

        $httpStatus = match (true) {
            $apiStatus === 409 => 409,
            $apiStatus === 422 => 422,
            $apiStatus === 0   => 502,
            default            => 500,
        };

        return response()->json([
            'data'    => null,
            'message' => $result['message'] ?? 'Aktivace domény selhala.',
            'errors'  => ['domain_name' => [$result['message']]],
        ], $httpStatus);
    }

    public function toggleIgnoreAlerts(Subscription $neniweb)
    {
        $neniweb->update([
            'alerts_ignored_at' => $neniweb->alerts_ignored_at ? null : now(),
        ]);

        $label = $neniweb->alerts_ignored_at ? 'Upozornění ignorována' : 'Upozornění obnovena';

        return back()->with('success', $label);
    }

    public function updateFolder(Request $request, Subscription $neniweb)
    {
        $validated = $request->validate([
            'folder_id' => ['nullable', 'exists:subscription_folders,id'],
            'parent_subscription_id' => ['nullable', 'exists:subscriptions,id'],
        ]);

        $neniweb->update($validated);

        return back()->with('success', 'Aktualizováno.');
    }
}
