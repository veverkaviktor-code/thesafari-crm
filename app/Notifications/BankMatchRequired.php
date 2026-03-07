<?php

namespace App\Notifications;

use App\Models\BankTransaction;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class BankMatchRequired extends Notification
{
    use Queueable;

    public function __construct(
        private BankTransaction $transaction,
        private string $reason,
        private ?int $suggestedInvoiceId = null,
    ) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $data = [
            'type' => 'bank_match_required',
            'title' => "Platba vyžaduje kontrolu: {$this->transaction->amount} Kč",
            'message' => $this->buildMessage(),
            'bank_transaction_id' => $this->transaction->id,
        ];

        if ($this->suggestedInvoiceId) {
            $data['link'] = "/faktury/{$this->suggestedInvoiceId}";
            $data['invoice_id'] = $this->suggestedInvoiceId;
        } else {
            $data['link'] = '/faktury';
        }

        return $data;
    }

    private function buildMessage(): string
    {
        $from = $this->transaction->counter_account_name
            ?: $this->transaction->counter_account
            ?: 'neznámý';

        $vs = $this->transaction->variable_symbol ?: 'bez VS';

        return "Příchozí platba {$this->transaction->amount} Kč od {$from} (VS: {$vs}) — {$this->reason}";
    }
}
