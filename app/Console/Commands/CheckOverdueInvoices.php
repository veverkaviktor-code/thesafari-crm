<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\User;
use App\Notifications\InvoiceOverdue;
use Illuminate\Console\Command;

class CheckOverdueInvoices extends Command
{
    protected $signature = 'invoices:check-overdue';
    protected $description = 'Mark overdue invoices and notify admin';

    public function handle(): void
    {
        $overdue = Invoice::with('customer')
            ->whereIn('status', ['vystavena', 'odeslana'])
            ->where('due_date', '<', now())
            ->get();

        $admin = User::admin();

        foreach ($overdue as $invoice) {
            $invoice->update(['status' => 'po_splatnosti']);

            if ($admin) {
                $exists = $admin->notifications()
                    ->where('type', InvoiceOverdue::class)
                    ->whereNull('read_at')
                    ->whereRaw("data::jsonb->>'invoice_id' = ?", [(string) $invoice->id])
                    ->exists();

                if (!$exists) {
                    $admin->notify(new InvoiceOverdue($invoice));
                }
            }
        }

        $this->info("Checked {$overdue->count()} overdue invoices.");
    }
}
