<?php

namespace App\Notifications;

use App\Models\Domain;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class DomainExpiring extends Notification
{
    use Queueable;

    public function __construct(public Domain $domain, public int $daysLeft) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'domain_expiring',
            'title' => "Doména {$this->domain->name} expiruje za {$this->daysLeft} dní",
            'message' => "Doména {$this->domain->name} ({$this->domain->customer?->name}) expiruje {$this->domain->expires_at->format('d.m.Y')}.",
            'link' => "/domeny/{$this->domain->id}",
            'domain_id' => $this->domain->id,
        ];
    }
}
