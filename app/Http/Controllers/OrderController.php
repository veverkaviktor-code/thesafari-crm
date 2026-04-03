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
        $trashed = $request->boolean('trashed');

        $timeCostSubquery = \App\Models\TimeEntry::selectRaw('COALESCE(SUM(CEIL(duration_minutes / 30.0) * 0.5 * hourly_rate), 0)')
            ->whereColumn('order_id', 'orders.id')
            ->whereNotNull('stopped_at');

        $query = $trashed
            ? Order::onlyTrashed()->with('customer:id,name,company')->addSelect(['*', 'total_time_cost' => $timeCostSubquery])
            : Order::query()->with('customer:id,name,company')->addSelect(['*', 'total_time_cost' => $timeCostSubquery]);

        $query->search($request->input('search'))
            ->when(!$trashed, fn ($q) => $q
                ->byStatus($request->input('status'))
                ->byDivision($request->input('division'))
            )
            ->when($request->input('customer_id'), fn ($q, $id) => $q->where('customer_id', $id))
            ->latest();

        $orders = $query->paginate(25)->withQueryString();
        $trashedCount = Order::onlyTrashed()->count();

        return Inertia::render('Orders/Index', [
            'orders' => $orders,
            'customers' => Customer::select('id', 'name', 'company')->orderBy('name')->get(),
            'filters' => $request->only(['search', 'status', 'division', 'customer_id', 'trashed']),
            'trashedCount' => $trashedCount,
        ]);
    }

    public function show(Order $zakazky)
    {
        $order = $zakazky;
        $order->load([
            'customer:id,name,company,email,phone',
            'timeEntries.user:id,name',
            'costs',
            'items',
            'attachments',
        ]);

        $timeEntries = $order->timeEntries;
        $totalMinutes = $timeEntries->sum(fn ($e) => $e->duration_minutes ?? 0);
        $totalTimeCost = $timeEntries->sum(fn ($e) => $e->cost);

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
            ->with('success', 'Zakázka vytvořena.');
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
            ->with('success', 'Zakázka aktualizována.');
    }

    public function destroy(Order $zakazky)
    {
        $zakazky->delete();

        return redirect()->route('zakazky.index')
            ->with('success', 'Zakázka přesunuta do koše.');
    }

    public function restore(int $id)
    {
        $order = Order::onlyTrashed()->findOrFail($id);
        $order->restore();

        return redirect()->route('zakazky.index')
            ->with('success', "Zakázka \"{$order->title}\" obnovena.");
    }

    public function forceDelete(int $id)
    {
        $order = Order::onlyTrashed()->findOrFail($id);
        // Delete attachments from disk
        foreach ($order->attachments as $attachment) {
            \Storage::disk('local')->delete($attachment->path);
            $attachment->delete();
        }
        $order->forceDelete();

        return redirect()->route('zakazky.index', ['trashed' => 1])
            ->with('success', 'Zakázka trvale smazána.');
    }

    public function bulkDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        Order::whereIn('id', $request->ids)->each(fn ($o) => $o->delete());
        return back()->with('success', count($request->ids) . ' zakázek přesunuto do koše.');
    }

    public function bulkRestore(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        Order::onlyTrashed()->whereIn('id', $request->ids)->each(fn ($o) => $o->restore());
        return back()->with('success', count($request->ids) . ' zakázek obnoveno.');
    }

    public function bulkForceDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        $orders = Order::onlyTrashed()->whereIn('id', $request->ids)->get();
        foreach ($orders as $order) {
            foreach ($order->attachments as $attachment) {
                \Storage::disk('local')->delete($attachment->path);
                $attachment->delete();
            }
            $order->forceDelete();
        }
        return back()->with('success', $orders->count() . ' zakázek trvale smazáno.');
    }

    public function emptyTrash()
    {
        $count = Order::onlyTrashed()->count();
        Order::onlyTrashed()->each(function ($order) {
            foreach ($order->attachments as $attachment) {
                \Storage::disk('local')->delete($attachment->path);
                $attachment->delete();
            }
            $order->forceDelete();
        });
        return back()->with('success', "Koš vysypán ($count zakázek trvale smazáno).");
    }
}
