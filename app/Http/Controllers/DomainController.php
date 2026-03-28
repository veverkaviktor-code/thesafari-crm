<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Domain;
use App\Models\Hosting;
use App\Models\Invoice;
use App\Models\SyncBlacklist;
use App\Models\SyncPending;
use App\Services\VasHostingService;
use App\Services\WedosService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DomainController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min((int) ($request->input('per_page') ?: 50), 100);

        $query = Domain::query()
            ->with(['customer:id,name,company', 'hosting:id,name,server'])
            ->when($request->input('search'), function ($q, $term) {
                $q->where(function ($sub) use ($term) {
                    $sub->where('name', 'ilike', "%{$term}%")
                        ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', "%{$term}%"));
                });
            })
            ->when($request->input('filter_registrar') ?? $request->input('registrar'), fn ($q, $v) => $q->whereIn('registrar', explode(',', $v)))
            ->when($request->input('filter_status') ?? $request->input('status'), fn ($q, $v) => $q->whereIn('status', explode(',', $v)))
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
                    default => null,
                };
            })
            ->when($request->filled('filter_has_hosting'), function ($q) use ($request) {
                $v = $request->input('filter_has_hosting');
                if ($v === '1' || $v === 'with') {
                    $q->whereNotNull('hosting_id');
                } elseif ($v === '0' || $v === 'without') {
                    $q->whereNull('hosting_id');
                }
            })
            ->when($request->input('filter_customer') ?? $request->input('customer'), fn ($q, $v) => $q->whereIn('customer_id', explode(',', $v)))
            ->when($request->filled('filter_auto_invoice') || $request->filled('auto_invoice'), function ($q) use ($request) {
                $v = $request->input('filter_auto_invoice') ?? $request->input('auto_invoice');
                $q->where('auto_invoice', $v === '1' || $v === 'true');
            });

        $allowedSorts = ['name', 'expires_at', 'sell_yearly'];
        $sortBy = $request->input('sort_by');
        $sortDir = $request->input('sort_dir') === 'desc' ? 'desc' : 'asc';

        if ($sortBy && in_array($sortBy, $allowedSorts)) {
            $query->orderBy($sortBy, $sortDir);
        } else {
            $query->orderByRaw('expires_at IS NULL, expires_at ASC');
        }

        $domainsPaginator = $query->paginate($perPage)->withQueryString();

        $domains = new \Illuminate\Pagination\LengthAwarePaginator(
            collect($domainsPaginator->items())->map(fn ($domain) => array_merge($domain->toArray(), [
                'days_until_expiry' => $domain->daysUntilExpiry(),
                'urgency' => $domain->expiryUrgency(),
                'yearly_margin' => $domain->yearlyMargin(),
            ])),
            $domainsPaginator->total(),
            $domainsPaginator->perPage(),
            $domainsPaginator->currentPage(),
            ['path' => $domainsPaginator->path(), 'query' => $request->query()]
        );

        // Stats
        $active = fn () => Domain::where('status', 'aktivni');

        $registered = fn () => Domain::where('status', 'aktivni')->where('is_registered_by_us', true);

        $stats = [
            'total_domains'    => $active()->count(),
            'vas_hosting_count' => $active()->where('registrar', 'vas-hosting')->count(),
            'wedos_count'      => $active()->where('registrar', 'wedos')->count(),
            'external_count'   => $active()->where('registrar', 'external')->count(),
            'expiring_soon'    => $active()
                                    ->whereNotNull('expires_at')
                                    ->where('expires_at', '>=', now())
                                    ->where('expires_at', '<=', now()->addDays(30))->count(),
            'expired'          => $active()
                                    ->whereNotNull('expires_at')
                                    ->where('expires_at', '<', now())->count(),
            'standalone_count' => $active()->whereNull('hosting_id')->count(),
            'pending_count'    => SyncPending::where('type', 'domain')->count(),
            'registered_count' => $registered()->count(),
            'arr_domains'      => (float) $registered()->sum('sell_yearly'),
            'costs_domains'    => (float) $registered()->sum('cost_yearly'),
        ];

        return Inertia::render('Domains/Index', [
            'domains'       => $domains,
            'stats'         => $stats,
            'customers'     => Customer::select('id', 'name', 'company')->orderBy('name')->get(),
            'filters'       => $request->only([
                'search', 'registrar', 'status', 'expiry_filter', 'filter_has_hosting',
                'customer', 'auto_invoice', 'filter_registrar', 'filter_customer',
                'filter_status', 'filter_auto_invoice', 'sort_by', 'sort_dir',
            ]),
            'filterOptions' => [
                'registrars' => ['vas-hosting', 'wedos', 'external'],
                'statuses'   => ['aktivni', 'pozastaveno', 'zruseno'],
            ],
        ]);
    }

    public function show(Domain $domain)
    {
        $domain->load([
            'customer',
            'hosting.vpsServer',
            'invoices' => fn ($q) => $q->orderBy('issue_date', 'desc'),
        ]);

        return Inertia::render('Domains/Show', [
            'domain' => array_merge($domain->toArray(), [
                'days_until_expiry' => $domain->daysUntilExpiry(),
                'urgency' => $domain->expiryUrgency(),
                'yearly_margin' => $domain->yearlyMargin(),
            ]),
            'customers' => Customer::select('id', 'name', 'company')->orderBy('name')->get(),
        ]);
    }

    public function create()
    {
        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();
        $hostings = Hosting::where('status', 'aktivni')
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('Domains/Create', [
            'customers' => $customers,
            'hostings'  => $hostings,
            'registrarOptions' => ['vas-hosting', 'wedos', 'external'],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'                => 'required|string|max:255|unique:domains,name',
            'customer_id'         => 'nullable|exists:customers,id',
            'hosting_id'          => 'nullable|exists:hostings,id',
            'registrar'           => 'required|in:vas-hosting,wedos,external',
            'expires_at'          => 'nullable|date',
            'is_registered_by_us' => 'boolean',
            'sell_yearly'         => 'nullable|numeric|min:0',
            'cost_yearly'         => 'nullable|numeric|min:0',
            'auto_invoice'        => 'boolean',
            'status'              => 'required|in:aktivni,pozastaveno,zruseno',
            'notes'               => 'nullable|string',
        ]);

        $validated['sell_yearly'] = $validated['sell_yearly'] ?? 0;
        $validated['cost_yearly'] = $validated['cost_yearly'] ?? 0;

        // Auto-link to hosting with same name if not explicitly set
        if (empty($validated['hosting_id'])) {
            $matchingHosting = Hosting::where('name', $validated['name'])
                ->whereNull('deleted_at')
                ->first();
            if ($matchingHosting) {
                $validated['hosting_id'] = $matchingHosting->id;
            }
        }

        $domain = Domain::create($validated);

        return redirect("/domeny/{$domain->id}")
            ->with('success', 'Doména byla úspěšně vytvořena.');
    }

    public function edit(Domain $domain)
    {
        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();
        $hostings = Hosting::where('status', 'aktivni')
            ->select('id', 'name')
            ->orderBy('name')
            ->get();

        return Inertia::render('Domains/Edit', [
            'domain'    => $domain,
            'customers' => $customers,
            'hostings'  => $hostings,
            'registrarOptions' => ['vas-hosting', 'wedos', 'external'],
        ]);
    }

    public function update(Request $request, Domain $domain)
    {
        // Quick toggle from detail page (only auto_invoice)
        if ($request->has('auto_invoice') && !$request->has('name')) {
            $domain->update(['auto_invoice' => (bool) $request->input('auto_invoice')]);
            return redirect("/domeny/{$domain->id}")->with('success', 'Auto-fakturace aktualizována.');
        }

        $validated = $request->validate([
            'name'                => "required|string|max:255|unique:domains,name,{$domain->id}",
            'customer_id'         => 'nullable|exists:customers,id',
            'hosting_id'          => 'nullable|exists:hostings,id',
            'registrar'           => 'required|in:vas-hosting,wedos,external',
            'expires_at'          => 'nullable|date',
            'is_registered_by_us' => 'boolean',
            'sell_yearly'         => 'nullable|numeric|min:0',
            'cost_yearly'         => 'nullable|numeric|min:0',
            'auto_invoice'        => 'boolean',
            'status'              => 'required|in:aktivni,pozastaveno,zruseno',
            'notes'               => 'nullable|string',
        ]);

        $validated['sell_yearly'] = $validated['sell_yearly'] ?? 0;
        $validated['cost_yearly'] = $validated['cost_yearly'] ?? 0;

        $domain->update($validated);

        return redirect("/domeny/{$domain->id}")
            ->with('success', 'Doména byla úspěšně aktualizována.');
    }

    public function destroy(Domain $domain)
    {
        $name = $domain->name;
        $domain->delete();

        if (request()->boolean('blacklist')) {
            SyncBlacklist::firstOrCreate(
                ['domain_name' => $name],
                ['reason' => 'deleted']
            );
        }

        return redirect('/domeny')->with('success',
            request()->boolean('blacklist')
                ? "Doména {$name} smazána a přidána do výjimek."
                : "Doména {$name} smazána."
        );
    }

    /**
     * Bulk update domains
     */
    public function bulkUpdate(Request $request)
    {
        $validated = $request->validate([
            'ids' => 'required|array|min:1',
            'ids.*' => 'exists:domains,id',
            'action' => 'required|in:set_customer,set_registrar,set_auto_invoice,unset_auto_invoice,set_status',
            'value' => 'nullable|string',
        ]);

        $domains = Domain::whereIn('id', $validated['ids']);

        match ($validated['action']) {
            'set_customer' => $domains->update(['customer_id' => $validated['value'] ?: null]),
            'set_registrar' => in_array($validated['value'], ['vas-hosting', 'wedos', 'external'])
                ? $domains->update(['registrar' => $validated['value']])
                : null,
            'set_auto_invoice' => $domains->update(['auto_invoice' => true]),
            'unset_auto_invoice' => $domains->update(['auto_invoice' => false]),
            'set_status' => in_array($validated['value'], ['aktivni', 'pozastaveno', 'zruseno'])
                ? $domains->update(['status' => $validated['value']])
                : null,
        };

        return back()->with('success', count($validated['ids']) . ' domén aktualizováno.');
    }

    /**
     * Sync domains from vas-hosting Portal API.
     * Existing domains are updated, new ones go to sync_pending.
     */
    public function syncVasHosting()
    {
        $vasHosting = app(VasHostingService::class);
        $portalDomains = $vasHosting->listPortalDomains();

        if (empty($portalDomains)) {
            return back()->with('error', 'Nepodařilo se načíst data z API. Zkontrolujte API klíče.');
        }

        $blacklist = SyncBlacklist::pluck('domain_name')->flip();

        [$updated, $newPending, $skipped] = DB::transaction(function () use ($portalDomains, $blacklist) {
            $updated = 0;
            $newPending = 0;
            $skipped = 0;

            foreach ($portalDomains as $domainName => $info) {
                if ($blacklist->has($domainName)) {
                    $skipped++;
                    continue;
                }

                $domain = Domain::where('name', $domainName)->first();
                $isRegisteredByUs = (bool) ($info['isRegisteredByUs'] ?? false);

                $data = [
                    'ip_address'   => $info['ip'] ?? null,
                    'synced_at'    => now(),
                ];

                // Only set is_registered_by_us from API if domain is new or API says true
                // (don't override manually set true→false for domains we manage in Klienti folder)
                if ($isRegisteredByUs) {
                    $data['is_registered_by_us'] = true;
                }

                if ($info['expiration'] ?? null) {
                    $data['expires_at'] = $info['expiration'];
                }

                if ($domain) {
                    $domain->update($data);
                    $updated++;
                } else {
                    SyncPending::firstOrCreate(
                        ['domain_name' => $domainName, 'type' => 'domain'],
                        ['source' => 'portal']
                    );
                    $newPending++;
                }
            }

            return [$updated, $newPending, $skipped];
        });

        $msg = "Synchronizace dokončena: {$updated} aktualizováno, {$newPending} nových ke schválení, {$skipped} přeskočeno (blacklist).";

        return back()->with('success', $msg);
    }

    /**
     * Sync domains from Wedos API.
     * Updates expiration for existing domains, new ones go to sync_pending.
     * Then fetches detailed info (owner, DNS, setup_date) for all Wedos domains in DB.
     */
    public function syncWedos()
    {
        $wedos = app(WedosService::class);
        $wedosDomains = $wedos->listDomains();

        if (empty($wedosDomains)) {
            return back()->with('error', 'Nepodařilo se načíst data z Wedos API.');
        }

        $blacklist = SyncBlacklist::pluck('domain_name')->flip();

        [$updated, $newPending, $skipped] = DB::transaction(function () use ($wedosDomains, $blacklist) {
            $updated = 0;
            $newPending = 0;
            $skipped = 0;

            // Only process active domains
            $activeDomains = array_filter($wedosDomains, fn ($d) => ($d['status'] ?? '') === 'active');

            foreach ($activeDomains as $domainInfo) {
                $domainName = $domainInfo['name'];

                if ($blacklist->has($domainName)) {
                    $skipped++;
                    continue;
                }

                $domain = Domain::where('name', $domainName)->first();

                if ($domain) {
                    $data = ['synced_at' => now()];
                    if ($domainInfo['expiration'] ?? null) {
                        $data['expires_at'] = $domainInfo['expiration'];
                    }
                    $domain->update($data);
                    $updated++;
                } else {
                    SyncPending::firstOrCreate(
                        ['domain_name' => $domainName, 'type' => 'domain'],
                        ['source' => 'wedos']
                    );
                    $newPending++;
                }
            }

            return [$updated, $newPending, $skipped];
        });

        // Batch getDomainInfo for ALL Wedos domains in DB (detailed info)
        $wedosDbDomains = Domain::where('registrar', 'wedos')->pluck('name')->toArray();

        if (!empty($wedosDbDomains)) {
            $detailedInfos = $wedos->getDomainInfo($wedosDbDomains);

            foreach ($detailedInfos as $info) {
                $domain = Domain::where('name', $info['name'])->first();
                if (!$domain) {
                    continue;
                }

                $updateData = ['synced_at' => now()];

                if ($info['owner_name'] ?? null) {
                    $updateData['owner_name'] = $info['owner_name'];
                }
                if ($info['setup_date'] ?? null) {
                    $updateData['setup_date'] = $info['setup_date'];
                }
                if ($info['dns'] ?? $info['nsset'] ?? null) {
                    $dnsServers = $info['dns'] ?? $info['nsset'] ?? null;
                    if (is_string($dnsServers)) {
                        $dnsServers = explode(',', $dnsServers);
                    }
                    if (is_array($dnsServers)) {
                        $updateData['dns_servers'] = $dnsServers;
                    }
                }

                $domain->update($updateData);
            }
        }

        $msg = "Synchronizace Wedos dokončena: {$updated} aktualizováno, {$newPending} nových ke schválení, {$skipped} přeskočeno (blacklist).";

        return back()->with('success', $msg);
    }

    /**
     * Create an invoice for a standalone domain (or explicit domain-only invoice).
     */
    public function createInvoice(Domain $domain)
    {
        if (!$domain->customer_id) {
            return back()->with('error', 'Nelze vystavit fakturu — doména nemá přiřazeného zákazníka.');
        }

        if ((float) $domain->sell_yearly <= 0) {
            return back()->with('error', 'Nelze vystavit fakturu — doména má nulovou cenu.');
        }

        if (!$domain->is_registered_by_us) {
            return back()->with('error', 'Nelze vystavit fakturu — doména není registrována námi.');
        }

        if ($domain->hasOpenInvoice()) {
            return back()->with('error', 'Pro tuto doménu již existuje nevyřízená faktura.');
        }

        $invoice = DB::transaction(function () use ($domain) {
            // Period string: expires_at → expires_at + 1 year
            $periodStr = '1 rok';
            if ($domain->expires_at) {
                $expiry = \Carbon\Carbon::parse($domain->expires_at);
                $periodStr = $expiry->format('j. n. Y') . ' – ' . $expiry->copy()->addYear()->format('j. n. Y');
            }

            $total = (float) $domain->sell_yearly;
            $invoiceNumber = Invoice::getNextInvoiceNumber('6');

            // Due date: max(domain.expires_at, now()+14 days)
            $minDue = now()->addDays(14);
            if ($domain->expires_at) {
                $expiry = \Carbon\Carbon::parse($domain->expires_at);
                $dueDate = $expiry->greaterThan($minDue) ? $expiry->toDateString() : $minDue->toDateString();
            } else {
                $dueDate = $minDue->toDateString();
            }

            $invoice = Invoice::create([
                'customer_id'     => $domain->customer_id,
                'invoice_number'  => $invoiceNumber,
                'variable_symbol' => $invoiceNumber,
                'issue_date'      => now()->toDateString(),
                'due_date'        => $dueDate,
                'status'          => 'vystavena',
                'payment_method'  => 'banka',
                'total'           => $total,
            ]);

            $invoice->items()->create([
                'description' => "Doména {$domain->name} ({$periodStr})",
                'quantity'    => 1,
                'unit'        => 'rok',
                'unit_price'  => $total,
                'total_price' => $total,
                'sort_order'  => 0,
            ]);

            // Attach domain via invoice_domain pivot
            $invoice->domains()->attach($domain->id, ['created_at' => now()]);

            return $invoice;
        });

        return redirect("/faktury/{$invoice->id}")
            ->with('success', "Faktura {$invoice->invoice_number} vystavena.");
    }

    /**
     * Show pending domains awaiting approval.
     */
    public function pending()
    {
        $pendingItems = SyncPending::where('type', 'domain')
            ->orderBy('discovered_at', 'desc')
            ->get();

        $customers = Customer::orderBy('name')->get(['id', 'name']);
        $hostings = Hosting::where('status', 'aktivni')
            ->whereNull('deleted_at')
            ->orderBy('name')
            ->get(['id', 'name']);

        return Inertia::render('Domains/Pending', [
            'pendingItems' => $pendingItems,
            'customers'    => $customers,
            'hostings'     => $hostings,
        ]);
    }

    /**
     * Approve a pending domain — create Domain from sync_pending data.
     */
    public function approvePending(Request $request)
    {
        $validated = $request->validate([
            'id'          => 'required|exists:sync_pending,id',
            'customer_id' => 'nullable|exists:customers,id',
            'hosting_id'  => 'nullable|exists:hostings,id',
        ]);

        $pendingItem = SyncPending::findOrFail($validated['id']);

        // Determine registrar from source
        $registrar = match ($pendingItem->source) {
            'portal'  => 'vas-hosting',
            'wedos'   => 'wedos',
            default   => 'external',
        };

        Domain::create([
            'name'          => $pendingItem->domain_name,
            'registrar'     => $registrar,
            'status'        => 'aktivni',
            'auto_invoice'  => false,
            'customer_id'   => $validated['customer_id'] ?? null,
            'hosting_id'    => $validated['hosting_id'] ?? null,
        ]);

        $pendingItem->delete();

        return back()->with('success', "Doména {$pendingItem->domain_name} schválena a vytvořena.");
    }

    /**
     * Ignore a pending domain — move to blacklist.
     */
    public function ignorePending(Request $request)
    {
        $validated = $request->validate([
            'id' => 'required|exists:sync_pending,id',
        ]);

        $pendingItem = SyncPending::findOrFail($validated['id']);

        SyncBlacklist::create([
            'domain_name' => $pendingItem->domain_name,
            'reason'      => 'manual',
        ]);

        $pendingItem->delete();

        return back()->with('success', "Doména {$pendingItem->domain_name} ignorována (blacklist).");
    }
}
