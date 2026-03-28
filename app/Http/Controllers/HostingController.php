<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Domain;
use App\Models\Hosting;
use App\Models\HostingPayment;
use App\Models\Invoice;
use App\Models\ManagementPlan;
use App\Models\SyncBlacklist;
use App\Models\SyncPending;
use App\Models\VpsServer;
use App\Services\VasHostingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class HostingController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min((int) ($request->input('per_page') ?: 50), 100);

        $query = Hosting::query()
            ->with(['customer:id,name,company', 'vpsServer', 'managementPlan', 'credentials', 'emailAccounts'])
            ->withCount('domains')
            ->when($request->input('search'), function ($q, $term) {
                $q->where(function ($sub) use ($term) {
                    $sub->where('name', 'ilike', "%{$term}%")
                        ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', "%{$term}%"))
                        ->orWhereHas('domains', fn ($dq) => $dq->where('name', 'ilike', "%{$term}%"));
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
            ->when($request->filled('filter_external'), function ($q) use ($request) {
                $vals = explode(',', $request->input('filter_external'));
                if (count($vals) === 1) $q->where('is_external', $vals[0] === '1');
            })
            ->when($request->input('filter_server'), fn ($q, $v) => $q->whereIn('server', explode(',', $v)))
            ->when($request->input('filter_management_plan'), fn ($q, $v) => $q->whereIn('management_plan_id', explode(',', $v)))
            ->when($request->filled('filter_auto_invoice'), function ($q) use ($request) {
                $vals = explode(',', $request->input('filter_auto_invoice'));
                if (count($vals) === 1) $q->where('auto_invoice', $vals[0] === '1');
            });

        $allowedSorts = ['name', 'expires_at', 'sell_yearly', 'cost_yearly', 'status', 'server', 'created_at', 'storage_used_mb'];
        $sortBy = $request->input('sort_by');
        $sortDir = $request->input('sort_dir') === 'desc' ? 'desc' : 'asc';

        if ($sortBy && in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderByRaw('expires_at IS NULL, expires_at ASC');
        }

        $hostingsPaginator = $query->paginate($perPage)->withQueryString();

        $hostings = $hostingsPaginator->through(fn ($hosting) => array_merge($hosting->toArray(), [
            'days_until_expiry' => $hosting->daysUntilExpiry(),
            'urgency' => $hosting->expiryUrgency(),
            'has_unpaid' => $hosting->hasUnpaidPayments(),
            'yearly_margin' => $hosting->yearlyMargin(),
        ]));

        // Payments overview - all unpaid/overdue
        $paymentsQuery = HostingPayment::query()
            ->with(['hosting.customer:id,name,company', 'hosting:id,name,customer_id'])
            ->when($request->input('payment_status'), function ($q, $status) {
                if ($status === 'nezaplaceno') $q->unpaid();
                elseif ($status === 'po_splatnosti') $q->overdue();
                elseif ($status === 'zaplaceno') $q->paid();
            }, function ($q) {
                // Default: show unpaid + overdue
                $q->whereIn('status', ['nezaplaceno', 'po_splatnosti']);
            })
            ->when($request->input('search'), function ($q, $term) {
                $q->whereHas('hosting', fn ($hq) =>
                    $hq->where('name', 'ilike', "%{$term}%")
                      ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', "%{$term}%"))
                );
            })
            ->orderBy('period_end');

        $payments = $paymentsQuery
            ->paginate($perPage, ['*'], 'payments_page')
            ->withQueryString();

        // Stats: only count our own hostings (not external)
        $ours = fn () => Hosting::where('is_external', false);

        $stats = [
            'total_hostings'   => $ours()->where('status', 'aktivni')->count(),
            'expiring_soon_count' => $ours()->where('status', 'aktivni')
                                    ->whereNotNull('expires_at')
                                    ->where('expires_at', '>=', now())
                                    ->where('expires_at', '<=', now()->addDays(30))->count(),
            'expired_count'    => $ours()->where('status', 'aktivni')
                                    ->whereNotNull('expires_at')->where('expires_at', '<', now())->count(),
            'unpaid_count'     => HostingPayment::unpaid()->count()
                                + HostingPayment::overdue()->count(),
            'unpaid_amount'    => (float) HostingPayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])->sum('amount'),
            'arr_hosting'      => (float) $ours()->where('status', 'aktivni')
                                    ->where('is_free', false)
                                    ->sum('sell_yearly'),
            'external_count'   => Hosting::where('is_external', true)->where('status', 'aktivni')->count(),
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
                                    ->selectRaw("COALESCE(SUM(COALESCE(NULLIF(sell_yearly, 0), 0)), 0) as total")
                                    ->value('total'),
            'pending_count'    => SyncPending::where('type', 'hosting')->count(),
        ];

        // Unique server hostnames for filter dropdown
        $serverOptions = Hosting::whereNotNull('server')->where('server', '!=', '')
            ->distinct()->pluck('server')->sort()->values();

        return Inertia::render('Hostings/Index', [
            'hostings'      => $hostings,
            'payments'      => $payments,
            'stats'         => $stats,
            'managementPlans' => ManagementPlan::where('is_active', true)->orderBy('sort_order')->get(),
            'customers'     => Customer::select('id', 'name', 'company')->orderBy('name')->get(),
            'filterOptions' => ['servers' => $serverOptions],
            'filters'       => $request->only([
                'search', 'tab', 'status', 'sort_by', 'sort_dir', 'payment_status', 'expiry_filter',
                'filter_customer', 'filter_status', 'filter_external',
                'filter_server', 'filter_management_plan', 'filter_auto_invoice',
            ]),
        ]);
    }

    public function show(Hosting $hosting)
    {
        $hosting->load([
            'customer',
            'domains' => fn ($q) => $q->orderBy('name'),
            'payments' => fn ($q) => $q->orderBy('period_end', 'desc'),
            'payments.invoice',
            'invoices' => fn ($q) => $q->orderBy('issue_date', 'desc'),
            'emailAccounts',
            'credentials',
            'vpsServer',
            'managementPlan',
        ]);

        $paymentStats = [
            'total_paid' => (float) $hosting->payments()->paid()->sum('amount'),
            'total_unpaid' => (float) $hosting->payments()->whereIn('status', ['nezaplaceno', 'po_splatnosti'])->sum('amount'),
            'payments_count' => $hosting->payments()->count(),
        ];

        $hosting->credentials->each(fn ($c) => $c->makeVisible('password'));
        $hosting->emailAccounts->each(fn ($e) => $e->makeVisible('password'));

        $totalSell = $hosting->totalSellYearly();
        $totalCost = $hosting->totalCostYearly();

        return Inertia::render('Hostings/Show', [
            'hosting' => array_merge($hosting->toArray(), [
                'days_until_expiry' => $hosting->daysUntilExpiry(),
                'urgency' => $hosting->expiryUrgency(),
                'total_sell_yearly' => $totalSell,
                'total_cost_yearly' => $totalCost,
                'yearly_margin' => $totalSell - $totalCost,
                'monthly_revenue' => $totalSell / 12,
                'total_annual_revenue' => $totalSell,
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

        return Inertia::render('Hostings/Create', [
            'customers' => $customers,
            'vpsServers' => $vpsServers,
            'managementPlans' => $managementPlans,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id'            => 'nullable|exists:customers,id',
            'name'                   => 'required|string|max:255|unique:hostings,name',
            'server'                 => 'nullable|string|max:255',
            'status'                 => 'required|in:aktivni,pozastaveno,zruseno',
            'notes'                  => 'nullable|string',
            'starts_at'              => 'nullable|date',
            'auto_invoice'           => 'boolean',
            'auto_invoice_management' => 'boolean',
            'is_free'                => 'boolean',
            'is_external'            => 'boolean',
            'sell_yearly'            => 'nullable|numeric|min:0',
            'cost_yearly'            => 'nullable|numeric|min:0',
            'admin_url'              => 'nullable|string|max:500',
            'expires_at'             => 'nullable|date',
            'server_id'              => 'nullable|exists:vps_servers,id',
            'management_plan_id'     => 'nullable|exists:management_plans,id',
            'management_cycle'       => 'nullable|in:quarterly,semi_annual,annual',
            'storage_quota_mb'       => 'nullable|integer|min:0',
        ]);

        $validated['sell_yearly'] = $validated['sell_yearly'] ?? 0;
        $validated['cost_yearly'] = $validated['cost_yearly'] ?? 0;
        $validated['storage_quota_mb'] = $validated['storage_quota_mb'] ?? 0;

        $hosting = Hosting::create($validated);

        return redirect("/hostingy/{$hosting->id}")
            ->with('success', 'Hosting vytvořen.');
    }

    public function edit(Hosting $hosting)
    {
        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();
        $vpsServers = VpsServer::active()->select('id', 'name')->orderBy('name')->get();
        $managementPlans = ManagementPlan::where('is_active', true)->orderBy('sort_order')->get();

        return Inertia::render('Hostings/Edit', [
            'hosting' => $hosting,
            'customers' => $customers,
            'vpsServers' => $vpsServers,
            'managementPlans' => $managementPlans,
        ]);
    }

    public function update(Request $request, Hosting $hosting)
    {
        // Quick toggle from detail page (only auto_invoice or auto_invoice_management)
        if ($request->has('auto_invoice') && !$request->has('name')) {
            $hosting->update(['auto_invoice' => (bool) $request->input('auto_invoice')]);
            return redirect("/hostingy/{$hosting->id}")->with('success', 'Auto-fakturace aktualizována.');
        }
        if ($request->has('auto_invoice_management') && !$request->has('name')) {
            $hosting->update(['auto_invoice_management' => (bool) $request->input('auto_invoice_management')]);
            return redirect("/hostingy/{$hosting->id}")->with('success', 'Auto-fakturace správy aktualizována.');
        }

        $validated = $request->validate([
            'customer_id'            => 'nullable|exists:customers,id',
            'name'                   => "required|string|max:255|unique:hostings,name,{$hosting->id}",
            'server'                 => 'nullable|string|max:255',
            'status'                 => 'required|in:aktivni,pozastaveno,zruseno',
            'notes'                  => 'nullable|string',
            'starts_at'              => 'nullable|date',
            'auto_invoice'           => 'boolean',
            'auto_invoice_management' => 'boolean',
            'is_free'                => 'boolean',
            'is_external'            => 'boolean',
            'sell_yearly'            => 'nullable|numeric|min:0',
            'cost_yearly'            => 'nullable|numeric|min:0',
            'admin_url'              => 'nullable|string|max:500',
            'expires_at'             => 'nullable|date',
            'server_id'              => 'nullable|exists:vps_servers,id',
            'management_plan_id'     => 'nullable|exists:management_plans,id',
            'management_cycle'       => 'nullable|in:quarterly,semi_annual,annual',
            'storage_quota_mb'       => 'nullable|integer|min:0',
        ]);

        $validated['sell_yearly'] = $validated['sell_yearly'] ?? 0;
        $validated['cost_yearly'] = $validated['cost_yearly'] ?? 0;
        $validated['storage_quota_mb'] = $validated['storage_quota_mb'] ?? 0;

        $hosting->update($validated);

        return redirect("/hostingy/{$hosting->id}")
            ->with('success', 'Hosting aktualizován.');
    }

    public function destroy(Hosting $hosting)
    {
        $hosting->delete();

        return redirect('/hostingy')
            ->with('success', 'Hosting smazán.');
    }

    /**
     * Bulk update hostings
     */
    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:hostings,id',
            'action' => 'required|in:set_free,unset_free,set_status,set_customer,clear_expiry,set_external,unset_external,set_management_plan',
            'value' => 'nullable|string',
        ]);

        $hostings = Hosting::whereIn('id', $validated['ids']);

        match ($validated['action']) {
            'set_free' => $hostings->update(['is_free' => true]),
            'unset_free' => $hostings->update(['is_free' => false]),
            'set_status' => in_array($validated['value'], ['aktivni', 'pozastaveno', 'zruseno'])
                ? $hostings->update(['status' => $validated['value']])
                : null,
            'set_customer' => $this->bulkSetCustomer($validated['ids'], $validated['value'] ?: null),
            'clear_expiry' => $hostings->update(['expires_at' => null]),
            'set_external' => $hostings->update(['is_external' => true]),
            'unset_external' => $hostings->update(['is_external' => false]),
            'set_management_plan' => $hostings->update([
                'management_plan_id' => $validated['value'] === 'none' ? null : $validated['value'],
            ]),
        };

        return back()->with('success', count($validated['ids']) . ' položek aktualizováno.');
    }

    /**
     * Set customer on selected hostings.
     */
    private function bulkSetCustomer(array $ids, ?string $customerId): int
    {
        return Hosting::whereIn('id', $ids)->update(['customer_id' => $customerId]);
    }

    /**
     * Store a payment for a hosting
     */
    public function storePayment(Request $request, Hosting $hosting)
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

        $validated['hosting_id'] = $hosting->id;

        // If status is zaplaceno and no paid_at, set it to now
        if ($validated['status'] === 'zaplaceno' && empty($validated['paid_at'])) {
            $validated['paid_at'] = now();
        }

        HostingPayment::create($validated);

        return back()->with('success', 'Platba zaznamenána.');
    }

    /**
     * Mark a payment as paid
     */
    public function markPaymentPaid(Hosting $hosting, HostingPayment $payment)
    {
        abort_if($payment->hosting_id !== $hosting->id, 403);

        $payment->update([
            'status' => 'zaplaceno',
            'paid_at' => now(),
        ]);

        return back()->with('success', 'Platba označena jako zaplacená.');
    }

    /**
     * Create an invoice from a hosting.
     * One hosting = one invoice with hosting item + domain items for linked domains.
     */
    public function createInvoice(Hosting $hosting)
    {
        if (!$hosting->customer_id) {
            return back()->with('error', 'Nelze vystavit fakturu — hosting nemá přiřazeného zákazníka.');
        }

        if ($hosting->is_free) {
            return back()->with('error', 'Nelze vystavit fakturu — hosting je zdarma.');
        }

        // Check for existing unpaid invoice
        if ($hosting->hasOpenInvoice()) {
            return back()->with('error', 'Pro tento hosting již existuje nevyřízená faktura.');
        }

        $invoice = DB::transaction(function () use ($hosting) {
            $items = [];

            // Period string (expiry -> expiry+1 year)
            $periodStr = '1 rok';
            if ($hosting->expires_at) {
                $expiry = \Carbon\Carbon::parse($hosting->expires_at);
                $periodStr = $expiry->format('j. n. Y') . ' – ' . $expiry->copy()->addYear()->format('j. n. Y');
            }

            // Hosting item
            $hostingPrice = (float) $hosting->sell_yearly;
            if ($hostingPrice > 0) {
                $items[] = [
                    'description' => "Hosting {$hosting->name} ({$periodStr})",
                    'quantity' => 1,
                    'unit' => 'rok',
                    'unit_price' => $hostingPrice,
                    'total_price' => $hostingPrice,
                ];
            }

            // Domain items — all linked domains that we register and have a price
            $invoiceDomains = $hosting->domains()
                ->where('is_registered_by_us', true)
                ->where('sell_yearly', '>', 0)
                ->get();

            $domainIds = [];
            foreach ($invoiceDomains as $domain) {
                $domainPeriod = $periodStr; // fallback to hosting period
                if ($domain->expires_at) {
                    $domainExpiry = \Carbon\Carbon::parse($domain->expires_at);
                    $domainPeriod = $domainExpiry->format('j. n. Y') . ' – ' . $domainExpiry->copy()->addYear()->format('j. n. Y');
                }

                $items[] = [
                    'description' => "Doména {$domain->name} ({$domainPeriod})",
                    'quantity' => 1,
                    'unit' => 'rok',
                    'unit_price' => (float) $domain->sell_yearly,
                    'total_price' => (float) $domain->sell_yearly,
                ];

                $domainIds[] = $domain->id;
            }

            if (empty($items)) {
                return null;
            }

            $total = collect($items)->sum('total_price');
            $invoiceNumber = Invoice::getNextInvoiceNumber('6');

            // Due date = hosting expiry, minimum 14 days from now
            $minDue = now()->addDays(14);
            if ($hosting->expires_at) {
                $expiry = \Carbon\Carbon::parse($hosting->expires_at);
                $dueDate = $expiry->greaterThan($minDue) ? $expiry->toDateString() : $minDue->toDateString();
            } else {
                $dueDate = $minDue->toDateString();
            }

            $invoice = Invoice::create([
                'customer_id'     => $hosting->customer_id,
                'invoice_number'  => $invoiceNumber,
                'variable_symbol' => $invoiceNumber,
                'issue_date'      => now()->toDateString(),
                'due_date'        => $dueDate,
                'status'          => 'vystavena',
                'payment_method'  => 'banka',
                'total'           => $total,
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

            // Attach hosting via invoice_hosting pivot
            $invoice->hostings()->attach($hosting->id, ['invoice_type' => 'hosting', 'created_at' => now()]);

            // Attach domains via invoice_domain pivot
            foreach ($domainIds as $domainId) {
                $invoice->domains()->attach($domainId, ['created_at' => now()]);
            }

            return $invoice;
        });

        if (!$invoice) {
            return back()->with('error', 'Hosting má nulovou cenu a žádné fakturovatelné domény — nelze vystavit fakturu.');
        }

        return redirect("/faktury/{$invoice->id}")
            ->with('success', "Faktura {$invoice->invoice_number} vystavena.");
    }

    /**
     * Create a single merged invoice for ALL active non-free hostings of a customer.
     * Uses split pricing: separate "Hosting X" and "Doména X" items.
     * Includes domain items for all linked domains.
     * Skips hostings that already have an open invoice.
     */
    public function createCustomerInvoice(Customer $customer)
    {
        $hostings = Hosting::where('customer_id', $customer->id)
            ->where('status', 'aktivni')
            ->where('is_free', false)
            ->where('is_external', false)
            ->get();

        if ($hostings->isEmpty()) {
            return back()->with('error', 'Zákazník nemá žádné fakturovatelné hostingy.');
        }

        $invoice = DB::transaction(function () use ($hostings, $customer) {
            $items = [];
            $attachedHostingIds = [];
            $attachedDomainIds = [];

            // Determine splatnost = nejbližší expirace hostingu
            $earliestExpiry = null;

            foreach ($hostings as $hosting) {
                // Skip hostings with open invoice
                if ($hosting->hasOpenInvoice()) {
                    continue;
                }

                $hostingPrice = (float) $hosting->sell_yearly;

                // Period string
                $periodStr = '1 rok';
                if ($hosting->expires_at) {
                    $expiry = \Carbon\Carbon::parse($hosting->expires_at);
                    $periodStr = $expiry->format('j. n. Y') . ' – ' . $expiry->copy()->addYear()->format('j. n. Y');

                    // Track earliest expiry for due_date
                    if ($earliestExpiry === null || $expiry->lt($earliestExpiry)) {
                        $earliestExpiry = $expiry;
                    }
                }

                // Hosting item
                if ($hostingPrice > 0) {
                    $items[] = [
                        'description' => "Hosting {$hosting->name} ({$periodStr})",
                        'quantity'    => 1,
                        'unit'        => 'rok',
                        'unit_price'  => $hostingPrice,
                        'total_price' => $hostingPrice,
                    ];
                }

                if (!in_array($hosting->id, $attachedHostingIds, true)) {
                    $attachedHostingIds[] = $hosting->id;
                }

                // Domain items — all linked domains registered by us with a price
                $invoiceDomains = $hosting->domains()
                    ->where('is_registered_by_us', true)
                    ->where('sell_yearly', '>', 0)
                    ->get();

                foreach ($invoiceDomains as $domain) {
                    $domainPeriod = $periodStr; // fallback to hosting period
                    if ($domain->expires_at) {
                        $domainExpiry = \Carbon\Carbon::parse($domain->expires_at);
                        $domainPeriod = $domainExpiry->format('j. n. Y') . ' – ' . $domainExpiry->copy()->addYear()->format('j. n. Y');
                    }

                    $items[] = [
                        'description' => "Doména {$domain->name} ({$domainPeriod})",
                        'quantity'    => 1,
                        'unit'        => 'rok',
                        'unit_price'  => (float) $domain->sell_yearly,
                        'total_price' => (float) $domain->sell_yearly,
                    ];

                    if (!in_array($domain->id, $attachedDomainIds, true)) {
                        $attachedDomainIds[] = $domain->id;
                    }
                }
            }

            if (empty($items)) {
                return null;
            }

            $total = collect($items)->sum('total_price');
            $invoiceNumber = Invoice::getNextInvoiceNumber('6');

            // Due date = earliest expiry, min 14 days from now
            $minDue = now()->addDays(14);
            if ($earliestExpiry) {
                $dueDate = $earliestExpiry->greaterThan($minDue) ? $earliestExpiry->toDateString() : $minDue->toDateString();
            } else {
                $dueDate = $minDue->toDateString();
            }

            $invoice = Invoice::create([
                'customer_id'     => $customer->id,
                'invoice_number'  => $invoiceNumber,
                'variable_symbol' => $invoiceNumber,
                'issue_date'      => now()->toDateString(),
                'due_date'        => $dueDate,
                'status'          => 'vystavena',
                'payment_method'  => 'banka',
                'total'           => $total,
            ]);

            foreach ($items as $i => $item) {
                $invoice->items()->create([
                    'description' => $item['description'],
                    'quantity'    => $item['quantity'],
                    'unit'        => $item['unit'],
                    'unit_price'  => $item['unit_price'],
                    'total_price' => $item['total_price'],
                    'sort_order'  => $i,
                ]);
            }

            // Attach hostings via invoice_hosting pivot
            foreach ($attachedHostingIds as $hostingId) {
                $invoice->hostings()->attach($hostingId, [
                    'invoice_type' => 'hosting',
                    'created_at'   => now(),
                ]);
            }

            // Attach domains via invoice_domain pivot
            foreach ($attachedDomainIds as $domainId) {
                $invoice->domains()->attach($domainId, [
                    'created_at' => now(),
                ]);
            }

            return $invoice;
        });

        if (!$invoice) {
            return back()->with('error', 'Hostingy mají nulovou cenu nebo všechny mají otevřenou fakturu — nelze vystavit fakturu.');
        }

        return redirect("/faktury/{$invoice->id}")
            ->with('success', "Souhrnná faktura {$invoice->invoice_number} vystavena.");
    }

    /**
     * Sync hostings from sss06 Server API.
     * New unknown domains go to sync_pending with type='hosting'.
     */
    public function syncSss06(VasHostingService $vasHosting)
    {
        $serverHostings = $vasHosting->listServerHostings();

        if (empty($serverHostings)) {
            return back()->with('error', 'Nepodařilo se načíst data z API sss06.');
        }

        $blacklist = SyncBlacklist::pluck('domain_name')->flip();
        $sss06VpsId = VpsServer::where('name', 'sss06.vas-server.cz')->value('id');

        [$updated, $pending, $skipped] = DB::transaction(
            function () use ($serverHostings, $blacklist, $sss06VpsId) {
                $updated = 0;
                $pending = 0;
                $skipped = 0;

                foreach ($serverHostings as $domainName => $info) {
                    if ($blacklist->has($domainName)) {
                        $skipped++;
                        continue;
                    }

                    $hosting = Hosting::where('name', $domainName)->first();

                    $quotaMb = (int) round(($info['storageQuota'] ?? 0) / 1048576);
                    $usedMb  = (int) round(($info['storageUsed'] ?? 0) / 1048576);

                    $data = [
                        'storage_quota_mb' => $quotaMb,
                        'storage_used_mb'  => $usedMb,
                        'synced_at'        => now(),
                    ];

                    if ($info['expiration'] ?? null) {
                        $data['expires_at'] = $info['expiration'];
                    }

                    if ($hosting) {
                        $data['server'] = 'sss06.vas-server.cz';
                        if ($sss06VpsId) {
                            $data['server_id'] = $sss06VpsId;
                        }
                        $hosting->update($data);
                        $updated++;
                    } else {
                        SyncPending::firstOrCreate(
                            ['domain_name' => $domainName, 'type' => 'hosting'],
                            ['source' => 'sss06']
                        );
                        $pending++;
                    }
                }

                return [$updated, $pending, $skipped];
            }
        );

        $msg = "Sync sss06 dokončen: {$updated} aktualizováno, {$pending} ke schválení, {$skipped} přeskočeno (blacklist).";

        return back()->with('success', $msg);
    }

    /**
     * Sync hostings from ond08 VPS Centrum API.
     * New unknown domains go to sync_pending with type='hosting'.
     */
    public function syncOnd08(VasHostingService $vasHosting)
    {
        return $this->syncVpsCentrum($vasHosting, 'ond08');
    }

    /**
     * Sync hostings from thaimassage VPS Centrum API.
     * New unknown domains go to sync_pending with type='hosting'.
     */
    public function syncThaimassage(VasHostingService $vasHosting)
    {
        return $this->syncVpsCentrum($vasHosting, 'thaimassage');
    }

    /**
     * Common logic for syncing from VPS Centrum servers (ond08, thaimassage).
     */
    private function syncVpsCentrum(VasHostingService $vasHosting, string $serverKey): \Illuminate\Http\RedirectResponse
    {
        $vpscServers = $vasHosting->getVpsCentrumServers();
        $serverConfig = null;

        foreach ($vpscServers as $server) {
            if (str_contains($server['name'] ?? '', $serverKey)) {
                $serverConfig = $server;
                break;
            }
        }

        if (!$serverConfig || empty($serverConfig['api_key'])) {
            return back()->with('error', "Konfigurace serveru {$serverKey} nenalezena.");
        }

        $domains = $vasHosting->listVpsCentrumDomains($serverConfig['url'], $serverConfig['api_key']);

        if (empty($domains)) {
            return back()->with('error', "Nepodařilo se načíst data z API {$serverKey}.");
        }

        // Pre-fetch sizes
        $sizes = [];
        foreach ($domains as $domainInfo) {
            $domainName = $domainInfo['domena'] ?? '';
            if (empty($domainName)) continue;
            $sizes[$domainName] = $vasHosting->getVpsCentrumDomainSize(
                $serverConfig['url'],
                $serverConfig['api_key'],
                $domainName
            );
        }

        $blacklist = SyncBlacklist::pluck('domain_name')->flip();
        $serverName = $serverConfig['name'];
        $vpsId = VpsServer::where('name', $serverName)->value('id');

        [$updated, $pending, $skipped] = DB::transaction(
            function () use ($domains, $sizes, $blacklist, $serverName, $vpsId, $serverKey) {
                $updated = 0;
                $pending = 0;
                $skipped = 0;

                foreach ($domains as $domainInfo) {
                    $domainName = $domainInfo['domena'] ?? '';
                    if (empty($domainName)) continue;

                    if ($blacklist->has($domainName)) {
                        $skipped++;
                        continue;
                    }

                    $hosting = Hosting::where('name', $domainName)->first();

                    $data = [
                        'server'           => $serverName,
                        'storage_quota_mb' => 4096, // VPS Centrum API doesn't return quota
                        'synced_at'        => now(),
                    ];

                    $sizeInfo = $sizes[$domainName] ?? null;
                    if ($sizeInfo) {
                        $data['storage_used_mb'] = (int) round(
                            (float) ($sizeInfo['mail_size_mb'] ?? 0) +
                            (float) ($sizeInfo['db_size_mb'] ?? 0) +
                            (float) ($sizeInfo['ftp_size_mb'] ?? 0)
                        );
                    }

                    if ($domainInfo['domena_expirace'] ?? null) {
                        $data['expires_at'] = $domainInfo['domena_expirace'];
                    }

                    if ($hosting) {
                        if ($vpsId) {
                            $data['server_id'] = $vpsId;
                        }
                        $hosting->update($data);
                        $updated++;
                    } else {
                        // Map full server name to short name for source
                        $shortName = match (true) {
                            str_contains($serverName, 'ond08') => 'ond08',
                            str_contains($serverName, 'thaimassage') => 'thaimassage',
                            default => $serverKey,
                        };
                        SyncPending::firstOrCreate(
                            ['domain_name' => $domainName, 'type' => 'hosting'],
                            ['source' => $shortName]
                        );
                        $pending++;
                    }
                }

                return [$updated, $pending, $skipped];
            }
        );

        $msg = "Sync {$serverKey} dokončen: {$updated} aktualizováno, {$pending} ke schválení, {$skipped} přeskočeno (blacklist).";

        return back()->with('success', $msg);
    }

    /**
     * Show pending hostings awaiting approval.
     */
    public function pending()
    {
        $pendingItems = SyncPending::where('type', 'hosting')
            ->orderBy('discovered_at', 'desc')
            ->get();
        $customers = Customer::orderBy('name')->get(['id', 'name']);

        return Inertia::render('Hostings/Pending', [
            'pendingItems' => $pendingItems,
            'customers' => $customers,
        ]);
    }

    /**
     * Approve a pending hosting — create Hosting from sync_pending data.
     */
    public function approvePending(Request $request)
    {
        $validated = $request->validate([
            'domain_name' => 'required|string|max:255',
            'customer_id' => 'nullable|exists:customers,id',
        ]);

        $pendingItem = SyncPending::where('domain_name', $validated['domain_name'])
            ->where('type', 'hosting')
            ->firstOrFail();

        // Map source to full server name
        $server = match ($pendingItem->source) {
            'sss06' => 'sss06.vas-server.cz',
            'ond08' => 'ond08.vas-server.cz',
            'thaimassage' => 'thaimassage-server.cz',
            default => null,
        };

        // Find VPS server ID
        $serverId = $server ? VpsServer::where('name', $server)->value('id') : null;

        Hosting::create([
            'name' => $pendingItem->domain_name,
            'status' => 'aktivni',
            'auto_invoice' => false,
            'customer_id' => $validated['customer_id'] ?? null,
            'server' => $server,
            'server_id' => $serverId,
        ]);

        $pendingItem->delete();

        return back()->with('success', "Hosting {$pendingItem->domain_name} schválen a vytvořen.");
    }

    /**
     * Ignore a pending hosting — move to blacklist.
     */
    public function ignorePending(Request $request)
    {
        $validated = $request->validate([
            'domain_name' => 'required|string|max:255',
        ]);

        $pendingItem = SyncPending::where('domain_name', $validated['domain_name'])
            ->where('type', 'hosting')
            ->firstOrFail();

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

        // "Domain already exists" = hosting je na serveru, jen ho nemáme v CRM -> úspěch (spustí sync)
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

    public function toggleIgnoreAlerts(Hosting $hosting)
    {
        $hosting->update([
            'alerts_ignored_at' => $hosting->alerts_ignored_at ? null : now(),
        ]);

        $label = $hosting->alerts_ignored_at ? 'Upozornění ignorována' : 'Upozornění obnovena';

        return back()->with('success', $label);
    }
}
