<?php

namespace App\Notifications;

use App\Models\Hosting;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class HostingExpiring extends Notification
{
    use Queueable;

    public function __construct(public Hosting $hosting, public int $daysLeft) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'hosting_expiring',
            'title' => "Hosting {$this->hosting->name} expiruje za {$this->daysLeft} dní",
            'message' => "Hosting {$this->hosting->name} ({$this->hosting->customer?->name}) expiruje {$this->hosting->expires_at->format('d.m.Y')}.",
            'link' => "/hostingy/{$this->hosting->id}",
            'hosting_id' => $this->hosting->id,
        ];
    }
}
