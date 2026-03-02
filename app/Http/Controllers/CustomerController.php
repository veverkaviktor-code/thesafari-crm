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
        $customers = Customer::query()
            ->search($request->input('search'))
            ->when($request->input('type'), fn ($q, $type) => $q->where('type', $type))
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Customers/Index', [
            'customers' => $customers,
            'filters' => $request->only(['search', 'type']),
        ]);
    }

    public function show(Customer $zakaznici)
    {
        $customer = $zakaznici;
        $customer->load(['orders', 'subscriptions']);

        $stats = [
            'orders_count' => $customer->orders()->count(),
            'revenue' => (float) $customer->invoices()->where('status', 'zaplacena')->sum('total'),
            'costs' => (float) $customer->orders()
                ->join('order_costs', 'orders.id', '=', 'order_costs.order_id')
                ->sum('order_costs.amount'),
            'active_subscriptions' => 0,
        ];

        return Inertia::render('Customers/Show', [
            'customer' => $customer,
            'stats' => $stats,
        ]);
    }

    public function create()
    {
        return Inertia::render('Customers/Create');
    }

    public function store(CustomerRequest $request)
    {
        $customer = Customer::create($request->validated());

        return redirect()->route('zakaznici.show', $customer)
            ->with('success', 'Zakaznik vytvoren.');
    }

    public function edit(Customer $zakaznici)
    {
        return Inertia::render('Customers/Edit', [
            'customer' => $zakaznici,
        ]);
    }

    public function update(CustomerRequest $request, Customer $zakaznici)
    {
        $zakaznici->update($request->validated());

        return redirect()->route('zakaznici.show', $zakaznici)
            ->with('success', 'Zakaznik aktualizovan.');
    }

    public function destroy(Customer $zakaznici)
    {
        $zakaznici->delete();

        return redirect()->route('zakaznici.index')
            ->with('success', 'Zakaznik smazan.');
    }
}
