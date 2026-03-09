<?php

namespace App\Notifications;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SubscriptionInvoiceCreated extends Notification
{
    use Queueable;

    public function __construct(
        public Invoice $invoice,
        public array $subscriptionNames
    ) {}

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toArray($notifiable): array
    {
        $names = implode(', ', $this->subscriptionNames);
        return [
            'type' => 'subscription_invoice_created',
            'title' => "Faktura za obnovu: {$names}",
            'message' => number_format((float) $this->invoice->total, 0, ',', ' ') . ' Kč — zkontroluj a odešli',
            'link' => "/faktury/{$this->invoice->id}",
            'invoice_id' => $this->invoice->id,
        ];
    }
}
