<?php

namespace App\Notifications;

use App\Models\Website;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class WebsiteExpiring extends Notification
{
    use Queueable;

    public function __construct(public Website $website, public int $daysLeft) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $label = $this->website->is_registered_by_us ? 'Web (doména + hosting)' : 'Web (hosting)';
        return [
            'type' => 'website_expiring',
            'title' => "{$label} {$this->website->name} expiruje za {$this->daysLeft} dní",
            'message' => "{$label} {$this->website->name} ({$this->website->customer->name}) expiruje {$this->website->hosting_expires_at->format('d.m.Y')}.",
            'link' => "/webove-sluzby/{$this->website->id}",
            'website_id' => $this->website->id,
        ];
    }
}
