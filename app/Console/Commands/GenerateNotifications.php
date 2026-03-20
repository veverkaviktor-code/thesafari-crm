<?php

namespace App\Console\Commands;

use App\Models\Estimate;
use App\Models\Invoice;
use App\Models\User;
use App\Models\Website;
use App\Notifications\EstimateInactive;
use App\Notifications\InvoiceOverdue;
use App\Notifications\WebsiteExpiring;
use Illuminate\Console\Command;

class GenerateNotifications extends Command
{
    protected $signature = 'notifications:generate';
    protected $description = 'Generate notifications for overdue invoices and expiring subscriptions';

    public function handle(): int
    {
        $admin = User::admin();
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

        // 2. Expiring websites (within 14 days)
        $expiringWebsites = Website::with('customer')
            ->where('status', 'aktivni')
            ->whereNotNull('hosting_expires_at')
            ->where('hosting_expires_at', '<=', now()->addDays(14))
            ->where('hosting_expires_at', '>=', now()->startOfDay())
            ->get();

        foreach ($expiringWebsites as $website) {
            $exists = $admin->notifications()
                ->where('type', WebsiteExpiring::class)
                ->whereNull('read_at')
                ->whereRaw("data::jsonb->>'website_id' = ?", [(string) $website->id])
                ->exists();

            if (!$exists) {
                $daysLeft = (int) now()->diffInDays($website->hosting_expires_at, false);
                $admin->notify(new WebsiteExpiring($website, max(0, $daysLeft)));
                $generated++;
            }
        }

        // 3. Expired websites (past due)
        $expiredWebsites = Website::with('customer')
            ->where('status', 'aktivni')
            ->whereNotNull('hosting_expires_at')
            ->where('hosting_expires_at', '<', now()->startOfDay())
            ->get();

        foreach ($expiredWebsites as $website) {
            $exists = $admin->notifications()
                ->where('type', WebsiteExpiring::class)
                ->whereNull('read_at')
                ->whereRaw("data::jsonb->>'website_id' = ?", [(string) $website->id])
                ->exists();

            if (!$exists) {
                $daysLeft = (int) now()->diffInDays($website->hosting_expires_at, false);
                $admin->notify(new WebsiteExpiring($website, $daysLeft));
                $generated++;
            }
        }

        // 4. Inactive estimates (no activity for 7+ days, draft/sent only)
        $inactiveEstimates = Estimate::with('customer')
            ->whereIn('status', ['draft', 'sent'])
            ->where('updated_at', '<', now()->subDays(7))
            ->get();

        foreach ($inactiveEstimates as $estimate) {
            $exists = $admin->notifications()
                ->where('type', EstimateInactive::class)
                ->whereNull('read_at')
                ->whereRaw("data::jsonb->>'estimate_id' = ?", [(string) $estimate->id])
                ->exists();

            if (!$exists) {
                $days = (int) now()->diffInDays($estimate->updated_at);
                $admin->notify(new EstimateInactive($estimate, $days));
                $generated++;
            }
        }

        $this->info("Generated {$generated} notifications.");
        return 0;
    }
}
