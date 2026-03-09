<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Estimate;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Subscription;
use App\Models\Task;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $q = $request->input('q', '');

        if (strlen($q) < 2) {
            return response()->json(['results' => []]);
        }

        $term = "%{$q}%";

        $customers = Customer::where(function ($q) use ($term) {
                $q->where('name', 'ilike', $term)
                  ->orWhere('company', 'ilike', $term)
                  ->orWhere('email', 'ilike', $term)
                  ->orWhere('ico', 'ilike', $term);
            })
            ->select('id', 'name', 'company', 'email')
            ->limit(5)
            ->get()
            ->map(fn ($c) => [
                'id' => $c->id,
                'title' => $c->company ?: $c->name,
                'subtitle' => $c->email,
                'link' => "/zakaznici/{$c->id}",
                'type' => 'customer',
            ]);

        $orders = Order::where(function ($q) use ($term) {
                $q->where('title', 'ilike', $term)
                  ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', $term)->orWhere('company', 'ilike', $term));
            })
            ->with('customer:id,name')
            ->select('id', 'title', 'status', 'customer_id')
            ->limit(5)
            ->get()
            ->map(fn ($o) => [
                'id' => $o->id,
                'title' => $o->title,
                'subtitle' => $o->customer?->name . ' · ' . $o->status,
                'link' => "/zakazky/{$o->id}",
                'type' => 'order',
            ]);

        $invoices = Invoice::where(function ($q) use ($term) {
                $q->where('invoice_number', 'ilike', $term)
                  ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', $term)->orWhere('company', 'ilike', $term));
            })
            ->with('customer:id,name')
            ->select('id', 'invoice_number', 'total', 'status', 'customer_id')
            ->limit(5)
            ->get()
            ->map(fn ($i) => [
                'id' => $i->id,
                'title' => "Faktura {$i->invoice_number}",
                'subtitle' => $i->customer?->name . ' · ' . number_format($i->total, 0, ',', ' ') . ' Kč',
                'link' => "/faktury/{$i->id}",
                'type' => 'invoice',
            ]);

        $subscriptions = Subscription::where(function ($q) use ($term) {
                $q->where('name', 'ilike', $term)
                  ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', $term)->orWhere('company', 'ilike', $term));
            })
            ->with('customer:id,name')
            ->select('id', 'name', 'type', 'status', 'customer_id')
            ->limit(5)
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'title' => $s->name,
                'subtitle' => ($s->customer?->name ?? '') . ' · ' . ucfirst($s->type),
                'link' => "/neniweb/{$s->id}",
                'type' => 'subscription',
            ]);

        $estimates = Estimate::where(function ($q) use ($term) {
                $q->where('name', 'ilike', $term)
                  ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', $term)->orWhere('company', 'ilike', $term));
            })
            ->with('customer:id,name')
            ->select('id', 'name', 'status', 'customer_id')
            ->limit(5)
            ->get()
            ->map(fn ($e) => [
                'id' => $e->id,
                'title' => $e->name,
                'subtitle' => ($e->customer?->name ?? 'Bez zákazníka') . ' · ' . $e->status,
                'link' => "/kalkulator/{$e->id}",
                'type' => 'estimate',
            ]);

        $tickets = Ticket::where(function ($q) use ($term) {
                $q->where('subject', 'ilike', $term)
                  ->orWhere('source_email', 'ilike', $term);
            })
            ->with('customer:id,name')
            ->select('id', 'subject', 'status', 'priority', 'customer_id')
            ->limit(5)
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'title' => $t->subject,
                'subtitle' => ($t->customer?->name ?? 'Neznámý') . ' · ' . $t->priority,
                'link' => "/zpravy/{$t->id}",
                'type' => 'ticket',
            ]);

        $tasks = Task::where(function ($q) use ($term) {
                $q->where('title', 'ilike', $term)
                  ->orWhere('description', 'ilike', $term);
            })
            ->open()
            ->select('id', 'title', 'priority', 'due_date')
            ->limit(5)
            ->get()
            ->map(fn ($t) => [
                'id'       => $t->id,
                'title'    => $t->title,
                'subtitle' => $t->priority . ($t->due_date ? ' · ' . $t->due_date->format('d. n.') : ''),
                'link'     => '/planovac',
                'type'     => 'task',
            ]);

        return response()->json([
            'results' => [
                'customers'     => $customers,
                'subscriptions' => $subscriptions,
                'orders'        => $orders,
                'invoices'      => $invoices,
                'estimates'     => $estimates,
                'tickets'       => $tickets,
                'tasks'         => $tasks,
            ],
        ]);
    }
}
