<?php

namespace App\Console\Commands;

use App\Models\Estimate;
use App\Models\User;
use App\Notifications\EstimateInactive;
use Illuminate\Console\Command;

class GenerateNotifications extends Command
{
    protected $signature = 'notifications:generate';
    protected $description = 'Generate notifications for overdue invoices and expiring websites';

    public function handle(): int
    {
        $admin = User::admin();
        if (!$admin) {
            $this->error('No admin user found.');
            return 1;
        }

        $generated = 0;

        // Note: InvoiceOverdue notifications are handled exclusively by CheckOverdueInvoices (08:00).
        // Note: WebsiteExpiring notifications are handled exclusively by CheckExpiringWebsites (08:30).
        // Generating them here too would cause duplicates — both removed from this command.

        // Inactive estimates (no activity for 7+ days, draft/sent only)
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
