<?php

namespace App\Http\Controllers;

use App\Http\Requests\OrderRequest;
use App\Models\Customer;
use App\Models\Order;
use Illuminate\Http\Request;
use Inertia\Inertia;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $orders = Order::query()
            ->with('customer:id,name,company')
            ->search($request->input('search'))
            ->byStatus($request->input('status'))
            ->byDivision($request->input('division'))
            ->when($request->input('customer_id'), fn ($q, $id) => $q->where('customer_id', $id))
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Orders/Index', [
            'orders' => $orders,
            'customers' => Customer::select('id', 'name', 'company')->orderBy('name')->get(),
            'filters' => $request->only(['search', 'status', 'division', 'customer_id']),
        ]);
    }

    public function show(Order $zakazky)
    {
        $order = $zakazky;
        $order->load([
            'customer:id,name,company,email,phone',
            'timeEntries.user:id,name',
            'costs',
        ]);

        $timeEntries = $order->timeEntries;
        $totalMinutes = $timeEntries->sum(fn ($e) => $e->duration_minutes ?? 0);
        $totalTimeCost = $timeEntries->sum(function ($e) {
            if (! $e->duration_minutes || ! $e->hourly_rate) {
                return 0;
            }
            return ($e->duration_minutes / 60) * (float) $e->hourly_rate;
        });

        $stats = [
            'total_time_minutes' => $totalMinutes,
            'total_time_cost' => round($totalTimeCost, 2),
            'total_costs' => (float) $order->costs->sum('amount'),
            'running_timer' => $timeEntries->first(fn ($e) => $e->isRunning()),
        ];

        return Inertia::render('Orders/Show', [
            'order' => $order,
            'stats' => $stats,
        ]);
    }

    public function create(Request $request)
    {
        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();

        return Inertia::render('Orders/Create', [
            'customers' => $customers,
            'preselected_customer_id' => $request->input('customer_id'),
        ]);
    }

    public function store(OrderRequest $request)
    {
        $order = Order::create($request->validated());

        return redirect()->route('zakazky.show', $order)
            ->with('success', 'Zakazka vytvorena.');
    }

    public function edit(Order $zakazky)
    {
        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();

        return Inertia::render('Orders/Edit', [
            'order' => $zakazky,
            'customers' => $customers,
        ]);
    }

    public function update(OrderRequest $request, Order $zakazky)
    {
        $zakazky->update($request->validated());

        return redirect()->route('zakazky.show', $zakazky)
            ->with('success', 'Zakazka aktualizovana.');
    }

    public function destroy(Order $zakazky)
    {
        $zakazky->delete();

        return redirect()->route('zakazky.index')
            ->with('success', 'Zakazka smazana.');
    }
}
