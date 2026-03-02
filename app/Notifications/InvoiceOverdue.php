<?php

namespace App\Notifications;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class InvoiceOverdue extends Notification
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
            'type' => 'invoice_overdue',
            'title' => "Faktura {$this->invoice->invoice_number} po splatnosti",
            'message' => "Faktura pro {$this->invoice->customer->name} ({$this->invoice->total} Kč) je po splatnosti od {$this->invoice->due_date->format('d.m.Y')}.",
            'link' => "/faktury/{$this->invoice->id}",
            'invoice_id' => $this->invoice->id,
        ];
    }
}
