<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderCost;
use Illuminate\Http\Request;

class OrderCostController extends Controller
{
    public function store(Request $request, Order $order)
    {
        $validated = $request->validate([
            'title'  => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
        ]);

        $order->costs()->create($validated);

        return back()->with('success', 'Náklad přidán.');
    }

    public function update(Request $request, Order $order, OrderCost $orderCost)
    {
        abort_if($orderCost->order_id !== $order->id, 403);

        $validated = $request->validate([
            'title'  => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
        ]);

        $orderCost->update($validated);

        return back()->with('success', 'Náklad upraven.');
    }

    public function destroy(Order $order, OrderCost $orderCost)
    {
        abort_if($orderCost->order_id !== $order->id, 403);

        $orderCost->delete();

        return back()->with('success', 'Náklad smazán.');
    }
}
