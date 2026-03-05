<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;

class OrderItemController extends Controller
{
    public function store(Request $request, Order $order)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
            'quantity' => 'required|numeric|min:0.01',
            'unit' => 'required|string|max:20',
            'unit_price' => 'required|numeric|min:0',
        ]);

        $order->items()->create($validated);
        $order->update(['price' => $order->items()->sum(\DB::raw('quantity * unit_price'))]);

        return back()->with('success', 'Polozka pridana.');
    }

    public function update(Request $request, Order $order, OrderItem $orderItem)
    {
        abort_if($orderItem->order_id !== $order->id, 403);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string|max:500',
            'quantity' => 'required|numeric|min:0.01',
            'unit' => 'required|string|max:20',
            'unit_price' => 'required|numeric|min:0',
        ]);

        $orderItem->update($validated);
        $order->update(['price' => $order->items()->sum(\DB::raw('quantity * unit_price'))]);

        return back()->with('success', 'Polozka upravena.');
    }

    public function destroy(Order $order, OrderItem $orderItem)
    {
        abort_if($orderItem->order_id !== $order->id, 403);

        $orderItem->delete();
        $order->update(['price' => $order->items()->sum(\DB::raw('quantity * unit_price'))]);

        return back()->with('success', 'Polozka smazana.');
    }
}
