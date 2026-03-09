<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SupportController extends Controller
{
    public function show()
    {
        return Inertia::render('Support/Index');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name'  => ['required', 'string', 'max:100'],
            'email'      => ['required', 'email', 'max:255'],
            'phone'      => ['nullable', 'string', 'max:50'],
            'website'    => ['nullable', 'string', 'max:255'],
            'content'    => ['required', 'string', 'max:5000'],
        ]);

        // Auto-match zákazníka podle e-mailu
        $customer = Customer::where('email', $validated['email'])->first();

        Ticket::create([
            'customer_id' => $customer?->id,
            'subject'     => 'Zpráva z formuláře — ' . $validated['first_name'] . ' ' . $validated['last_name'],
            'status'      => 'novy',
            'priority'    => 'normalni',
            'source'      => 'web',
            'source_email' => $validated['email'],
            'first_name'  => $validated['first_name'],
            'last_name'   => $validated['last_name'],
            'phone'       => $validated['phone'],
            'website'     => $validated['website'],
            'content'     => $validated['content'],
        ]);

        return back()->with('flash', [
            'type'    => 'success',
            'message' => 'Vaše zpráva byla úspěšně odeslána. Ozveme se vám co nejdříve.',
        ]);
    }

    // API endpoint pro externí formuláře (neniweb.cz atd.)
    public function apiStore(Request $request)
    {
        $validated = $request->validate([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name'  => ['required', 'string', 'max:100'],
            'email'      => ['required', 'email', 'max:255'],
            'phone'      => ['nullable', 'string', 'max:50'],
            'website'    => ['nullable', 'string', 'max:255'],
            'content'    => ['required', 'string', 'max:5000'],
        ]);

        $customer = Customer::where('email', $validated['email'])->first();

        $ticket = Ticket::create([
            'customer_id' => $customer?->id,
            'subject'     => 'Zpráva z externího formuláře — ' . $validated['first_name'] . ' ' . $validated['last_name'],
            'status'      => 'novy',
            'priority'    => 'normalni',
            'source'      => 'api',
            'source_email' => $validated['email'],
            'first_name'  => $validated['first_name'],
            'last_name'   => $validated['last_name'],
            'phone'       => $validated['phone'],
            'website'     => $validated['website'],
            'content'     => $validated['content'],
        ]);

        return response()->json(['success' => true, 'ticket_id' => $ticket->id], 201);
    }
}
