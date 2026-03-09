<?php

namespace App\Notifications;

use App\Models\Estimate;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class EstimateInactive extends Notification
{
    use Queueable;

    public function __construct(
        public Estimate $estimate,
        public int $daysSinceActivity,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'estimate_inactive',
            'title' => "Kalkulace \"{$this->estimate->name}\" bez aktivity {$this->daysSinceActivity} dní",
            'message' => $this->estimate->customer
                ? "Zákazník: {$this->estimate->customer->name}"
                : 'Bez zákazníka',
            'link' => "/kalkulator/{$this->estimate->id}",
            'estimate_id' => $this->estimate->id,
        ];
    }
}
