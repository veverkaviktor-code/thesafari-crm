<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\Task;
use Illuminate\Http\Request;
use Inertia\Inertia;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $tasks = Task::query()
            ->with([
                'customer:id,name,company',
                'order:id,title',
                'invoice:id,invoice_number',
            ])
            ->when($request->input('search'), fn ($q, $term) => $q->search($term))
            ->when($request->input('status'), fn ($q, $s) => $q->byStatus($s))
            ->when($request->input('priority'), fn ($q, $p) => $q->byPriority($p))
            ->when($request->input('period'), function ($q, $period) {
                return match ($period) {
                    'today'   => $q->dueToday(),
                    'week'    => $q->dueThisWeek(),
                    'overdue' => $q->overdue(),
                    default   => $q,
                };
            })
            ->latest()
            ->paginate(25)
            ->withQueryString();

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

        $expiringSubscriptions = Subscription::where('status', 'aktivni')
            ->whereNotNull('expires_at')
            ->whereBetween('expires_at', [$calendarStart, $calendarEnd])
            ->select('id', 'name', 'type', 'expires_at')
            ->get()
            ->map(fn ($s) => [
                'id'      => $s->id,
                'title'   => $s->name,
                'date'    => $s->expires_at->toDateString(),
                'type'    => 'subscription',
                'subtype' => $s->type,
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
                'subscriptions' => $expiringSubscriptions,
                'invoices'      => $dueInvoices,
            ],
            'filters'   => $request->only(['search', 'status', 'priority', 'period']),
            'customers' => $customers,
            'orders'    => $orders,
            'invoices'  => $invoices,
            'alerts'    => DashboardController::getAttentionAlerts(),
            'ignoredAlerts' => DashboardController::getIgnoredAlerts(),
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

        return back()->with('success', 'Úkol smazán.');
    }
}
