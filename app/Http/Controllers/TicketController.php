<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class TicketController extends Controller
{
    public function index(Request $request)
    {
        $tickets = Ticket::query()
            ->with('customer:id,name,company')
            ->withCount('messages')
            ->when($request->input('search'), function ($q, $term) {
                $q->where('subject', 'ilike', "%{$term}%")
                  ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', "%{$term}%"));
            })
            ->when($request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when($request->input('priority'), fn ($q, $p) => $q->where('priority', $p))
            ->when($request->input('source'), fn ($q, $s) => $q->where('source', $s))
            ->when($request->input('customer_id'), fn ($q, $id) => $q->where('customer_id', $id))
            ->latest()
            ->paginate(25)
            ->withQueryString();

        return Inertia::render('Tickets/Index', [
            'tickets' => $tickets,
            'filters' => $request->only(['search', 'status', 'priority', 'source', 'customer_id']),
        ]);
    }

    public function show(Ticket $zpravy)
    {
        $ticket = $zpravy;
        $ticket->load(['customer', 'messages']);

        return Inertia::render('Tickets/Show', [
            'ticket' => $ticket,
        ]);
    }

    public function create()
    {
        $customers = Customer::select('id', 'name', 'company', 'email')->orderBy('name')->get();

        return Inertia::render('Tickets/Create', [
            'customers' => $customers,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'subject' => 'required|string|max:255',
            'status' => 'required|in:novy,v_reseni,ceka_na_zakaznika,vyreseno',
            'priority' => 'required|in:low,medium,high',
            'source_email' => 'nullable|email',
            'message' => 'required|string',
        ]);

        $ticket = Ticket::create([
            'customer_id' => $validated['customer_id'],
            'subject' => $validated['subject'],
            'status' => $validated['status'],
            'priority' => $validated['priority'],
            'source_email' => $validated['source_email'],
        ]);

        $ticket->messages()->create([
            'direction' => 'inbound',
            'from_email' => $validated['source_email'],
            'content' => $validated['message'],
        ]);

        $admin = \App\Models\User::where('role', 'admin')->first();
        $admin?->notify(new \App\Notifications\NewTicket($ticket));

        return redirect()->route('zpravy.show', $ticket)
            ->with('success', 'Zpráva vytvořena.');
    }

    public function edit(Ticket $zpravy)
    {
        $ticket = $zpravy;
        $customers = Customer::select('id', 'name', 'company', 'email')->orderBy('name')->get();

        return Inertia::render('Tickets/Edit', [
            'ticket' => $ticket,
            'customers' => $customers,
        ]);
    }

    public function update(Request $request, Ticket $zpravy)
    {
        $ticket = $zpravy;

        $validated = $request->validate([
            'customer_id' => 'nullable|exists:customers,id',
            'subject' => 'required|string|max:255',
            'status' => 'required|in:novy,v_reseni,ceka_na_zakaznika,vyreseno',
            'priority' => 'required|in:low,medium,high',
        ]);

        $ticket->update($validated);

        if ($validated['status'] === 'vyreseno' && !$ticket->resolved_at) {
            $ticket->update(['resolved_at' => now()]);
        }

        return redirect()->route('zpravy.show', $ticket)
            ->with('success', 'Zpráva aktualizována.');
    }

    public function reply(Request $request, Ticket $ticket)
    {
        $validated = $request->validate([
            'content' => 'required|string',
        ]);

        $ticket->messages()->create([
            'direction' => 'outbound',
            'from_email' => config('mail.from.address'),
            'content' => $validated['content'],
        ]);

        // Send email to customer if they have source_email
        if ($ticket->source_email) {
            Mail::raw($validated['content'], function ($message) use ($ticket) {
                $message->to($ticket->source_email)
                    ->subject("Re: {$ticket->subject}");
            });
        }

        // Update status to v_reseni if it was novy
        if ($ticket->status === 'novy') {
            $ticket->update(['status' => 'v_reseni']);
        }

        return back()->with('success', 'Odpověď odeslána.');
    }

    public function destroy(Ticket $zpravy)
    {
        $zpravy->delete();

        return redirect()->route('zpravy.index')
            ->with('success', 'Zpráva smazána.');
    }
}
