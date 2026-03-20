<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Website;
use App\Models\Task;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $trashed = $request->boolean('trashed');

        $query = $trashed
            ? Task::onlyTrashed()->with([
                'customer:id,name,company',
                'order:id,title',
                'invoice:id,invoice_number',
              ])
            : Task::query()->with([
                'customer:id,name,company',
                'order:id,title',
                'invoice:id,invoice_number',
              ]);

        $query->when($request->input('search'), fn ($q, $term) => $q->search($term))
            ->when(!$trashed && $request->input('status'), fn ($q, $s) => $q->byStatus($s))
            ->when(!$trashed && $request->input('priority'), fn ($q, $p) => $q->byPriority($p))
            ->when(!$trashed && $request->input('period'), function ($q, $period) {
                return match ($period) {
                    'today'   => $q->dueToday(),
                    'week'    => $q->dueThisWeek(),
                    'overdue' => $q->overdue(),
                    default   => $q,
                };
            })
            ->latest();

        $tasks = $query->paginate(25)->withQueryString();
        $trashedCount = Task::onlyTrashed()->count();

        if ($trashed) {
            return Inertia::render('Planner/Index', [
                'tasks'          => $tasks,
                'calendarEvents' => ['tasks' => [], 'websites' => [], 'invoices' => []],
                'filters'        => $request->only(['search', 'trashed']),
                'customers'      => [],
                'orders'         => [],
                'invoices'       => [],
                'alerts'         => [],
                'ignoredAlerts'  => [],
                'trashedCount'   => $trashedCount,
            ]);
        }

        $calendarStart = now()->subMonth()->startOfMonth();
        $calendarEnd = now()->addMonth()->endOfMonth();

        $calendarTasks = Task::open()
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$calendarStart, $calendarEnd])
            ->select('id', 'title', 'due_date', 'priority', 'status')
            ->get()
            ->map(fn ($t) => [
                'id'       => $t->id,
                'title'    => $t->title,
                'date'     => $t->due_date->toDateString(),
                'type'     => 'task',
                'priority' => $t->priority,
            ]);

        $expiringWebsites = Website::where('status', 'aktivni')
            ->whereNotNull('hosting_expires_at')
            ->whereBetween('hosting_expires_at', [$calendarStart, $calendarEnd])
            ->select('id', 'name', 'hosting_expires_at')
            ->get()
            ->map(fn ($w) => [
                'id'      => $w->id,
                'title'   => $w->name,
                'date'    => $w->hosting_expires_at->toDateString(),
                'type'    => 'website',
            ]);

        $dueInvoices = Invoice::whereIn('status', ['vystavena', 'odeslana'])
            ->whereNotNull('due_date')
            ->whereBetween('due_date', [$calendarStart, $calendarEnd])
            ->select('id', 'invoice_number', 'due_date', 'total')
            ->get()
            ->map(fn ($i) => [
                'id'    => $i->id,
                'title' => "Faktura {$i->invoice_number}",
                'date'  => $i->due_date->toDateString(),
                'type'  => 'invoice',
                'total' => (float) $i->total,
            ]);

        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();
        $orders    = Order::whereIn('status', ['nova', 'v_reseni'])
            ->select('id', 'title')->orderBy('title')->get();
        $invoices  = Invoice::whereIn('status', ['vystavena', 'odeslana'])
            ->select('id', 'invoice_number')->orderBy('invoice_number')->get();

        return Inertia::render('Planner/Index', [
            'tasks'          => $tasks,
            'calendarEvents' => [
                'tasks'         => $calendarTasks,
                'websites' => $expiringWebsites,
                'invoices'      => $dueInvoices,
            ],
            'filters'       => $request->only(['search', 'status', 'priority', 'period', 'trashed']),
            'customers'     => $customers,
            'orders'        => $orders,
            'invoices'      => $invoices,
            'alerts'        => DashboardController::getAttentionAlerts(),
            'ignoredAlerts' => DashboardController::getIgnoredAlerts(),
            'trashedCount'  => $trashedCount,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'required|in:novy,rozpracovany,hotovy,zruseny',
            'priority'    => 'required|in:low,medium,high',
            'due_date'    => 'nullable|date',
            'customer_id' => 'nullable|exists:customers,id',
            'order_id'    => 'nullable|exists:orders,id',
            'invoice_id'  => 'nullable|exists:invoices,id',
        ]);

        Task::create($validated);

        return back()->with('success', 'Úkol vytvořen.');
    }

    public function update(Request $request, Task $planovac)
    {
        $task = $planovac;

        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'status'      => 'required|in:novy,rozpracovany,hotovy,zruseny',
            'priority'    => 'required|in:low,medium,high',
            'due_date'    => 'nullable|date',
            'customer_id' => 'nullable|exists:customers,id',
            'order_id'    => 'nullable|exists:orders,id',
            'invoice_id'  => 'nullable|exists:invoices,id',
        ]);

        if ($validated['status'] === 'hotovy' && !$task->completed_at) {
            $validated['completed_at'] = now();
        }
        if ($validated['status'] !== 'hotovy') {
            $validated['completed_at'] = null;
        }

        $task->update($validated);

        return back()->with('success', 'Úkol aktualizován.');
    }

    public function toggleComplete(Task $task)
    {
        if ($task->status === 'hotovy') {
            $task->update([
                'status'       => 'rozpracovany',
                'completed_at' => null,
            ]);
        } else {
            $task->markAsCompleted();
        }

        return back()->with('success',
            $task->status === 'hotovy' ? 'Úkol dokončen.' : 'Úkol obnoven.'
        );
    }

    public function destroy(Task $planovac)
    {
        $planovac->delete();

        return back()->with('success', 'Úkol přesunut do koše.');
    }

    public function restore(int $id)
    {
        $task = Task::onlyTrashed()->findOrFail($id);
        $task->restore();

        return redirect()->route('planovac.index')
            ->with('success', "Úkol \"{$task->title}\" obnoven.");
    }

    public function forceDelete(int $id)
    {
        $task = Task::onlyTrashed()->findOrFail($id);
        $task->forceDelete();

        return redirect()->route('planovac.index', ['trashed' => 1])
            ->with('success', 'Úkol trvale smazán.');
    }

    public function bulkDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        Task::whereIn('id', $request->ids)->each(fn ($t) => $t->delete());
        return back()->with('success', count($request->ids) . ' úkolů přesunuto do koše.');
    }

    public function bulkRestore(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        Task::onlyTrashed()->whereIn('id', $request->ids)->each(fn ($t) => $t->restore());
        return back()->with('success', count($request->ids) . ' úkolů obnoveno.');
    }

    public function bulkForceDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        Task::onlyTrashed()->whereIn('id', $request->ids)->forceDelete();
        return back()->with('success', count($request->ids) . ' úkolů trvale smazáno.');
    }

    public function emptyTrash()
    {
        $count = Task::onlyTrashed()->count();
        Task::onlyTrashed()->forceDelete();
        return back()->with('success', "Koš vysypán ($count úkolů trvale smazáno).");
    }
}
