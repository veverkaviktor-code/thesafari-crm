<?php

namespace App\Console\Commands;

use App\Models\Hosting;
use App\Models\Invoice;
use App\Models\User;
use App\Models\VpsServer;
use App\Notifications\WebsiteInvoiceCreated;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoInvoiceHostings extends Command
{
    protected $signature = 'hostings:auto-invoice {--dry-run : Only show what would be invoiced}';
    protected $description = 'Create invoices for hostings expiring within 30 days';

    public function handle(): int
    {
        $lock = \Illuminate\Support\Facades\Cache::lock('auto-invoice-hostings', 300);
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

        $hostings = Hosting::where('status', 'aktivni')
            ->where('auto_invoice', true)
            ->where('is_free', false)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>', now())
            ->where('expires_at', '<=', now()->addDays(30))
            ->where('sell_yearly', '>', 0)
            ->whereDoesntHave('invoices', function ($q) {
                $q->whereIn('status', ['vystavena', 'odeslana']);
            })
            ->with(['customer'])
            ->get();

        if ($hostings->isEmpty()) {
            $this->info('No hostings to invoice.');
        }

        // Group by customer_id — one invoice per customer with all services
        $groups = $hostings->groupBy('customer_id');

        $created = 0;

        foreach ($groups as $key => $hostingGroup) {
            $customer = $hostingGroup->first()->customer;

            if (!$customer) {
                Log::warning("AutoInvoice: hosting {$hostingGroup->first()->id} has no customer, skipping.");
                continue;
            }

            $items = [];
            foreach ($hostingGroup as $hosting) {
                $hostingPrice = (float) $hosting->sell_yearly;

                if ($hostingPrice <= 0) {
                    Log::warning("AutoInvoice: hosting {$hosting->id} ({$hosting->name}) has zero price, skipping.");
                    continue;
                }

                // Build period string from hosting expiration
                $periodStr = '1 rok';
                if ($hosting->expires_at) {
                    $expiry = \Carbon\Carbon::parse($hosting->expires_at);
                    $periodStr = $expiry->format('j. n. Y') . ' – ' . $expiry->copy()->addYear()->format('j. n. Y');
                }

                // Hosting item (only hosting price — domains are invoiced independently via domains:auto-invoice)
                $items[] = [
                    'model'       => $hosting,
                    'model_type'  => 'hosting',
                    'description' => "Hosting {$hosting->name} ({$periodStr})",
                    'quantity'    => 1,
                    'unit'        => 'rok',
                    'unit_price'  => $hostingPrice,
                    'total_price' => $hostingPrice,
                ];
            }

            if (empty($items)) {
                continue;
            }

            $total = collect($items)->sum('total_price');
            $earliestExpiry = $hostingGroup->min('expires_at');

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
                    'due_date' => $earliestExpiry->greaterThan(now()->addDays(14))
                        ? $earliestExpiry->toDateString()
                        : now()->addDays(14)->toDateString(),
                    'status' => 'vystavena',
                    'payment_method' => 'banka',
                    'total' => $total,
                    'notes' => 'Automaticky vygenerovaná faktura za obnovu služeb.',
                ]);

                $attachedHostingIds = [];
                foreach ($items as $i => $item) {
                    $invoice->items()->create([
                        'description' => $item['description'],
                        'quantity'    => $item['quantity'],
                        'unit'        => $item['unit'],
                        'unit_price'  => $item['unit_price'],
                        'total_price' => $item['total_price'],
                        'sort_order'  => $i,
                    ]);

                    $hostingId = $item['model']->id;
                    if (!in_array($hostingId, $attachedHostingIds, true)) {
                        $invoice->hostings()->attach($hostingId, [
                            'invoice_type' => 'hosting',
                            'created_at'   => now(),
                        ]);
                        $attachedHostingIds[] = $hostingId;
                    }
                }

                if ($admin) {
                    $names = collect($items)->pluck('model.name')->unique()->toArray();
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
                    'vps_server_id'  => $vps->id,
                    'invoice_number' => $invoiceNumber,
                    'variable_symbol' => $invoiceNumber,
                    'issue_date'     => now()->toDateString(),
                    'due_date'       => $expiry->greaterThan(now()->addDays(14))
                        ? $expiry->toDateString()
                        : now()->addDays(14)->toDateString(),
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
