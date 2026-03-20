<?php

namespace App\Console\Commands;

use App\Models\User;
use App\Models\Website;
use App\Notifications\WebsiteExpiring;
use Illuminate\Console\Command;

class CheckExpiringWebsites extends Command
{
    protected $signature = 'websites:check-expiring';
    protected $description = 'Notify admin about expiring websites (30/14/7 days)';

    public function handle(): void
    {
        $admin = User::where('role', 'admin')->first();
        if (!$admin) {
            $this->warn('No admin user found.');
            return;
        }

        $notified = 0;

        foreach ([30, 14, 7] as $days) {
            $expiring = Website::where('status', 'aktivni')
                ->whereDate('hosting_expires_at', now()->addDays($days)->toDateString())
                ->where(function ($q) use ($days) {
                    // Avoid duplicate notifications
                    $q->whereNull('last_expiry_notified_at')
                      ->orWhere('last_expiry_notified_at', '<', now()->subDays($days === 30 ? 20 : ($days === 14 ? 10 : 5)));
                })
                ->with('customer')
                ->get();

            foreach ($expiring as $website) {
                $admin->notify(new WebsiteExpiring($website, $days));

                $website->update(['last_expiry_notified_at' => now()]);
                $notified++;
            }
        }

        // Note: Status changes are managed manually by the user — no automatic status updates.

        $this->info("Notified {$notified} expiring websites.");
    }
}
