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
        $sortField = $request->input('sort', 'created_at');
        $sortDir = $request->input('direction', 'desc');
        $allowedSorts = ['name', 'email', 'created_at', 'company'];

        $customers = Customer::query()
            ->search($request->input('search'))
            ->when($request->input('type'), fn ($q, $type) => $q->where('type', $type))
            ->orderBy(in_array($sortField, $allowedSorts) ? $sortField : 'created_at', $sortDir === 'asc' ? 'asc' : 'desc')
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Customers/Index', [
            'customers' => $customers,
            'filters' => $request->only(['search', 'type', 'sort', 'direction']),
        ]);
    }

    public function show(Customer $zakaznici)
    {
        $customer = $zakaznici;
        $customer->load(['subscriptions']);

        $revenue = (float) $customer->orders()->sum('price');
        $costs = (float) \App\Models\OrderCost::whereHas('order', fn ($q) =>
            $q->where('customer_id', $customer->id)
        )->sum('amount');
        $invoiced = (float) $customer->invoices()->sum('total');
        $paid = (float) $customer->invoices()->where('status', 'zaplacena')->sum('total');
        $vpsYearly = (float) \App\Models\VpsServer::where('customer_id', $customer->id)
            ->where('status', 'aktivni')->sum('price_yearly');

        $stats = [
            'orders_count' => $customer->orders()->count(),
            'total_revenue' => $revenue,
            'total_costs' => $costs,
            'profit' => round($revenue - $costs, 2),
            'invoiced' => $invoiced,
            'paid' => $paid,
            'uninvoiced' => round($revenue - $invoiced, 2),
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

        $tickets = $customer->tickets()
            ->select('id', 'customer_id', 'subject', 'status', 'priority', 'created_at')
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
            'tickets' => $tickets,
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
            ->with('success', 'Zakaznik vytvoren.');
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
            ->with('success', 'Zakaznik aktualizovan.');
    }

    public function destroy(Customer $zakaznici)
    {
        $zakaznici->delete();

        return redirect()->route('zakaznici.index')
            ->with('success', 'Zakaznik smazan.');
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
