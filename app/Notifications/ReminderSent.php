<?php

namespace App\Notifications;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ReminderSent extends Notification
{
    use Queueable;

    public function __construct(
        public Invoice $invoice,
        public int $reminderNumber,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $label = match ($this->reminderNumber) {
            1 => '1. upomínka',
            2 => '2. upomínka',
            3 => 'Poslední upomínka',
            default => "Upomínka č. {$this->reminderNumber}",
        };

        return [
            'type' => 'reminder_sent',
            'title' => "{$label} odeslána — {$this->invoice->invoice_number}",
            'message' => "Upomínka odeslána na {$this->invoice->customer->email} za fakturu {$this->invoice->total} Kč.",
            'link' => "/faktury/{$this->invoice->id}",
            'invoice_id' => $this->invoice->id,
        ];
    }
}
