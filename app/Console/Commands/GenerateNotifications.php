<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\Subscription;
use App\Models\User;
use App\Notifications\InvoiceOverdue;
use App\Notifications\SubscriptionExpiring;
use Illuminate\Console\Command;

class GenerateNotifications extends Command
{
    protected $signature = 'notifications:generate';
    protected $description = 'Generate notifications for overdue invoices and expiring subscriptions';

    public function handle(): int
    {
        $admin = User::first();
        if (!$admin) {
            $this->error('No admin user found.');
            return 1;
        }

        $generated = 0;

        // 1. Overdue invoices
        $overdueInvoices = Invoice::with('customer')
            ->whereIn('status', ['vystavena', 'odeslana'])
            ->where('due_date', '<', now()->startOfDay())
            ->get();

        foreach ($overdueInvoices as $invoice) {
            $exists = $admin->notifications()
                ->where('type', InvoiceOverdue::class)
                ->whereNull('read_at')
                ->whereRaw("data::jsonb->>'invoice_id' = ?", [(string) $invoice->id])
                ->exists();

            if (!$exists) {
                $admin->notify(new InvoiceOverdue($invoice));
                $generated++;
            }
        }

        // 2. Expiring subscriptions (within 14 days)
        $expiringSubscriptions = Subscription::with('customer')
            ->where('status', 'aktivni')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now()->addDays(14))
            ->where('expires_at', '>=', now()->startOfDay())
            ->get();

        foreach ($expiringSubscriptions as $sub) {
            $exists = $admin->notifications()
                ->where('type', SubscriptionExpiring::class)
                ->whereNull('read_at')
                ->whereRaw("data::jsonb->>'subscription_id' = ?", [(string) $sub->id])
                ->exists();

            if (!$exists) {
                $daysLeft = (int) now()->diffInDays($sub->expires_at, false);
                $admin->notify(new SubscriptionExpiring($sub, max(0, $daysLeft)));
                $generated++;
            }
        }

        // 3. Expired subscriptions (past due)
        $expiredSubscriptions = Subscription::with('customer')
            ->where('status', 'aktivni')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now()->startOfDay())
            ->get();

        foreach ($expiredSubscriptions as $sub) {
            $exists = $admin->notifications()
                ->where('type', SubscriptionExpiring::class)
                ->whereNull('read_at')
                ->whereRaw("data::jsonb->>'subscription_id' = ?", [(string) $sub->id])
                ->exists();

            if (!$exists) {
                $daysLeft = (int) now()->diffInDays($sub->expires_at, false);
                $admin->notify(new SubscriptionExpiring($sub, $daysLeft));
                $generated++;
            }
        }

        $this->info("Generated {$generated} notifications.");
        return 0;
    }
}
