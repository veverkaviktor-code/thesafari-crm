<?php

namespace App\Notifications;

use App\Models\Subscription;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SubscriptionExpiring extends Notification
{
    use Queueable;

    public function __construct(public Subscription $subscription, public int $daysLeft) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $typeLabel = $this->subscription->type === 'domena' ? 'Doména' : 'Hosting';
        return [
            'type' => 'subscription_expiring',
            'title' => "{$typeLabel} {$this->subscription->name} expiruje za {$this->daysLeft} dní",
            'message' => "{$typeLabel} {$this->subscription->name} ({$this->subscription->customer->name}) expiruje {$this->subscription->expires_at->format('d.m.Y')}.",
            'link' => "/neniweb/{$this->subscription->id}",
            'subscription_id' => $this->subscription->id,
        ];
    }
}
