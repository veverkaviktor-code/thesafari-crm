<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Subscription;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SubscriptionController extends Controller
{
    public function index(Request $request)
    {
        $subscriptions = Subscription::query()
            ->with('customer:id,name,company')
            ->when($request->input('search'), function ($q, $term) {
                $q->where('name', 'ilike', "%{$term}%")
                  ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', "%{$term}%"));
            })
            ->when($request->input('type'), fn ($q, $t) => $q->where('type', $t))
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->orderBy('expires_at')
            ->paginate(25)
            ->withQueryString()
            ->through(fn ($sub) => array_merge($sub->toArray(), [
                'days_until_expiry' => $sub->daysUntilExpiry(),
                'urgency' => $sub->expiryUrgency(),
            ]));

        return Inertia::render('Neniweb/Index', [
            'subscriptions' => $subscriptions,
            'filters' => $request->only(['search', 'type', 'status']),
        ]);
    }

    public function show(Subscription $neniweb)
    {
        $neniweb->load('customer');

        return Inertia::render('Neniweb/Show', [
            'subscription' => array_merge($neniweb->toArray(), [
                'days_until_expiry' => $neniweb->daysUntilExpiry(),
                'urgency' => $neniweb->expiryUrgency(),
            ]),
        ]);
    }

    public function create()
    {
        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();

        return Inertia::render('Neniweb/Create', [
            'customers' => $customers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'type' => 'required|in:hosting,domena',
            'name' => 'required|string|max:255',
            'provider' => 'nullable|string|max:255',
            'server' => 'nullable|string|max:255',
            'price_yearly' => 'required|numeric|min:0',
            'starts_at' => 'required|date',
            'expires_at' => 'required|date|after:starts_at',
            'auto_renew' => 'boolean',
            'status' => 'required|in:aktivni,neaktivni,expirovana',
            'notes' => 'nullable|string',
        ]);

        $subscription = Subscription::create($validated);

        return redirect()->route('neniweb.show', $subscription)
            ->with('success', 'Subscription vytvořena.');
    }

    public function edit(Subscription $neniweb)
    {
        $customers = Customer::select('id', 'name', 'company')->orderBy('name')->get();

        return Inertia::render('Neniweb/Edit', [
            'subscription' => $neniweb,
            'customers' => $customers,
        ]);
    }

    public function update(Request $request, Subscription $neniweb)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'type' => 'required|in:hosting,domena',
            'name' => 'required|string|max:255',
            'provider' => 'nullable|string|max:255',
            'server' => 'nullable|string|max:255',
            'price_yearly' => 'required|numeric|min:0',
            'starts_at' => 'required|date',
            'expires_at' => 'required|date|after:starts_at',
            'auto_renew' => 'boolean',
            'status' => 'required|in:aktivni,neaktivni,expirovana',
            'notes' => 'nullable|string',
        ]);

        $neniweb->update($validated);

        return redirect()->route('neniweb.show', $neniweb)
            ->with('success', 'Subscription aktualizována.');
    }

    public function destroy(Subscription $neniweb)
    {
        $neniweb->delete();

        return redirect()->route('neniweb.index')
            ->with('success', 'Subscription smazána.');
    }
}
