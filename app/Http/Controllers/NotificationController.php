<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $filter = $request->input('filter', 'all');

        $query = $request->user()->notifications()->latest();

        if ($filter === 'unread') {
            $query->whereNull('read_at');
        }

        $notifications = $query->paginate(25)->withQueryString();

        return Inertia::render('Notifications/Index', [
            'notifications' => $notifications,
            'filter' => $filter,
        ]);
    }

    public function markAsRead(Request $request, string $id)
    {
        $notification = $request->user()->notifications()->findOrFail($id);
        $notification->markAsRead();

        return back();
    }

    public function markAllAsRead(Request $request)
    {
        $request->user()->unreadNotifications->markAsRead();

        return back()->with('success', 'Všechny notifikace označeny jako přečtené.');
    }
}
