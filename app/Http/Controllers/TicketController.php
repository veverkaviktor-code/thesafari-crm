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
        $trashed = $request->boolean('trashed');

        $query = $trashed
            ? Ticket::onlyTrashed()->with('customer:id,name,company')
            : Ticket::query()->with('customer:id,name,company');

        $query->withCount('messages')
            ->when($request->input('search'), function ($q, $term) {
                $q->where('subject', 'ilike', "%{$term}%")
                  ->orWhereHas('customer', fn ($cq) => $cq->where('name', 'ilike', "%{$term}%"));
            })
            ->when(!$trashed && $request->input('status'), fn ($q, $s) => $q->where('status', $s))
            ->when(!$trashed && $request->input('priority'), fn ($q, $p) => $q->where('priority', $p))
            ->when(!$trashed && $request->input('source'), fn ($q, $s) => $q->where('source', $s))
            ->when($request->input('customer_id'), fn ($q, $id) => $q->where('customer_id', $id))
            ->latest();

        $tickets = $query->paginate(25)->withQueryString();
        $trashedCount = Ticket::onlyTrashed()->count();

        return Inertia::render('Tickets/Index', [
            'tickets' => $tickets,
            'filters' => $request->only(['search', 'status', 'priority', 'source', 'customer_id', 'trashed']),
            'trashedCount' => $trashedCount,
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

        $admin = \App\Models\User::admin();
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
            try {
                Mail::raw($validated['content'], function ($message) use ($ticket) {
                    $message->to($ticket->source_email)
                        ->subject("Re: {$ticket->subject}");
                });
            } catch (\Exception $e) {
                \Log::error("Ticket reply email failed #{$ticket->id}", ['error' => $e->getMessage()]);
            }
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
            ->with('success', 'Zpráva přesunuta do koše.');
    }

    public function restore(int $id)
    {
        $ticket = Ticket::onlyTrashed()->findOrFail($id);
        $ticket->restore();

        return redirect()->route('zpravy.index')
            ->with('success', "Zpráva \"{$ticket->subject}\" obnovena.");
    }

    public function forceDelete(int $id)
    {
        $ticket = Ticket::onlyTrashed()->findOrFail($id);
        $ticket->messages()->delete();
        $ticket->forceDelete();

        return redirect()->route('zpravy.index', ['trashed' => 1])
            ->with('success', 'Zpráva trvale smazána.');
    }

    public function bulkDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        Ticket::whereIn('id', $request->ids)->each(fn ($t) => $t->delete());
        return back()->with('success', count($request->ids) . ' zpráv přesunuto do koše.');
    }

    public function bulkRestore(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        Ticket::onlyTrashed()->whereIn('id', $request->ids)->each(fn ($t) => $t->restore());
        return back()->with('success', count($request->ids) . ' zpráv obnoveno.');
    }

    public function bulkForceDelete(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'integer']);
        $tickets = Ticket::onlyTrashed()->whereIn('id', $request->ids)->get();
        foreach ($tickets as $ticket) {
            $ticket->messages()->delete();
            $ticket->forceDelete();
        }
        return back()->with('success', $tickets->count() . ' zpráv trvale smazáno.');
    }

    public function emptyTrash()
    {
        $count = Ticket::onlyTrashed()->count();
        Ticket::onlyTrashed()->each(function ($ticket) {
            $ticket->messages()->delete();
            $ticket->forceDelete();
        });
        return back()->with('success', "Koš vysypán ($count zpráv trvale smazáno).");
    }
}
