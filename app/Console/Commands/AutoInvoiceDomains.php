<?php

namespace App\Console\Commands;

use App\Models\Domain;
use App\Models\Invoice;
use App\Models\User;
use App\Notifications\WebsiteInvoiceCreated;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoInvoiceDomains extends Command
{
    protected $signature = 'domains:auto-invoice {--dry-run : Only show what would be invoiced}';
    protected $description = 'Create invoices for standalone domains expiring within 30 days';

    public function handle(): int
    {
        $lock = \Illuminate\Support\Facades\Cache::lock('auto-invoice-domains', 300);
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

        // Only standalone domains (not linked to a hosting — those are invoiced via hostings:auto-invoice)
        $domains = Domain::whereNull('hosting_id')
            ->where('status', 'aktivni')
            ->where('auto_invoice', true)
            ->where('is_registered_by_us', true)
            ->where('sell_yearly', '>', 0)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>', now())
            ->where('expires_at', '<=', now()->addDays(30))
            ->whereDoesntHave('invoices', function ($q) {
                $q->whereIn('status', ['vystavena', 'odeslana']);
            })
            ->with('customer')
            ->get();

        if ($domains->isEmpty()) {
            $this->info('No standalone domains to invoice.');
            return 0;
        }

        // Group by customer_id — one invoice per customer
        $groups = $domains->groupBy('customer_id');

        $created = 0;

        foreach ($groups as $key => $domainGroup) {
            $customer = $domainGroup->first()->customer;

            if (!$customer) {
                Log::warning("AutoInvoiceDomains: domain {$domainGroup->first()->id} has no customer, skipping.");
                continue;
            }

            $items = [];
            foreach ($domainGroup as $domain) {
                $price = (float) $domain->sell_yearly;
                if ($price <= 0) continue;

                $periodStr = '1 rok';
                if ($domain->expires_at) {
                    $expiry = \Carbon\Carbon::parse($domain->expires_at);
                    $periodStr = $expiry->format('j. n. Y') . ' – ' . $expiry->copy()->addYear()->format('j. n. Y');
                }

                $items[] = [
                    'domain'      => $domain,
                    'description' => "Doména {$domain->name} ({$periodStr})",
                    'quantity'    => 1,
                    'unit'        => 'rok',
                    'unit_price'  => $price,
                    'total_price' => $price,
                ];
            }

            if (empty($items)) continue;

            $total = collect($items)->sum('total_price');
            $earliestExpiry = $domainGroup->min('expires_at');

            if ($dryRun) {
                $serviceNames = collect($items)->pluck('description')->implode(', ');
                $this->line("  {$customer->name} — {$serviceNames} — " . number_format($total, 0) . " Kč");
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
                    'due_date' => $earliestExpiry->greaterThan(now()->addDays(14))
                        ? $earliestExpiry->toDateString()
                        : now()->addDays(14)->toDateString(),
                    'status' => 'vystavena',
                    'payment_method' => 'banka',
                    'total' => $total,
                    'notes' => 'Automaticky vygenerovaná faktura za obnovu domén.',
                ]);

                foreach ($items as $i => $item) {
                    $invoice->items()->create([
                        'description' => $item['description'],
                        'quantity'    => $item['quantity'],
                        'unit'        => $item['unit'],
                        'unit_price'  => $item['unit_price'],
                        'total_price' => $item['total_price'],
                        'sort_order'  => $i,
                    ]);

                    $invoice->domains()->attach($item['domain']->id, [
                        'created_at' => now(),
                    ]);
                }

                if ($admin) {
                    $names = collect($items)->pluck('domain.name')->toArray();
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
