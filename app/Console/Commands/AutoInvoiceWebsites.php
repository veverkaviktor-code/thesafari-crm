<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\User;
use App\Models\VpsServer;
use App\Models\Website;
use App\Notifications\WebsiteInvoiceCreated;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoInvoiceWebsites extends Command
{
    protected $signature = 'websites:auto-invoice {--dry-run : Only show what would be invoiced}';
    protected $description = 'Create invoices for websites with hosting expiring within 30 days';

    public function handle(): int
    {
        $lock = \Illuminate\Support\Facades\Cache::lock('auto-invoice-websites', 300);
        if (!$lock->get()) {
            $this->warn('Příkaz již běží.');
            return 0;
        }

        try {
            return $this->doExecute();
        } finally {
            $lock->release();
        }
    }

    private function doExecute(): int
    {
        $dryRun = $this->option('dry-run');
        $admin = User::admin();

        $websites = Website::where('status', 'aktivni')
            ->whereNull('alias_of_id') // Skip aliases — covered by main website
            ->where('auto_renew', true)
            ->where('auto_invoice', true)
            ->where('is_free', false)
            ->whereNotNull('hosting_expires_at')
            ->where('hosting_expires_at', '>', now())
            ->where('hosting_expires_at', '<=', now()->addDays(30))
            ->where('sell_yearly', '>', 0)
            ->whereDoesntHave('invoices', function ($q) {
                $q->whereIn('status', ['vystavena', 'odeslana']);
            })
            ->with('customer')
            ->get();

        if ($websites->isEmpty()) {
            $this->info('No websites to invoice.');
            return 0;
        }

        // Group by customer_id — one invoice per customer with all services
        $groups = $websites->groupBy('customer_id');

        $created = 0;

        foreach ($groups as $key => $siteGroup) {
            $customer = $siteGroup->first()->customer;

            if (!$customer) {
                Log::warning("AutoInvoice: website {$siteGroup->first()->id} has no customer, skipping.");
                continue;
            }

            $items = [];
            $aliasWebsiteIds = [];
            foreach ($siteGroup as $website) {
                $hostingPrice = (float) $website->hosting_sell_yearly;
                $domainPrice  = (float) $website->domain_sell_yearly;

                if ($hostingPrice <= 0 && $domainPrice <= 0) {
                    Log::warning("AutoInvoice: website {$website->id} ({$website->name}) has zero price, skipping.");
                    continue;
                }

                // Build period string from hosting expiration (same as createInvoice)
                $periodStr = '1 rok';
                if ($website->hosting_expires_at) {
                    $expiry = \Carbon\Carbon::parse($website->hosting_expires_at);
                    $periodStr = $expiry->format('j. n. Y') . ' – ' . $expiry->copy()->addYear()->format('j. n. Y');
                }

                // Hosting item
                if ($hostingPrice > 0) {
                    $items[] = [
                        'website'     => $website,
                        'description' => "Hosting {$website->name} ({$periodStr})",
                        'quantity'    => 1,
                        'unit'        => 'rok',
                        'unit_price'  => $hostingPrice,
                        'total_price' => $hostingPrice,
                    ];
                }

                // Domain item (only if registered by us)
                if ($domainPrice > 0 && $website->is_registered_by_us) {
                    $items[] = [
                        'website'     => $website,
                        'description' => "Doména {$website->name} ({$periodStr})",
                        'quantity'    => 1,
                        'unit'        => 'rok',
                        'unit_price'  => $domainPrice,
                        'total_price' => $domainPrice,
                    ];
                }

                // Alias domains — add their domain prices as separate line items
                $aliases = $website->aliases()
                    ->whereNull('deleted_at')
                    ->where('is_registered_by_us', true)
                    ->where('domain_sell_yearly', '>', 0)
                    ->get();

                foreach ($aliases as $alias) {
                    // Alias uses its own domain expiration for period string
                    $aliasPeriod = $periodStr; // fallback to parent period
                    if ($alias->domain_expires_at) {
                        $aliasExpiry = \Carbon\Carbon::parse($alias->domain_expires_at);
                        $aliasPeriod = $aliasExpiry->format('j. n. Y') . ' – ' . $aliasExpiry->copy()->addYear()->format('j. n. Y');
                    }

                    $items[] = [
                        'website'     => $alias,
                        'description' => "Doména {$alias->name} ({$aliasPeriod})",
                        'quantity'    => 1,
                        'unit'        => 'rok',
                        'unit_price'  => (float) $alias->domain_sell_yearly,
                        'total_price' => (float) $alias->domain_sell_yearly,
                    ];
                    $aliasWebsiteIds[] = $alias->id;
                }
            }

            if (empty($items)) {
                continue;
            }

            $total = collect($items)->sum('total_price');
            $earliestExpiry = $siteGroup->min('hosting_expires_at');

            if ($dryRun) {
                $serviceNames = collect($items)->pluck('description')->implode(', ');
                $this->line("  {$customer->name} — {$serviceNames} — " . number_format($total, 0) . " Kč (splatnost {$earliestExpiry->format('d.m.Y')})");
                $created++;
                continue;
            }

            DB::transaction(function () use ($customer, $items, $total, $earliestExpiry, $admin, $aliasWebsiteIds) {
                $invoiceNumber = Invoice::getNextInvoiceNumber('6');

                $invoice = Invoice::create([
                    'customer_id' => $customer->id,
                    'invoice_number' => $invoiceNumber,
                    'variable_symbol' => $invoiceNumber,
                    'issue_date' => now()->toDateString(),
                    'due_date' => $earliestExpiry->toDateString(),
                    'status' => 'vystavena',
                    'payment_method' => 'banka',
                    'total' => $total,
                    'notes' => 'Automaticky vygenerovaná faktura za obnovu služeb.',
                ]);

                $attachedWebsiteIds = [];
                foreach ($items as $i => $item) {
                    $invoice->items()->create([
                        'description' => $item['description'],
                        'quantity'    => $item['quantity'],
                        'unit'        => $item['unit'],
                        'unit_price'  => $item['unit_price'],
                        'total_price' => $item['total_price'],
                        'sort_order'  => $i,
                    ]);

                    $websiteId = $item['website']->id;
                    if (!in_array($websiteId, $attachedWebsiteIds, true)) {
                        $invoice->websites()->attach($websiteId, [
                            'invoice_type' => 'hosting',
                            'created_at'   => now(),
                        ]);
                        $attachedWebsiteIds[] = $websiteId;
                    }
                }

                if ($admin) {
                    $names = collect($items)->pluck('website.name')->unique()->toArray();
                    $admin->notify(new WebsiteInvoiceCreated($invoice, $names));
                }
            });

            $created++;
        }

        // === VPS Server auto-invoicing ===
        $vpsServers = VpsServer::where('status', 'aktivni')
            ->where('auto_invoice', true)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>', now())
            ->where('expires_at', '<=', now()->addDays(30))
            ->where('price_yearly', '>', 0)
            ->whereNotNull('customer_id')
            ->with('customer')
            ->get();

        foreach ($vpsServers as $vps) {
            if (!$vps->customer) {
                Log::warning("AutoInvoice VPS: {$vps->name} has no customer, skipping.");
                continue;
            }

            // S1: Check no open invoice exists for this VPS (robustní FK check místo LIKE notes)
            $hasOpenInvoice = Invoice::where('vps_server_id', $vps->id)
                ->whereIn('status', ['vystavena', 'odeslana'])
                ->exists();

            if ($hasOpenInvoice) {
                continue;
            }

            $expiry = \Carbon\Carbon::parse($vps->expires_at);
            $periodStr = $expiry->format('j. n. Y') . ' – ' . $expiry->copy()->addYear()->format('j. n. Y');
            $price = (float) $vps->price_yearly;

            if ($dryRun) {
                $this->line("  VPS {$vps->name} — {$vps->customer->name} — " . number_format($price, 0) . " Kč ({$periodStr})");
                $created++;
                continue;
            }

            DB::transaction(function () use ($vps, $price, $periodStr, $expiry, $admin) {
                $invoiceNumber = Invoice::getNextInvoiceNumber('6');

                $invoice = Invoice::create([
                    'customer_id'    => $vps->customer_id,
                    'vps_server_id'  => $vps->id, // S1: FK pro robustní open invoice check a processPayment
                    'invoice_number' => $invoiceNumber,
                    'variable_symbol' => $invoiceNumber,
                    'issue_date'     => now()->toDateString(),
                    'due_date'       => $expiry->toDateString(),
                    'status'         => 'vystavena',
                    'payment_method' => 'banka',
                    'total'          => $price,
                    'notes'          => "Automaticky vygenerovaná faktura za VPS {$vps->name}.",
                ]);

                $invoice->items()->create([
                    'description' => "VPS server {$vps->name} ({$periodStr})",
                    'quantity' => 1,
                    'unit' => 'rok',
                    'unit_price' => $price,
                    'total_price' => $price,
                    'sort_order' => 0,
                ]);

                if ($admin) {
                    $admin->notify(new WebsiteInvoiceCreated($invoice, [$vps->name]));
                }
            });

            $created++;
        }

        $verb = $dryRun ? 'Would create' : 'Created';
        $this->info("{$verb} {$created} invoices.");

        return 0;
    }
}
