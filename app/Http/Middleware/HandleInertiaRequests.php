<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $request->user() ? [
                    'id' => $request->user()->id,
                    'name' => $request->user()->name,
                    'email' => $request->user()->email,
                    'role' => $request->user()->role,
                    'avatar_path' => $request->user()->avatar_path,
                ] : null,
            ],
            'notifications' => fn () => [
                'unread_count' => $request->user()?->unreadNotifications()->count() ?? 0,
                'recent' => $request->user()
                    ? $request->user()->notifications()->latest()->take(5)->get()->map(fn ($n) => [
                        'id' => $n->id,
                        'type' => $n->type,
                        'data' => $n->data,
                        'read_at' => $n->read_at?->toISOString(),
                        'created_at' => $n->created_at->toISOString(),
                    ])
                    : [],
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            'runningTimer' => fn () => $request->user()
                ? \App\Models\TimeEntry::where('user_id', $request->user()->id)
                    ->whereNull('stopped_at')
                    ->with(['order:id,title,customer_id', 'order.customer:id,name'])
                    ->first(['id', 'order_id', 'started_at', 'description', 'hourly_rate'])
                : null,
        ];
    }
}
