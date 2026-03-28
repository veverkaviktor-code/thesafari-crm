<?php

namespace App\Console\Commands;

use App\Models\Hosting;
use App\Models\User;
use App\Notifications\HostingExpiring;
use Illuminate\Console\Command;

class CheckExpiringHostings extends Command
{
    protected $signature = 'hostings:check-expiring';
    protected $description = 'Notify admin about expiring hostings (30/14/7 days)';

    public function handle(): void
    {
        $admin = User::admin();
        if (!$admin) {
            $this->warn('No admin user found.');
            return;
        }

        $notified = 0;

        foreach ([30, 14, 7] as $days) {
            $expiring = Hosting::where('status', 'aktivni')
                ->whereBetween('expires_at', [
                    now()->addDays($days)->startOfDay(),
                    now()->addDays($days)->endOfDay(),
                ])
                ->where(function ($q) use ($days) {
                    $q->whereNull('last_expiry_notified_at')
                      ->orWhere('last_expiry_notified_at', '<', now()->subDays($days === 30 ? 20 : ($days === 14 ? 10 : 5)));
                })
                ->with('customer')
                ->get();

            foreach ($expiring as $hosting) {
                $admin->notify(new HostingExpiring($hosting, $days));

                $hosting->update(['last_expiry_notified_at' => now()]);
                $notified++;
            }
        }

        $this->info("Notified {$notified} expiring hostings.");
    }
}
