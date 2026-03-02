<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ticket;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TicketApiController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'subject' => 'required|string|max:255',
            'from_email' => 'required|email',
            'content' => 'required|string',
            'priority' => 'sometimes|in:low,medium,high',
        ]);

        $customerId = Ticket::matchCustomerByEmail($validated['from_email']);

        $ticket = Ticket::create([
            'customer_id' => $customerId,
            'subject' => $validated['subject'],
            'status' => 'novy',
            'priority' => $validated['priority'] ?? 'medium',
            'source_email' => $validated['from_email'],
        ]);

        $ticket->messages()->create([
            'direction' => 'inbound',
            'from_email' => $validated['from_email'],
            'content' => $validated['content'],
        ]);

        return response()->json([
            'id' => $ticket->id,
            'customer_matched' => $customerId !== null,
        ], 201);
    }
}
