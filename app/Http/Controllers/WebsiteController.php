<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\ManagementPlan;
use App\Models\SyncBlacklist;
use App\Models\SyncPending;
use App\Models\Website;
use App\Models\WebsitePayment;
use App\Models\VpsServer;
use App\Services\VasHostingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class WebsiteController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min((int) ($request->input('per_page') ?: 50), 100);

        $query = Website::query()
            ->with(['customer:id,name,company', 'hostingServer', 'aliasOf:id,name', 'managementPlan', 'credentials', 'emailAccounts'])
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
                        ->whereNotNull('hosting_expires_at')
                        ->where('hosting_expires_at', '<', now()),
                    'expiring_soon' => $q->where('status', 'aktivni')
                        ->whereNotNull('hosting_expires_at')
                        ->where('hosting_expires_at', '>=', now())
                        ->where('hosting_expires_at', '<=', now()->addDays(30)),
                    'active' => $q->where('status', 'aktivni')
                        ->where(fn ($q2) => $q2->whereNull('hosting_expires_at')
                            ->orWhere('hosting_expires_at', '>', now()->addDays(30))),
                    'no_expiry' => $q->where('status', 'aktivni')
                        ->whereNull('hosting_expires_at'),
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
            ->when($request->input('filter_management_plan'), fn ($q, $v) => $q->whereIn('management_plan_id', explode(',', $v)));

        $allowedSorts = ['name', 'hosting_expires_at', 'domain_expires_at', 'sell_yearly', 'cost_yearly', 'status', 'server', 'created_at', 'storage_used_mb'];
        $sortBy = $request->input('sort_by');
        $sortDir = $request->input('sort_dir') === 'desc' ? 'desc' : 'asc';

        if ($sortBy && in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            // Sort aliases right after their parent: use COALESCE(alias_of_id, id) to group them
            $query->orderByRaw('COALESCE(alias_of_id, id), alias_of_id IS NULL DESC, hosting_expires_at IS NULL, hosting_expires_at ASC');
        }

        $websites = $query
            ->paginate($perPage)
            ->withQueryString()
            ->through(fn ($website) => array_merge($website->toArray(), [
                'days_until_expiry' => $website->daysUntilExpiry(),
                'urgency' => $website->expiryUrgency(),
                'has_unpaid' => $website->hasUnpaidPayments(),
                'yearly_margin' => $website->yearlyMargin(),
            ]));

        // VPS servers with stats
        $vpsServers = VpsServer::with('customer:id,name,company')
            ->withCount(['hostings'])
            ->get()
            ->map(fn ($vps) => array_merge($vps->toArray(), [
                'storage_used_mb' => $vps->totalStorageUsedMb(),
            ]));

        // Payments overview - all unpaid/overdue
        $paymentsQuery = WebsitePayment::query()
            ->with(['website.customer:id,name,company', 'website:id,name,customer_id'])
            ->when($request->input('payment_status'), function ($q, $status) {
                if ($status === 'nezaplaceno') $q->unpaid();
                elseif ($status === 'po_splatnosti') $q->overdue();
                elseif ($status === 'zaplaceno') $q->paid();
            }, function ($q) {
                // Default: show unpaid + overdue
                $q->whereIn('status', ['nezaplaceno', 'po_splatnosti']);
            })
            ->when($request->input('search'), function ($q, $term) {
                $q->whereHas('website', fn ($wq) =>
                    $wq->where('name', 'ilike', "%{$term}%")
                      ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', "%{$term}%"))
                );
            })
            ->orderBy('period_end');

        $payments = $paymentsQuery
            ->paginate($perPage, ['*'], 'payments_page')
            ->withQueryString();

        // Stats: only count our own websites (not external)
        $ours = fn () => Website::where('is_external', false);

        $stats = [
            'total_websites'   => $ours()->where('status', 'aktivni')->count(),
            'total_aliases'    => $ours()->where('status', 'aktivni')->whereNotNull('alias_of_id')->count(),
            'expired_count'    => $ours()->where('status', 'aktivni')
                                    ->whereNotNull('hosting_expires_at')->where('hosting_expires_at', '<', now())->count(),
            'total_vps'        => VpsServer::active()->count(),
            'unpaid_count'     => WebsitePayment::unpaid()->count()
                                + WebsitePayment::overdue()->count(),
            'unpaid_amount'    => (float) WebsitePayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])->sum('amount'),
            'arr_hosting'      => (float) $ours()->where('status', 'aktivni')
                                    ->selectRaw("COALESCE(SUM(COALESCE(NULLIF(sell_yearly, 0), 0)), 0) as rev")
                                    ->value('rev'),
            'external_count'   => Website::where('is_external', true)->where('status', 'aktivni')->count(),
            // Billing overview: expired websites that need invoicing
            'to_invoice_count' => $ours()->where('status', 'aktivni')
                                    ->whereNotNull('hosting_expires_at')
                                    ->where('hosting_expires_at', '<', now())
                                    ->where('is_free', false)
                                    ->whereDoesntHave('payments', fn ($q) => $q->where('status', 'zaplaceno')
                                        ->where('period_end', '>=', now()->subYear()))
                                    ->count(),
            'to_invoice_amount' => (float) $ours()->where('status', 'aktivni')
                                    ->whereNotNull('hosting_expires_at')
                                    ->where('hosting_expires_at', '<', now())
                                    ->where('is_free', false)
                                    ->whereDoesntHave('payments', fn ($q) => $q->where('status', 'zaplaceno')
                                        ->where('period_end', '>=', now()->subYear()))
                                    ->selectRaw("COALESCE(SUM(COALESCE(NULLIF(sell_yearly, 0), 0)), 0) as total")
                                    ->value('total'),
            'pending_count'    => SyncPending::count(),
        ];

        // Unique server hostnames for filter dropdown
        $serverOptions = Website::whereNotNull('server')->where('server', '!=', '')
            ->distinct()->pluck('server')->sort()->values();

        return Inertia::render('WeboveSluzby/Index', [
            'websites'      => $websites,
            'vpsServers'    => $vpsServers,
            'payments'      => $payments,
            'stats'         => $stats,
            'managementPlans' => ManagementPlan::where('is_active', true)->orderBy('sort_order')->get(),
            'customers'     => Customer::select('id', 'name', 'company')->orderBy('name')->get(),
            'filterOptions' => ['servers' => $serverOptions],
            'filters'       => $request->only([
                'search', 'tab', 'status', 'sort_by', 'sort_dir', 'payment_status', 'expiry_filter',
                'filter_customer', 'filter_status', 'filter_auto_renew', 'filter_external',
                'filter_registered', 'filter_server', 'filter_management_plan',
            ]),
        ]);
    }

    public function show(Website $website)
    {
        $website->load([
            'customer',
            'payments' => fn ($q) => $q->orderBy('period_end', 'desc'),
            'payments.invoice',
            'invoices' => fn ($q) => $q->orderBy('issue_date', 'desc'),
            'emailAccounts',
            'credentials',
            'hostingServer',
            'aliasOf',
            'aliases',
            'managementPlan',
        ]);

        $paymentStats = [
            'total_paid' => (float) $website->payments()->paid()->sum('amount'),
            'total_unpaid' => (float) $website->payments()->whereIn('status', ['nezaplaceno', 'po_splatnosti'])->sum('amount'),
            'payments_count' => $website->payments()->count(),
        ];

        $website->credentials->each(fn ($c) => $c->makeVisible('password'));
        $website->emailAccounts->each(fn ($e) => $e->makeVisible('password'));

        return Inertia::render('WeboveSluzby/Show', [
            'website' => array_merge($website->toArray(), [
                'days_until_expiry' => $website->daysUntilExpiry(),
                'urgency' => $website->expiryUrgency(),
                'yearly_margin' => $website->yearlyMargin(),
                'monthly_revenue' => $website->monthlyRevenue(),
                'total_annual_revenue' => $website->totalAnnualRevenue(),
            ]),
            'paymentStats' => $paymentStats,
            'customers' => Customer::select('id', 'name', 'company')->orderBy('name')->get(),
        ]);
    }

    public function create()
    {
        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();
        $vpsServers = VpsServer::active()->select('id', 'name')->orderBy('name')->get();
        $managementPlans = ManagementPlan::where('is_active', true)->orderBy('sort_order')->get();
        $aliasOptions = Website::whereNull('alias_of_id')
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('WeboveSluzby/Create', [
            'customers' => $customers,
            'vpsServers' => $vpsServers,
            'managementPlans' => $managementPlans,
            'aliasOptions' => $aliasOptions,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id'            => 'nullable|exists:customers,id',
            'name'                   => 'required|string|max:255|unique:websites,name',
            'server'                 => 'nullable|string|max:255',
            'status'                 => 'required|in:aktivni,pozastaveno,zruseno',
            'notes'                  => 'nullable|string',
            'starts_at'              => 'nullable|date',
            'is_registered_by_us'    => 'boolean',
            'auto_renew'             => 'boolean',
            'auto_invoice'           => 'boolean',
            'auto_invoice_management' => 'boolean',
            'is_free'                => 'boolean',
            'is_external'            => 'boolean',
            'sell_yearly'            => 'nullable|numeric|min:0',
            'cost_yearly'            => 'nullable|numeric|min:0',
            'domain_sell_yearly'     => 'nullable|numeric|min:0',
            'domain_cost_yearly'     => 'nullable|numeric|min:0',
            'hosting_sell_yearly'    => 'nullable|numeric|min:0',
            'hosting_cost_yearly'    => 'nullable|numeric|min:0',
            'admin_url'              => 'nullable|string|max:500',
            'domain_expires_at'      => 'nullable|date',
            'hosting_expires_at'     => 'nullable|date',
            'hosting_server_id'      => 'nullable|exists:vps_servers,id',
            'alias_of_id'            => 'nullable|exists:websites,id',
            'management_plan_id'     => 'nullable|exists:management_plans,id',
            'management_cycle'       => 'nullable|in:quarterly,semi_annual,annual',
            'storage_quota_mb'       => 'nullable|integer|min:0',
        ]);

        $validated['domain_sell_yearly'] = $validated['domain_sell_yearly'] ?? 0;
        $validated['domain_cost_yearly'] = $validated['domain_cost_yearly'] ?? 0;
        $validated['hosting_sell_yearly'] = $validated['hosting_sell_yearly'] ?? 0;
        $validated['hosting_cost_yearly'] = $validated['hosting_cost_yearly'] ?? 0;
        $validated['storage_quota_mb'] = $validated['storage_quota_mb'] ?? 0;

        // Compute totals from split prices
        $validated['sell_yearly'] = ($validated['domain_sell_yearly'] ?? 0) + ($validated['hosting_sell_yearly'] ?? 0);
        $validated['cost_yearly'] = ($validated['domain_cost_yearly'] ?? 0) + ($validated['hosting_cost_yearly'] ?? 0);

        $website = Website::create($validated);

        return redirect("/webove-sluzby/{$website->id}")
            ->with('success', 'Web vytvořen.');
    }

    public function edit(Website $website)
    {
        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();
        $vpsServers = VpsServer::active()->select('id', 'name')->orderBy('name')->get();
        $managementPlans = ManagementPlan::where('is_active', true)->orderBy('sort_order')->get();
        $aliasOptions = Website::whereNull('alias_of_id')
            ->where('id', '!=', $website->id)
            ->whereDoesntHave('aliases', fn ($q) => $q->where('id', $website->id))
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('WeboveSluzby/Edit', [
            'website' => $website,
            'customers' => $customers,
            'vpsServers' => $vpsServers,
            'managementPlans' => $managementPlans,
            'aliasOptions' => $aliasOptions,
        ]);
    }

    public function update(Request $request, Website $website)
    {
        $validated = $request->validate([
            'customer_id'            => 'nullable|exists:customers,id',
            'name'                   => "required|string|max:255|unique:websites,name,{$website->id}",
            'server'                 => 'nullable|string|max:255',
            'status'                 => 'required|in:aktivni,pozastaveno,zruseno',
            'notes'                  => 'nullable|string',
            'starts_at'              => 'nullable|date',
            'is_registered_by_us'    => 'boolean',
            'auto_renew'             => 'boolean',
            'auto_invoice'           => 'boolean',
            'auto_invoice_management' => 'boolean',
            'is_free'                => 'boolean',
            'is_external'            => 'boolean',
            'sell_yearly'            => 'nullable|numeric|min:0',
            'cost_yearly'            => 'nullable|numeric|min:0',
            'domain_sell_yearly'     => 'nullable|numeric|min:0',
            'domain_cost_yearly'     => 'nullable|numeric|min:0',
            'hosting_sell_yearly'    => 'nullable|numeric|min:0',
            'hosting_cost_yearly'    => 'nullable|numeric|min:0',
            'admin_url'              => 'nullable|string|max:500',
            'domain_expires_at'      => 'nullable|date',
            'hosting_expires_at'     => 'nullable|date',
            'hosting_server_id'      => 'nullable|exists:vps_servers,id',
            'alias_of_id'            => 'nullable|exists:websites,id',
            'management_plan_id'     => 'nullable|exists:management_plans,id',
            'management_cycle'       => 'nullable|in:quarterly,semi_annual,annual',
            'storage_quota_mb'       => 'nullable|integer|min:0',
        ]);

        $validated['domain_sell_yearly'] = $validated['domain_sell_yearly'] ?? 0;
        $validated['domain_cost_yearly'] = $validated['domain_cost_yearly'] ?? 0;
        $validated['hosting_sell_yearly'] = $validated['hosting_sell_yearly'] ?? 0;
        $validated['hosting_cost_yearly'] = $validated['hosting_cost_yearly'] ?? 0;
        $validated['storage_quota_mb'] = $validated['storage_quota_mb'] ?? 0;

        // Compute totals from split prices
        $validated['sell_yearly'] = ($validated['domain_sell_yearly'] ?? 0) + ($validated['hosting_sell_yearly'] ?? 0);
        $validated['cost_yearly'] = ($validated['domain_cost_yearly'] ?? 0) + ($validated['hosting_cost_yearly'] ?? 0);

        $website->update($validated);

        // Zapamatuj si co se změnilo PŘED jakýmkoliv dalším update
        $expirationChanged = $website->wasChanged('hosting_expires_at') || $website->wasChanged('domain_expires_at');
        $hostingExpirationChanged = $website->wasChanged('hosting_expires_at');
        $domainExpirationChanged = $website->wasChanged('domain_expires_at');

        // If alias_of_id was set, sync expiration from parent
        if ($website->alias_of_id) {
            $parent = Website::find($website->alias_of_id);
            if ($parent) {
                if ($website->hosting_expires_at != $parent->hosting_expires_at) {
                    $website->update(['hosting_expires_at' => $parent->hosting_expires_at]);
                }
                if ($website->domain_expires_at != $parent->domain_expires_at) {
                    $website->update(['domain_expires_at' => $parent->domain_expires_at]);
                }
            }
        }

        // If expiration changed on parent, sync to all aliases
        // Použij uložený výsledek místo wasChanged() — druhý update() by změnil stav wasChanged()
        if ($expirationChanged) {
            $updateData = [];
            if ($hostingExpirationChanged) {
                $updateData['hosting_expires_at'] = $website->hosting_expires_at;
            }
            if ($domainExpirationChanged) {
                $updateData['domain_expires_at'] = $website->domain_expires_at;
            }
            if (! empty($updateData)) {
                $website->aliases()->update($updateData);
            }
        }

        return redirect("/webove-sluzby/{$website->id}")
            ->with('success', 'Web aktualizován.');
    }

    public function destroy(Website $website)
    {
        $website->delete();

        return redirect('/webove-sluzby')
            ->with('success', 'Web smazán.');
    }

    /**
     * Bulk update websites
     */
    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:websites,id',
            'action' => 'required|in:set_free,unset_free,set_status,set_customer,clear_expiry,set_external,unset_external,set_management_plan',
            'value' => 'nullable|string',
        ]);

        $websites = Website::whereIn('id', $validated['ids']);

        match ($validated['action']) {
            'set_free' => $websites->update(['is_free' => true]),
            'unset_free' => $websites->update(['is_free' => false]),
            'set_status' => in_array($validated['value'], ['aktivni', 'pozastaveno', 'zruseno'])
                ? $websites->update(['status' => $validated['value']])
                : null,
            'set_customer' => $this->bulkSetCustomer($validated['ids'], $validated['value'] ?: null),
            'clear_expiry' => $websites->update(['hosting_expires_at' => null, 'domain_expires_at' => null]),
            'set_external' => $websites->update(['is_external' => true]),
            'unset_external' => $websites->update(['is_external' => false]),
            'set_management_plan' => $websites->update([
                'management_plan_id' => $validated['value'] === 'none' ? null : $validated['value'],
            ]),
        };

        return back()->with('success', count($validated['ids']) . ' položek aktualizováno.');
    }

    /**
     * Set customer on selected websites.
     */
    private function bulkSetCustomer(array $ids, ?string $customerId): int
    {
        return Website::whereIn('id', $ids)->update(['customer_id' => $customerId]);
    }

    /**
     * Store a payment for a website
     */
    public function storePayment(Request $request, Website $website)
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

        $validated['website_id'] = $website->id;

        // If status is zaplaceno and no paid_at, set it to now
        if ($validated['status'] === 'zaplaceno' && empty($validated['paid_at'])) {
            $validated['paid_at'] = now();
        }

        WebsitePayment::create($validated);

        return back()->with('success', 'Platba zaznamenána.');
    }

    /**
     * Mark a payment as paid
     */
    public function markPaymentPaid(Website $website, WebsitePayment $payment)
    {
        abort_if($payment->website_id !== $website->id, 403);

        $payment->update([
            'status' => 'zaplaceno',
            'paid_at' => now(),
        ]);

        return back()->with('success', 'Platba označena jako zaplacená.');
    }

    /**
     * Create an invoice from a website.
     * One website = one invoice with hosting + domain items.
     */
    public function createInvoice(Website $website)
    {
        if (!$website->customer_id) {
            return back()->with('error', 'Nelze vystavit fakturu — web nemá přiřazeného zákazníka.');
        }

        if ($website->is_free) {
            return back()->with('error', 'Nelze vystavit fakturu — web je zdarma.');
        }

        // Check for existing unpaid invoice
        $hasUnpaid = $website->invoices()
            ->whereIn('status', ['vystavena', 'odeslana'])
            ->exists();

        if ($hasUnpaid) {
            return back()->with('error', 'Pro tento web již existuje nevyřízená faktura.');
        }

        $invoice = DB::transaction(function () use ($website) {
            $items = [];
            $websiteIds = [$website->id];

            // Build period string from hosting expiration
            $periodStr = '1 rok';
            if ($website->hosting_expires_at) {
                $expiry = \Carbon\Carbon::parse($website->hosting_expires_at);
                $start = $expiry->copy()->subYear();
                $periodStr = $start->format('j. n. Y') . ' – ' . $expiry->format('j. n. Y');
            }

            // Hosting item
            $hostingPrice = (float) $website->hosting_sell_yearly;
            if ($hostingPrice > 0) {
                $items[] = [
                    'description' => "Hosting {$website->name} ({$periodStr})",
                    'quantity' => 1,
                    'unit' => 'rok',
                    'unit_price' => $hostingPrice,
                    'total_price' => $hostingPrice,
                ];
            }

            // Domain item (if registered by us)
            $domainPrice = (float) $website->domain_sell_yearly;
            if ($domainPrice > 0 && $website->is_registered_by_us) {
                $items[] = [
                    'description' => "Doména {$website->name} ({$periodStr})",
                    'quantity' => 1,
                    'unit' => 'rok',
                    'unit_price' => $domainPrice,
                    'total_price' => $domainPrice,
                ];
            }

            // Alias domains — add their domain prices
            $aliases = Website::where('alias_of_id', $website->id)
                ->whereNull('deleted_at')
                ->where('is_registered_by_us', true)
                ->where('domain_sell_yearly', '>', 0)
                ->get();

            foreach ($aliases as $alias) {
                $items[] = [
                    'description' => "Doména {$alias->name} ({$periodStr})",
                    'quantity' => 1,
                    'unit' => 'rok',
                    'unit_price' => (float) $alias->domain_sell_yearly,
                    'total_price' => (float) $alias->domain_sell_yearly,
                ];
                $websiteIds[] = $alias->id;
            }

            if (empty($items)) {
                return null;
            }

            $total = collect($items)->sum('total_price');
            $invoiceNumber = Invoice::getNextInvoiceNumber('6');

            $invoice = Invoice::create([
                'customer_id' => $website->customer_id,
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
            }

            // Attach all websites (parent + aliases) via pivot
            foreach ($websiteIds as $wId) {
                $invoice->websites()->attach($wId, ['invoice_type' => 'hosting']);
            }

            return $invoice;
        });

        if (!$invoice) {
            return back()->with('error', 'Web má nulovou cenu — nelze vystavit fakturu.');
        }

        return redirect("/faktury/{$invoice->id}")
            ->with('success', "Faktura {$invoice->invoice_number} vystavena.");
    }

    /**
     * Create a single merged invoice for ALL active non-free websites of a customer.
     * Skips aliases (alias_of_id IS NOT NULL) and external domains.
     */
    public function createCustomerInvoice(Customer $customer)
    {
        $websites = Website::where('customer_id', $customer->id)
            ->where('status', 'aktivni')
            ->where('is_free', false)
            ->whereNull('alias_of_id')
            ->get();

        if ($websites->isEmpty()) {
            return back()->with('error', 'Zákazník nemá žádné fakturovatelné weby.');
        }

        $invoice = DB::transaction(function () use ($websites, $customer) {
            $items = [];
            $attachIds = [];

            foreach ($websites as $website) {
                // Skip external domains
                if ($website->is_external && !$website->is_registered_by_us) continue;

                $price = (float) $website->sell_yearly;
                if ($price <= 0) continue;

                $periodStr = '1 rok';
                if ($website->hosting_expires_at) {
                    $expiry = \Carbon\Carbon::parse($website->hosting_expires_at);
                    $start = $expiry->copy()->subYear();
                    $periodStr = $start->format('j. n. Y') . ' – ' . $expiry->format('j. n. Y');
                }

                $description = "Hosting + doména {$website->name} ({$periodStr})";
                if ($website->server) {
                    $description = "Hosting {$website->name} na {$website->server} ({$periodStr})";
                }

                $items[] = [
                    'description' => $description,
                    'quantity' => 1,
                    'unit' => 'rok',
                    'unit_price' => $price,
                    'total_price' => $price,
                ];

                $attachIds[] = $website->id;
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
            }

            // Attach all websites via pivot
            foreach ($attachIds as $websiteId) {
                $invoice->websites()->attach($websiteId, ['invoice_type' => 'hosting']);
            }

            return $invoice;
        });

        if (!$invoice) {
            return back()->with('error', 'Weby mají nulovou cenu — nelze vystavit fakturu.');
        }

        return redirect("/faktury/{$invoice->id}")
            ->with('success', "Souhrnná faktura {$invoice->invoice_number} vystavena.");
    }

    /**
     * Sync from both APIs:
     * 1. Portal API (portal.vas-hosting.cz) → domain registrations
     * 2. Server API (sss06.vas-server.cz) → hostings on dedicated server
     *
     * New domains/hostings are NOT auto-created — they go to sync_pending.
     * Blacklisted domains are skipped entirely.
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
                'sizes'   => [],
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

        // Load blacklist for fast lookup
        $blacklist = SyncBlacklist::pluck('domain_name')->flip();

        [$updated, $pending, $skipped] = DB::transaction(
            function () use ($portalDomains, $serverHostings, $vpscData, $blacklist) {
                $updated = 0;
                $pending = 0;
                $skipped = 0;

                // Collect all domain names from all APIs
                $allApiDomains = [];

                // --- 1. Sync domains from Portal API ---
                if (!empty($portalDomains)) {
                    foreach ($portalDomains as $domainName => $info) {
                        $allApiDomains[$domainName] = true;

                        if ($blacklist->has($domainName)) {
                            $skipped++;
                            continue;
                        }

                        // Try to find existing website by name
                        $website = Website::where('name', $domainName)->first();

                        $data = [
                            'is_registered_by_us' => $info['isRegisteredByUs'] ?? false,
                            'ip_address'          => $info['ip'] ?? null,
                            'storage_quota_mb'    => $info['storageQuota'] ?? 0,
                            'storage_used_mb'     => $info['storageUsed'] ?? 0,
                            'synced_at'           => now(),
                        ];

                        if ($info['expiration'] ?? null) {
                            $data['domain_expires_at'] = $info['expiration'];
                        }

                        if ($website) {
                            $website->update($data);
                            $updated++;
                        } else {
                            // New domain — add to sync_pending (not auto-create)
                            SyncPending::firstOrCreate(
                                ['domain_name' => $domainName],
                                ['source' => 'portal']
                            );
                            $pending++;
                        }
                    }
                }

                // --- 2. Sync hostings from Server API ---
                if (!empty($serverHostings)) {
                    foreach ($serverHostings as $domainName => $info) {
                        $allApiDomains[$domainName] = true;

                        if ($blacklist->has($domainName)) {
                            $skipped++;
                            continue;
                        }

                        $website = Website::where('name', $domainName)->first();

                        $quotaMb = (int) round(($info['storageQuota'] ?? 0) / 1048576);
                        $usedMb  = (int) round(($info['storageUsed'] ?? 0) / 1048576);

                        $data = [
                            'storage_quota_mb' => $quotaMb,
                            'storage_used_mb'  => $usedMb,
                            'synced_at'        => now(),
                        ];

                        if ($info['expiration'] ?? null) {
                            $data['hosting_expires_at'] = $info['expiration'];
                        }

                        if ($website) {
                            // Set server if not already set
                            if (empty($website->server)) {
                                $data['server'] = 'sss06.vas-server.cz';
                            }
                            $website->update($data);
                            $updated++;
                        } else {
                            SyncPending::firstOrCreate(
                                ['domain_name' => $domainName],
                                ['source' => 'sss06']
                            );
                            $pending++;
                        }
                    }
                }

                // --- 3. Sync hostings from VPS Centrum servers ---
                foreach ($vpscData as $vpsc) {
                    $serverName = $vpsc['server']['name'];

                    foreach ($vpsc['domains'] as $domainInfo) {
                        $domainName = $domainInfo['domena'] ?? '';
                        if (empty($domainName)) continue;

                        $allApiDomains[$domainName] = true;

                        if ($blacklist->has($domainName)) {
                            $skipped++;
                            continue;
                        }

                        $website = Website::where('name', $domainName)->first();

                        $data = [
                            'server'           => $serverName,
                            'storage_quota_mb' => null,
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

                        if ($domainInfo['domena_expirace'] ?? null) {
                            $data['hosting_expires_at'] = $domainInfo['domena_expirace'];
                        }

                        if ($website) {
                            $website->update($data);
                            $updated++;
                        } else {
                            // Map full server name to short name matching CHECK constraint
                            $shortName = match (true) {
                                str_contains($serverName, 'ond08') => 'ond08',
                                str_contains($serverName, 'thaimassage') => 'thaimassage',
                                default => 'ond08', // fallback
                            };
                            SyncPending::firstOrCreate(
                                ['domain_name' => $domainName],
                                ['source' => $shortName]
                            );
                            $pending++;
                        }
                    }
                }

                return [$updated, $pending, $skipped];
            }
        );

        if ($updated === 0 && $pending === 0 && empty($portalDomains) && empty($serverHostings)) {
            return back()->with('error', 'Nepodařilo se načíst data z API. Zkontrolujte API klíče.');
        }

        $msg = "Sync dokončen: {$updated} aktualizováno, {$pending} ke schválení, {$skipped} přeskočeno (blacklist).";

        return back()->with('success', $msg);
    }

    /**
     * Approve a pending domain — create Website from sync_pending data.
     */
    public function approvePending(Request $request)
    {
        $validated = $request->validate([
            'domain_name' => 'required|string|max:255',
            'customer_id' => 'nullable|exists:customers,id',
        ]);

        $pendingItem = SyncPending::where('domain_name', $validated['domain_name'])->firstOrFail();

        Website::create([
            'name' => $pendingItem->domain_name,
            'status' => 'aktivni',
            'auto_invoice' => false,
            'customer_id' => $validated['customer_id'] ?? null,
        ]);

        $pendingItem->delete();

        return back()->with('success', "Web {$pendingItem->domain_name} schválen a vytvořen.");
    }

    /**
     * Ignore a pending domain — move to blacklist.
     */
    public function ignorePending(Request $request)
    {
        $validated = $request->validate([
            'domain_name' => 'required|string|max:255',
        ]);

        $pendingItem = SyncPending::where('domain_name', $validated['domain_name'])->firstOrFail();

        SyncBlacklist::create([
            'domain_name' => $pendingItem->domain_name,
            'reason' => 'manual',
        ]);

        $pendingItem->delete();

        return back()->with('success', "Doména {$pendingItem->domain_name} ignorována (blacklist).");
    }

    /**
     * Activate a domain on vas-hosting server (create hosting space).
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

    public function toggleIgnoreAlerts(Website $website)
    {
        $website->update([
            'alerts_ignored_at' => $website->alerts_ignored_at ? null : now(),
        ]);

        $label = $website->alerts_ignored_at ? 'Upozornění ignorována' : 'Upozornění obnovena';

        return back()->with('success', $label);
    }
}
