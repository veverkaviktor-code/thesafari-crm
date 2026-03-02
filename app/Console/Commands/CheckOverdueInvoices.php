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
        $overdue = Invoice::whereIn('status', ['vystavena', 'odeslana'])
            ->where('due_date', '<', now())
            ->get();

        $admin = User::where('role', 'admin')->first();

        foreach ($overdue as $invoice) {
            $invoice->update(['status' => 'po_splatnosti']);

            if ($admin) {
                $invoice->load('customer');
                $admin->notify(new InvoiceOverdue($invoice));
            }
        }

        $this->info("Checked {$overdue->count()} overdue invoices.");
    }
}
