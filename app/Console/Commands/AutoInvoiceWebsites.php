<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\User;
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
            foreach ($siteGroup as $website) {
                $price = (float) $website->sell_yearly;
                if ($price <= 0) {
                    Log::warning("AutoInvoice: website {$website->id} ({$website->name}) has zero price, skipping.");
                    continue;
                }

                $typeLabel = match ($website->type) {
                    'domena' => 'Obnova domény',
                    'hosting' => 'Hosting',
                    'sluzba' => 'Služba',
                    default => 'Služba',
                };

                $items[] = [
                    'website' => $website,
                    'description' => "{$typeLabel} {$website->name} (1 rok)",
                    'quantity' => 1,
                    'unit' => 'rok',
                    'unit_price' => $price,
                    'total_price' => $price,
                ];
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

            DB::transaction(function () use ($customer, $items, $total, $earliestExpiry, $admin) {
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

                foreach ($items as $i => $item) {
                    $invoice->items()->create([
                        'description' => $item['description'],
                        'quantity' => $item['quantity'],
                        'unit' => $item['unit'],
                        'unit_price' => $item['unit_price'],
                        'total_price' => $item['total_price'],
                        'sort_order' => $i,
                    ]);

                    $invoice->websites()->attach($item['website']->id, [
                        'invoice_type' => 'hosting',
                    ]);
                }

                if ($admin) {
                    $names = collect($items)->pluck('website.name')->unique()->toArray();
                    $admin->notify(new WebsiteInvoiceCreated($invoice, $names));
                }
            });

            $created++;
        }

        $verb = $dryRun ? 'Would create' : 'Created';
        $this->info("{$verb} {$created} invoices.");

        return 0;
    }
}
