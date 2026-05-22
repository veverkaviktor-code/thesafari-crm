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
        $invoice = $this->invoice;
        $customerName = $invoice->customer?->name ?? 'neznámý klient';
        $total = number_format((float) $invoice->total, 0, ',', ' ');

        return [
            'type' => 'payment_received',
            'title' => "Platba přijata: {$total} Kč",
            'message' => "Faktura {$invoice->invoice_number} ({$customerName}) byla zaplacena.",
            'link' => "/faktury/{$invoice->id}",
            'invoice_id' => $invoice->id,
        ];
    }
}
