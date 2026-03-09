<?php

namespace App\Notifications;

use App\Models\Ticket;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewTicket extends Notification
{
    use Queueable;

    public function __construct(public Ticket $ticket) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'new_ticket',
            'title' => "Nová zpráva: {$this->ticket->subject}",
            'message' => "Od: " . ($this->ticket->customer?->name ?? $this->ticket->source_email),
            'link' => "/zpravy/{$this->ticket->id}",
            'ticket_id' => $this->ticket->id,
        ];
    }
}
