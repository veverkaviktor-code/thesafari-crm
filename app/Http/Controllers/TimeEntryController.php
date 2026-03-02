<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\TimeEntry;
use Illuminate\Http\Request;

class TimeEntryController extends Controller
{
    public function start(Request $request, Order $order)
    {
        $running = TimeEntry::where('user_id', $request->user()->id)
            ->whereNull('stopped_at')
            ->first();

        if ($running) {
            $running->update([
                'stopped_at' => now(),
                'duration_minutes' => (int) now()->diffInMinutes($running->started_at),
            ]);
        }

        TimeEntry::create([
            'order_id' => $order->id,
            'user_id' => $request->user()->id,
            'started_at' => now(),
            'description' => $request->input('description'),
        ]);

        return back()->with('success', 'Timer spusten.');
    }

    public function stop(Request $request, TimeEntry $timeEntry)
    {
        if (! $timeEntry->isRunning()) {
            return back()->with('error', 'Timer uz bezi.');
        }

        $timeEntry->update([
            'stopped_at' => now(),
            'duration_minutes' => (int) now()->diffInMinutes($timeEntry->started_at),
        ]);

        return back()->with('success', 'Timer zastaven.');
    }

    public function destroy(TimeEntry $timeEntry)
    {
        $timeEntry->delete();

        return back()->with('success', 'Casovy zaznam smazan.');
    }
}
