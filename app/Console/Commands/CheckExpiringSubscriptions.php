<?php

namespace App\Console\Commands;

use App\Models\Subscription;
use App\Models\User;
use App\Notifications\SubscriptionExpiring;
use Illuminate\Console\Command;

class CheckExpiringSubscriptions extends Command
{
    protected $signature = 'subscriptions:check-expiring';
    protected $description = 'Notify admin about expiring subscriptions (30/14/7 days)';

    public function handle(): void
    {
        $admin = User::where('role', 'admin')->first();
        if (!$admin) {
            $this->warn('No admin user found.');
            return;
        }

        $notified = 0;

        foreach ([30, 14, 7] as $days) {
            $expiring = Subscription::where('status', 'aktivni')
                ->whereDate('expires_at', now()->addDays($days)->toDateString())
                ->where(function ($q) use ($days) {
                    // Avoid duplicate notifications
                    $q->whereNull('customer_notified_at')
                      ->orWhere('customer_notified_at', '<', now()->subDays($days === 30 ? 20 : ($days === 14 ? 10 : 5)));
                })
                ->get();

            foreach ($expiring as $subscription) {
                $subscription->load('customer');
                $admin->notify(new SubscriptionExpiring($subscription, $days));

                $subscription->update(['customer_notified_at' => now()]);
                $notified++;
            }
        }

        // Note: Status changes are managed manually by the user — no automatic status updates.

        $this->info("Notified {$notified} expiring subscriptions.");
    }
}
