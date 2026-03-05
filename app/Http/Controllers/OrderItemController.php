<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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

        DB::transaction(function () use ($order, $validated) {
            $order->items()->create($validated);
            $this->recalcPrice($order);
        });

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

        DB::transaction(function () use ($order, $orderItem, $validated) {
            $orderItem->update($validated);
            $this->recalcPrice($order);
        });

        return back()->with('success', 'Polozka upravena.');
    }

    public function destroy(Order $order, OrderItem $orderItem)
    {
        abort_if($orderItem->order_id !== $order->id, 403);

        DB::transaction(function () use ($order, $orderItem) {
            $orderItem->delete();
            $this->recalcPrice($order);
        });

        return back()->with('success', 'Polozka smazana.');
    }

    private function recalcPrice(Order $order): void
    {
        $order->update([
            'price' => $order->items()->sum(DB::raw('quantity * unit_price')),
        ]);
    }
}
