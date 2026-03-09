<?php

namespace App\Console\Commands;

use App\Models\Invoice;
use App\Models\Subscription;
use App\Models\User;
use App\Notifications\SubscriptionInvoiceCreated;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class AutoInvoiceSubscriptions extends Command
{
    protected $signature = 'subscriptions:auto-invoice {--dry-run : Only show what would be invoiced}';
    protected $description = 'Create invoices for subscriptions expiring within 30 days';

    public function handle(): int
    {
        $lock = \Illuminate\Support\Facades\Cache::lock('auto-invoice-subscriptions', 300);
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

        $subscriptions = Subscription::where('status', 'aktivni')
            ->where('auto_renew', true)
            ->where('auto_invoice', true)
            ->where('is_free', false)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>', now())
            ->where('expires_at', '<=', now()->addDays(30))
            ->where(function ($q) {
                $q->where('sell_yearly', '>', 0)
                  ->orWhere('price_yearly', '>', 0);
            })
            ->whereDoesntHave('invoices', function ($q) {
                $q->whereIn('status', ['vystavena', 'odeslana']);
            })
            ->with('customer')
            ->get();

        if ($subscriptions->isEmpty()) {
            $this->info('No subscriptions to invoice.');
            return 0;
        }

        // Group by customer_id — one invoice per customer with all services
        $groups = $subscriptions->groupBy('customer_id');

        $created = 0;

        foreach ($groups as $key => $subs) {
            $customer = $subs->first()->customer;

            if (!$customer) {
                Log::warning("AutoInvoice: subscription {$subs->first()->id} has no customer, skipping.");
                continue;
            }

            $items = [];
            foreach ($subs as $sub) {
                $price = (float) $sub->sell_yearly ?: (float) $sub->price_yearly;
                if ($price <= 0) {
                    Log::warning("AutoInvoice: subscription {$sub->id} ({$sub->name}) has zero price, skipping.");
                    continue;
                }

                $typeLabel = match ($sub->type) {
                    'domena' => 'Obnova domény',
                    'hosting' => 'Hosting',
                    'sluzba' => 'Služba',
                    default => 'Služba',
                };

                $items[] = [
                    'subscription' => $sub,
                    'description' => "{$typeLabel} {$sub->name} (1 rok)",
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
            $earliestExpiry = $subs->min('expires_at');

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

                    $invoice->subscriptions()->attach($item['subscription']->id);
                }

                if ($admin) {
                    $names = collect($items)->pluck('subscription.name')->unique()->toArray();
                    $admin->notify(new SubscriptionInvoiceCreated($invoice, $names));
                }
            });

            $created++;
        }

        $verb = $dryRun ? 'Would create' : 'Created';
        $this->info("{$verb} {$created} invoices.");

        return 0;
    }
}
