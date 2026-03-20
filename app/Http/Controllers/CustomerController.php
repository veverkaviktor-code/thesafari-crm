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
        $customer->load(['websites']);

        $orderCosts = (float) \App\Models\OrderCost::whereHas('order', fn ($q) =>
            $q->where('customer_id', $customer->id)
        )->sum('amount');
        // Website costs = what WE pay for hosting/domains we manage
        $websiteCosts = (float) $customer->websites()
            ->where('status', 'aktivni')
            ->sum('cost_yearly');
        $totalCosts = $orderCosts + $websiteCosts;

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
            'active_websites' => $customer->websites()->where('status', 'aktivni')->count(),
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

        // Aggregate attachments from all customer's orders
        $orderAttachments = $customer->orders()
            ->with('attachments')
            ->get()
            ->flatMap(function ($order) {
                return $order->attachments->map(fn ($att) => array_merge(
                    $att->only(['id', 'filename', 'description', 'mime_type', 'size', 'created_at']),
                    ['order_id' => $order->id, 'order_title' => $order->title]
                ));
            })
            ->values();

        return Inertia::render('Customers/Show', [
            'customer' => $customer,
            'stats' => $stats,
            'orders' => $orders,
            'invoices' => $invoices,
            'vpsServers' => $vpsServers,
            'orderAttachments' => $orderAttachments,
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
        $activeWebsites = $customer->websites()->where('status', 'aktivni')->count();

        if ($activeOrders > 0 || $unpaidInvoices > 0 || $activeWebsites > 0) {
            $reasons = [];
            if ($activeOrders > 0) $reasons[] = "{$activeOrders} aktivních zakázek";
            if ($unpaidInvoices > 0) $reasons[] = "{$unpaidInvoices} nezaplacených faktur";
            if ($activeWebsites > 0) $reasons[] = "{$activeWebsites} aktivních webů";

            return back()->with('error', 'Zákazníka nelze trvale smazat — má: ' . implode(', ', $reasons) . '.');
        }

        $this->cleanupBeforeForceDelete($customer);
        $customer->forceDelete();

        return redirect()->route('zakaznici.index', ['trashed' => 1])
            ->with('success', 'Zákazník trvale smazán.');
    }

    public function bulkDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        Customer::whereIn('id', $request->ids)->each(fn ($c) => $c->delete());
        return back()->with('success', count($request->ids) . ' zákazníků přesunuto do koše.');
    }

    public function bulkRestore(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        Customer::onlyTrashed()->whereIn('id', $request->ids)->each(fn ($c) => $c->restore());
        return back()->with('success', count($request->ids) . ' zákazníků obnoveno.');
    }

    public function bulkForceDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        $customers = Customer::onlyTrashed()->whereIn('id', $request->ids)->get();
        $blocked = [];
        $deleted = 0;
        foreach ($customers as $customer) {
            $hasActive = $customer->orders()->withTrashed()->whereNull('deleted_at')->exists()
                || $customer->invoices()->withTrashed()->whereNull('deleted_at')->where('status', '!=', 'zaplacena')->exists()
                || $customer->websites()->where('status', 'aktivni')->exists();
            if ($hasActive) {
                $blocked[] = $customer->name;
            } else {
                $this->cleanupBeforeForceDelete($customer);
                $customer->forceDelete();
                $deleted++;
            }
        }
        if (count($blocked) > 0) {
            return back()->with('error', 'Nelze smazat: ' . implode(', ', $blocked) . ' — mají aktivní vazby.')
                         ->with('success', $deleted > 0 ? "$deleted zákazníků trvale smazáno." : null);
        }
        return back()->with('success', "$deleted zákazníků trvale smazáno.");
    }

    public function emptyTrash()
    {
        $customers = Customer::onlyTrashed()->get();
        $deleted = 0;
        $blocked = 0;
        foreach ($customers as $customer) {
            $hasActive = $customer->orders()->withTrashed()->whereNull('deleted_at')->exists()
                || $customer->invoices()->withTrashed()->whereNull('deleted_at')->where('status', '!=', 'zaplacena')->exists()
                || $customer->websites()->where('status', 'aktivni')->exists();
            if ($hasActive) {
                $blocked++;
            } else {
                $this->cleanupBeforeForceDelete($customer);
                $customer->forceDelete();
                $deleted++;
            }
        }
        $msg = "Koš vysypán ($deleted zákazníků trvale smazáno).";
        if ($blocked > 0) $msg .= " $blocked zákazníků přeskočeno (aktivní vazby).";
        return back()->with('success', $msg);
    }

    /**
     * Odpojí/smaže všechny zbývající záznamy před force delete zákazníka.
     * PHP soft-delete kontrola už proběhla — zde řešíme PostgreSQL FK constraints.
     */
    private function cleanupBeforeForceDelete(Customer $customer): void
    {
        // Force delete soft-deleted orders a invoices (v koši stejně jako zákazník)
        $customer->orders()->onlyTrashed()->forceDelete();
        $customer->invoices()->onlyTrashed()->forceDelete();

        // Nullify customer_id na zbývajících (zaplacené faktury, uzavřené zakázky apod.)
        $customer->orders()->update(['customer_id' => null]);
        $customer->invoices()->update(['customer_id' => null]);

        // Websites — smazat neaktivní, nullify zbytek
        $customer->websites()->where('status', '!=', 'aktivni')->delete();
        $customer->websites()->update(['customer_id' => null]);
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
