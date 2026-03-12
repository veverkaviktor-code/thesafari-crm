<?php

namespace App\Http\Controllers;

use App\Http\Requests\CustomerRequest;
use App\Models\Customer;
use Illuminate\Http\Request;
use Inertia\Inertia;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $trashed = $request->boolean('trashed');
        $sortField = $request->input('sort', 'created_at');
        $sortDir = $request->input('direction', 'desc');
        $allowedSorts = ['name', 'email', 'created_at', 'company'];

        $query = $trashed
            ? Customer::onlyTrashed()->search($request->input('search'))
            : Customer::query()->search($request->input('search'));

        $customers = $query
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

    public function show(Customer $zakaznici)
    {
        $customer = $zakaznici;
        $customer->load(['subscriptions']);

        $orderCosts = (float) \App\Models\OrderCost::whereHas('order', fn ($q) =>
            $q->where('customer_id', $customer->id)
        )->sum('amount');
        // Subscription costs = what WE pay for hosting/domains we manage
        $subscriptionCosts = (float) $customer->subscriptions()
            ->where('status', 'aktivni')
            ->where(function ($q) {
                $q->where('type', 'hosting')
                  ->orWhere(function ($q2) {
                      $q2->where('type', 'domena')
                         ->where('is_registered_by_us', true);
                  });
            })
            ->sum('cost_yearly');
        $totalCosts = $orderCosts + $subscriptionCosts;

        $invoiced = (float) $customer->invoices()->sum('total');
        $paid = (float) $customer->invoices()->where('status', 'zaplacena')->sum('total');
        $vpsYearly = (float) \App\Models\VpsServer::where('customer_id', $customer->id)
            ->where('status', 'aktivni')->sum('price_yearly');

        $stats = [
            'orders_count' => $customer->orders()->count(),
            'total_revenue' => $paid,
            'total_costs' => $totalCosts,
            'profit' => round($paid - $totalCosts, 2),
            'invoiced' => $invoiced,
            'paid' => $paid,
            'uninvoiced' => round($invoiced - $paid, 2),
            'active_subscriptions' => $customer->subscriptions()->where('status', 'aktivni')->count(),
            'vps_yearly' => $vpsYearly,
        ];

        $orders = $customer->orders()
            ->select('id', 'customer_id', 'title', 'division', 'status', 'price', 'deadline', 'created_at')
            ->latest()
            ->get();

        $invoices = $customer->invoices()
            ->select('id', 'customer_id', 'invoice_number', 'status', 'total', 'due_date')
            ->latest()
            ->get();

        $vpsServers = \App\Models\VpsServer::where('customer_id', $customer->id)
            ->withCount('hostings')
            ->get();

        return Inertia::render('Customers/Show', [
            'customer' => $customer,
            'stats' => $stats,
            'orders' => $orders,
            'invoices' => $invoices,
            'vpsServers' => $vpsServers,
        ]);
    }

    public function create()
    {
        return Inertia::render('Customers/Create');
    }

    public function store(CustomerRequest $request)
    {
        $data = $this->prepareData($request->validated());
        $customer = Customer::create($data);

        return redirect()->route('zakaznici.show', $customer)
            ->with('success', 'Zákazník vytvořen.');
    }

    public function edit(Customer $zakaznici)
    {
        $customer = $zakaznici->toArray();
        $billing = $zakaznici->billing_address ?? [];
        $delivery = $zakaznici->delivery_address ?? [];

        $customer['billing_street'] = $billing['street'] ?? '';
        $customer['billing_city'] = $billing['city'] ?? '';
        $customer['billing_zip'] = $billing['zip'] ?? '';
        $customer['billing_country'] = $billing['country'] ?? 'Česká republika';
        $customer['delivery_street'] = $delivery['street'] ?? '';
        $customer['delivery_city'] = $delivery['city'] ?? '';
        $customer['delivery_zip'] = $delivery['zip'] ?? '';
        $customer['delivery_country'] = $delivery['country'] ?? 'Česká republika';
        $customer['delivery_same'] = $billing === $delivery || empty($delivery);

        return Inertia::render('Customers/Edit', [
            'customer' => $customer,
        ]);
    }

    public function update(CustomerRequest $request, Customer $zakaznici)
    {
        $data = $this->prepareData($request->validated());
        $zakaznici->update($data);

        return redirect()->route('zakaznici.show', $zakaznici)
            ->with('success', 'Zákazník aktualizován.');
    }

    public function destroy(Customer $zakaznici)
    {
        $zakaznici->delete();

        return redirect()->route('zakaznici.index')
            ->with('success', 'Zákazník přesunut do koše.');
    }

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

    private function prepareData(array $validated): array
    {
        $data = $validated;

        $data['billing_address'] = array_filter([
            'street' => $data['billing_street'] ?? null,
            'city' => $data['billing_city'] ?? null,
            'zip' => $data['billing_zip'] ?? null,
            'country' => $data['billing_country'] ?? null,
        ]);

        unset($data['billing_street'], $data['billing_city'], $data['billing_zip'], $data['billing_country']);

        if (! ($data['delivery_same'] ?? true)) {
            $data['delivery_address'] = array_filter([
                'street' => $data['delivery_street'] ?? null,
                'city' => $data['delivery_city'] ?? null,
                'zip' => $data['delivery_zip'] ?? null,
                'country' => $data['delivery_country'] ?? null,
            ]);
        } else {
            $data['delivery_address'] = $data['billing_address'];
        }

        unset($data['delivery_same'], $data['delivery_street'], $data['delivery_city'], $data['delivery_zip'], $data['delivery_country']);

        return $data;
    }
}
