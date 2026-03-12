<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\TimeEntry;
use Illuminate\Http\Request;

class TimeEntryController extends Controller
{
    public function store(Request $request, Order $order)
    {
        $request->validate([
            'description' => 'nullable|string|max:500',
            'hourly_rate'  => 'nullable|numeric|min:0',
        ]);

        $running = TimeEntry::where('user_id', $request->user()->id)
            ->whereNull('stopped_at')
            ->first();

        if ($running) {
            $running->update([
                'stopped_at'       => now(),
                'duration_minutes' => (int) ceil(abs(now()->diffInSeconds($running->started_at)) / 60),
            ]);
        }

        TimeEntry::create([
            'order_id'    => $order->id,
            'user_id'     => $request->user()->id,
            'started_at'  => now(),
            'description' => $request->input('description'),
            'hourly_rate' => $request->input('hourly_rate'),
        ]);

        return back()->with('success', 'Timer spuštěn.');
    }

    public function update(Request $request, Order $order, TimeEntry $timeEntry)
    {
        abort_if($timeEntry->order_id !== $order->id, 403);
        abort_if($timeEntry->user_id !== $request->user()->id, 403);

        $validated = $request->validate([
            'description'      => 'nullable|string|max:500',
            'hourly_rate'      => 'nullable|numeric|min:0',
            'duration_minutes' => 'nullable|integer|min:0',
        ]);

        $timeEntry->update($validated);

        return back()->with('success', 'Záznam upraven.');
    }

    public function pause(Request $request, Order $order, TimeEntry $timeEntry)
    {
        abort_if($timeEntry->order_id !== $order->id, 403);
        abort_if($timeEntry->user_id !== $request->user()->id, 403);

        if (! $timeEntry->isRunning() || $timeEntry->isPaused()) {
            return back()->with('error', 'Timer nelze pozastavit.');
        }

        $timeEntry->update(['paused_at' => now()]);

        return back()->with('success', 'Timer pozastaven.');
    }

    public function resume(Request $request, Order $order, TimeEntry $timeEntry)
    {
        abort_if($timeEntry->order_id !== $order->id, 403);
        abort_if($timeEntry->user_id !== $request->user()->id, 403);

        if (! $timeEntry->isPaused()) {
            return back()->with('error', 'Timer není pozastaven.');
        }

        $pausedSeconds = (int) abs(now()->diffInSeconds($timeEntry->paused_at));

        $timeEntry->update([
            'paused_at' => null,
            'total_paused_seconds' => ($timeEntry->total_paused_seconds ?? 0) + $pausedSeconds,
        ]);

        return back()->with('success', 'Timer obnoven.');
    }

    public function stop(Request $request, Order $order, TimeEntry $timeEntry)
    {
        abort_if($timeEntry->order_id !== $order->id, 403);
        abort_if($timeEntry->user_id !== $request->user()->id, 403);

        if (! $timeEntry->isRunning()) {
            return back()->with('error', 'Timer již zastaven.');
        }

        // If paused, accumulate remaining pause time
        $totalPaused = $timeEntry->total_paused_seconds ?? 0;
        if ($timeEntry->paused_at) {
            $totalPaused += (int) abs(now()->diffInSeconds($timeEntry->paused_at));
        }

        $totalSeconds = (int) abs(now()->diffInSeconds($timeEntry->started_at));
        $effectiveSeconds = max(0, $totalSeconds - $totalPaused);

        $timeEntry->update([
            'stopped_at'           => now(),
            'paused_at'            => null,
            'total_paused_seconds' => $totalPaused,
            'duration_minutes'     => (int) ceil($effectiveSeconds / 60),
        ]);

        return back()->with('success', 'Timer zastaven.');
    }

    public function destroy(Request $request, Order $order, TimeEntry $timeEntry)
    {
        abort_if($timeEntry->order_id !== $order->id, 403);
        abort_if($timeEntry->user_id !== $request->user()->id, 403);

        $timeEntry->delete();

        return back()->with('success', 'Časový záznam smazán.');
    }
}
