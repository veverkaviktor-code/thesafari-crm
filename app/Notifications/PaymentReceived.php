<?php

namespace App\Notifications;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PaymentReceived extends Notification
{
    use Queueable;

    public function __construct(public Invoice $invoice) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'payment_received',
            'title' => "Platba přijata: {$this->invoice->total} Kč",
            'message' => "Faktura {$this->invoice->invoice_number} ({$this->invoice->customer->name}) byla zaplacena.",
            'link' => "/faktury/{$this->invoice->id}",
            'invoice_id' => $this->invoice->id,
        ];
    }
}
