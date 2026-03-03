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
        $customer->load(['subscriptions']);

        $revenue = (float) $customer->invoices()->where('status', 'zaplacena')->sum('total');
        $costs = (float) $customer->orders()
            ->join('order_costs', 'orders.id', '=', 'order_costs.order_id')
            ->sum('order_costs.amount');

        $stats = [
            'orders_count' => $customer->orders()->count(),
            'total_revenue' => $revenue,
            'total_costs' => $costs,
            'profit' => round($revenue - $costs, 2),
            'active_subscriptions' => $customer->subscriptions()->where('status', 'active')->count(),
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

        return Inertia::render('Customers/Show', [
            'customer' => $customer,
            'stats' => $stats,
            'orders' => $orders,
            'invoices' => $invoices,
            'tickets' => $tickets,
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
