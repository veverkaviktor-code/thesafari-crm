<?php

namespace App\Console\Commands;

use App\Models\Domain;
use App\Models\User;
use App\Notifications\DomainExpiring;
use Illuminate\Console\Command;

class CheckExpiringDomains extends Command
{
    protected $signature = 'domains:check-expiring';
    protected $description = 'Notify admin about expiring domains (30/14/7 days)';

    public function handle(): void
    {
        $admin = User::admin();
        if (!$admin) {
            $this->warn('No admin user found.');
            return;
        }

        $notified = 0;

        foreach ([30, 14, 7] as $days) {
            $expiring = Domain::where('status', 'aktivni')
                ->where('is_registered_by_us', true)
                ->whereBetween('expires_at', [
                    now()->addDays($days)->startOfDay(),
                    now()->addDays($days)->endOfDay(),
                ])
                ->with('customer')
                ->get();

            foreach ($expiring as $domain) {
                $admin->notify(new DomainExpiring($domain, $days));
                $notified++;
            }
        }

        $this->info("Notified {$notified} expiring domains.");
    }
}
