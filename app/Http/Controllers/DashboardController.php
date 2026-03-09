<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\Task;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Spatie\Activitylog\Models\Activity;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        return Inertia::render('Dashboard', [
            'stats' => $this->getStats(),
            'mrr' => $this->getMRR(),
            'revenueByDivision' => $this->getRevenueByDivision(),
            'revenueData' => $this->getRevenueData(),
            'recentActivity' => $this->getRecentActivity(),
            'recentTickets' => $this->getRecentTickets(),
            'neniwebStats' => $this->getNeniwebStats(),
            'alerts' => static::getAttentionAlerts(),
            'ignoredAlerts' => static::getIgnoredAlerts(),
            'taskStats' => $this->getTaskStats(),
            'financialSummary' => $this->getFinancialSummary(),
            'receivables' => $this->getReceivables(),
        ]);
    }

    private function getStats(): array
    {
        $activeOrders = Order::whereIn('status', ['nova', 'v_reseni'])->count();

        $unpaidInvoices = Invoice::whereIn('status', ['vystavena', 'odeslana'])
            ->sum('total');

        $openTickets = Ticket::open()->count();

        $upcomingDeadlines = Order::whereIn('status', ['nova', 'v_reseni'])
            ->whereNotNull('deadline')
            ->where('deadline', '<=', now()->addDays(7))
            ->where('deadline', '>=', now())
            ->count();

        return [
            'active_orders' => $activeOrders,
            'unpaid_amount' => (float) $unpaidInvoices,
            'open_tickets' => $openTickets,
            'upcoming_deadlines' => $upcomingDeadlines,
        ];
    }

    private function getMRR(): array
    {
        $ownSubs = Subscription::where('status', 'aktivni')
            ->where('is_external', false)
            ->get();

        // Revenue (what we charge) — monthly equivalent
        $mrrCalc = fn($sub) => $sub->billing_cycle === 'monthly'
            ? (float) $sub->monthly_price
            : (float) ($sub->sell_yearly ?: $sub->price_yearly) / 12;

        $totalMRR = $ownSubs->sum($mrrCalc);
        $hostingMRR = $ownSubs->where('type', 'hosting')->sum($mrrCalc);
        $domainMRR = $ownSubs->where('type', 'domena')->sum($mrrCalc);
        $serviceMRR = $ownSubs->where('type', 'sluzba')->sum($mrrCalc);
        $vpsMRR = (float) \App\Models\VpsServer::active()->sum('price_yearly') / 12;

        // Costs (what we pay) — monthly equivalent
        $costCalc = fn($sub) => (float) $sub->cost_yearly / 12;
        $subCosts = $ownSubs->sum($costCalc);
        $vpsCosts = $vpsMRR; // VPS price is our cost (we pay for servers)

        $totalRevenue = $totalMRR + $vpsMRR;
        $totalCosts = $subCosts + $vpsCosts;

        return [
            'total' => round($totalRevenue),
            'hosting' => round($hostingMRR),
            'domain' => round($domainMRR),
            'service' => round($serviceMRR),
            'vps' => round($vpsMRR),
            'count' => $ownSubs->count(),
            'costs_monthly' => round($totalCosts),
            'margin_monthly' => round($totalRevenue - $totalCosts),
            // Annual totals for clarity
            'arr_total' => round(($totalRevenue) * 12),
            'costs_annual' => round($totalCosts * 12),
            'margin_annual' => round(($totalRevenue - $totalCosts) * 12),
        ];
    }

    private function getRevenueByDivision(): array
    {
        return Order::whereIn('status', ['hotovo', 'fakturovano'])
            ->selectRaw("division, COUNT(*) as count, COALESCE(SUM(price), 0) as total")
            ->groupBy('division')
            ->get()
            ->map(fn($r) => [
                'division' => $r->division,
                'count' => $r->count,
                'total' => (float) $r->total,
            ])
            ->toArray();
    }

    private function getRevenueData(): array
    {
        $startDate = now()->subMonths(12)->startOfMonth();
        $monthNames = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];

        // Revenue = cena zakázek (odvedená práce), ne faktur
        $revenue = Order::whereIn('status', ['hotovo', 'fakturovano'])
            ->where('created_at', '>=', $startDate)
            ->selectRaw("TO_CHAR(created_at, 'YYYY-MM') as month, SUM(price) as revenue")
            ->groupByRaw("TO_CHAR(created_at, 'YYYY-MM')")
            ->orderBy('month')
            ->pluck('revenue', 'month')
            ->toArray();

        $costs = DB::table('order_costs')
            ->where('created_at', '>=', $startDate)
            ->selectRaw("TO_CHAR(created_at, 'YYYY-MM') as month, SUM(amount) as costs")
            ->groupByRaw("TO_CHAR(created_at, 'YYYY-MM')")
            ->orderBy('month')
            ->pluck('costs', 'month')
            ->toArray();

        $data = [];
        $current = $startDate->copy();
        while ($current->lte(now())) {
            $key = $current->format('Y-m');
            $data[] = [
                'month' => $monthNames[$current->month - 1] . ' ' . $current->format("'y"),
                'revenue' => (float) ($revenue[$key] ?? 0),
                'costs' => (float) ($costs[$key] ?? 0),
            ];
            $current->addMonth();
        }

        return $data;
    }

    private function getRecentActivity(): array
    {
        return Activity::with(['causer:id,name', 'subject'])
            ->where('created_at', '>=', now()->subDays(7))
            ->latest()
            ->limit(15)
            ->get()
            ->map(function ($a) {
                $subjectType = class_basename($a->subject_type ?? '');
                $icon = match ($subjectType) {
                    'Customer'            => 'customer',
                    'Order'               => 'order',
                    'Invoice'             => 'invoice',
                    'TimeEntry'           => 'time_entry',
                    'OrderCost'           => 'cost',
                    'OrderItem'           => 'item',
                    'Ticket'              => 'ticket',
                    'Task'                => 'task',
                    'Estimate'            => 'estimate',
                    'Subscription'        => 'order',
                    'SubscriptionPayment' => 'payment',
                    'VpsServer'           => 'order',
                    default               => 'order',
                };
                $subjectLabel = match ($subjectType) {
                    'Customer'            => 'Zákazník',
                    'Order'               => 'Zakázka',
                    'Invoice'             => 'Faktura',
                    'TimeEntry'           => 'Čas. záznam',
                    'OrderCost'           => 'Náklad',
                    'OrderItem'           => 'Položka',
                    'Ticket'              => 'Ticket',
                    'Task'                => 'Úkol',
                    'Estimate'            => 'Kalkulace',
                    'Subscription'        => 'Služba',
                    'SubscriptionPayment' => 'Platba',
                    'VpsServer'           => 'VPS',
                    default               => 'Záznam',
                };
                $actionLabel = match ($a->description) {
                    'created' => 'vytvořen/a',
                    'updated' => 'upraven/a',
                    'deleted' => 'smazán/a',
                    default   => $a->description,
                };

                // Try to get a meaningful name for the subject
                $subjectName = null;
                $subject = $a->subject;
                if ($subject) {
                    $subjectName = $subject->name
                        ?? $subject->title
                        ?? $subject->number
                        ?? null;
                }

                // Build descriptive text
                $text = "{$subjectLabel} {$actionLabel}";
                if ($subjectName) {
                    $text = "{$subjectLabel} \"{$subjectName}\" {$actionLabel}";
                }

                // For updates, show what changed
                $changes = null;
                if ($a->description === 'updated') {
                    $rawAttrs = $a->properties['attributes'] ?? [];
                    $rawOld = $a->properties['old'] ?? [];
                    $scalarKeys = array_keys(array_filter($rawAttrs, 'is_scalar'));
                    $attrs = array_map('strval', array_intersect_key($rawAttrs, array_flip($scalarKeys)));
                    $old = array_map('strval', array_intersect_key($rawOld, array_flip($scalarKeys)));
                    $changedFields = array_keys(array_diff_assoc($attrs, $old));
                    $fieldLabels = [
                        'status' => 'stav', 'price' => 'cena', 'name' => 'název',
                        'is_free' => 'zdarma', 'expires_at' => 'expirace',
                        'customer_id' => 'zákazník', 'notes' => 'poznámky',
                        'sell_yearly' => 'prodejní cena', 'cost_yearly' => 'nákupní cena',
                        'monthly_plan' => 'plán', 'billing_cycle' => 'fakturační cyklus',
                        'starts_at' => 'datum zahájení', 'managed_since' => 've správě od',
                        'auto_renew' => 'auto-renew', 'provider' => 'poskytovatel',
                        'server' => 'server', 'title' => 'název', 'division' => 'divize',
                        'deadline' => 'termín', 'priority' => 'priorita',
                        'subject' => 'předmět', 'email' => 'e-mail', 'phone' => 'telefon',
                        'company' => 'firma', 'type' => 'typ', 'description' => 'popis',
                        'storage_quota_mb' => 'kvóta úložiště',
                    ];
                    $readable = array_map(fn($f) => $fieldLabels[$f] ?? $f, array_slice($changedFields, 0, 3));
                    if (count($readable) > 0) {
                        $changes = implode(', ', $readable);
                    }
                }

                // Build link to the subject
                $link = match ($subjectType) {
                    'Customer'            => "/zakaznici/{$a->subject_id}",
                    'Order', 'TimeEntry', 'OrderCost', 'OrderItem' => $a->subject?->order_id
                        ? "/zakazky/{$a->subject->order_id}"
                        : ($subjectType === 'Order' ? "/zakazky/{$a->subject_id}" : null),
                    'Invoice'             => "/faktury/{$a->subject_id}",
                    'Ticket'              => "/zpravy/{$a->subject_id}",
                    'Subscription', 'SubscriptionPayment' => $subjectType === 'SubscriptionPayment'
                        ? ($a->subject?->subscription_id ? "/neniweb/{$a->subject->subscription_id}" : null)
                        : "/neniweb/{$a->subject_id}",
                    'Task'                => '/planovac',
                    'VpsServer'           => '/neniweb',
                    'Estimate'            => "/kalkulator/{$a->subject_id}",
                    default               => null,
                };

                return [
                    'id'           => $a->id,
                    'description'  => $a->description,
                    'subject_type' => $subjectType,
                    'subject_id'   => $a->subject_id,
                    'created_at'   => $a->created_at->toISOString(),
                    'icon'         => $icon,
                    'text'         => $text,
                    'changes'      => $changes,
                    'link'         => $link,
                ];
            })
            ->toArray();
    }

    private function getRecentTickets(): array
    {
        return Ticket::with('customer:id,name,company')
            ->open()
            ->latest()
            ->limit(5)
            ->get()
            ->map(fn ($t) => [
                'id' => $t->id,
                'subject' => $t->subject,
                'customer' => $t->customer?->name ?? 'Neznámý',
                'priority' => $t->priority ?? 'medium',
                'created_at' => $t->created_at->diffForHumans(),
            ])
            ->toArray();
    }

    public static function getAttentionAlerts(): array
    {
        $alerts = [];

        // 1. Zakázky otevřené déle než 5 dní
        $staleOrders = Order::whereIn('status', ['nova', 'v_reseni'])
            ->where('created_at', '<', now()->subDays(5))
            ->orderBy('created_at')
            ->limit(5)
            ->get();

        foreach ($staleOrders as $order) {
            $days = (int) now()->diffInDays($order->created_at);
            $alerts[] = [
                'type' => $days > 14 ? 'danger' : 'warning',
                'icon' => 'order',
                'title' => "Zakázka \"{$order->title}\" čeká {$days} dní",
                'subtitle' => 'Otevřená déle než 5 dní, jak to vypadá?',
                'link' => "/zakazky/{$order->id}",
            ];
        }

        // 2. Faktury po splatnosti
        $overdueInvoices = Invoice::whereIn('status', ['vystavena', 'odeslana'])
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->orderBy('due_date')
            ->limit(5)
            ->get();

        foreach ($overdueInvoices as $inv) {
            $days = (int) now()->diffInDays($inv->due_date);
            $alerts[] = [
                'type' => 'danger',
                'icon' => 'invoice',
                'title' => "Faktura {$inv->invoice_number} po splatnosti {$days} dní",
                'subtitle' => number_format($inv->total, 0, ',', ' ') . ' Kč',
                'link' => "/faktury/{$inv->id}",
            ];
        }

        // 3. Zakázky s blížícím se deadlinem (do 3 dnů)
        $urgentDeadlines = Order::whereIn('status', ['nova', 'v_reseni'])
            ->whereNotNull('deadline')
            ->where('deadline', '>=', now())
            ->where('deadline', '<=', now()->addDays(3))
            ->orderBy('deadline')
            ->limit(5)
            ->get();

        foreach ($urgentDeadlines as $order) {
            $days = (int) now()->diffInDays($order->deadline);
            $label = $days === 0 ? 'dnes' : ($days === 1 ? 'zítra' : "za {$days} dny");
            $alerts[] = [
                'type' => $days === 0 ? 'danger' : 'warning',
                'icon' => 'deadline',
                'title' => "Deadline {$label}: \"{$order->title}\"",
                'subtitle' => 'Blíží se termín dokončení',
                'link' => "/zakazky/{$order->id}",
            ];
        }

        // 4. Služby expirující do 7 dní (bez ignorovaných)
        $expiringSubs = Subscription::where('status', 'aktivni')
            ->whereNull('alerts_ignored_at')
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(7))
            ->orderBy('expires_at')
            ->get();

        foreach ($expiringSubs as $sub) {
            $days = (int) now()->diffInDays($sub->expires_at);
            $label = $days === 0 ? 'dnes' : ($days === 1 ? 'zítra' : "za {$days} dní");
            $alerts[] = [
                'type' => $days <= 1 ? 'danger' : 'warning',
                'icon' => 'subscription',
                'title' => "{$sub->name} expiruje {$label}",
                'subtitle' => ucfirst($sub->type),
                'link' => "/neniweb/{$sub->id}",
                'subscription_id' => $sub->id,
            ];
        }

        // 5. Služby po expiraci (stále aktivní, bez ignorovaných)
        $expiredSubs = Subscription::where('status', 'aktivni')
            ->whereNull('alerts_ignored_at')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->orderBy('expires_at')
            ->get();

        foreach ($expiredSubs as $sub) {
            $days = (int) abs(now()->diffInDays($sub->expires_at));
            $alerts[] = [
                'type' => 'danger',
                'icon' => 'subscription',
                'title' => "{$sub->name} — expirováno před {$days} dny",
                'subtitle' => ucfirst($sub->type) . ' · stále označeno jako aktivní',
                'link' => "/neniweb/{$sub->id}",
                'subscription_id' => $sub->id,
            ];
        }

        // 5b. Úložiště přes 90% kvóty
        $storageSubs = Subscription::where('status', 'aktivni')
            ->whereNull('alerts_ignored_at')
            ->where('storage_quota_mb', '>', 0)
            ->whereColumn('storage_used_mb', '>', DB::raw('storage_quota_mb * 0.9'))
            ->orderByRaw('storage_used_mb::float / storage_quota_mb DESC')
            ->get();

        foreach ($storageSubs as $sub) {
            $pct = round(($sub->storage_used_mb / $sub->storage_quota_mb) * 100);
            $over = $sub->storage_used_mb > $sub->storage_quota_mb;
            $alerts[] = [
                'type' => $over ? 'danger' : 'warning',
                'icon' => 'subscription',
                'title' => "{$sub->name} — úložiště {$pct}%",
                'subtitle' => "{$sub->storage_used_mb} / {$sub->storage_quota_mb} MB",
                'link' => "/neniweb/{$sub->id}",
                'subscription_id' => $sub->id,
            ];
        }

        // 6. Nezaplacené platby po splatnosti
        $overduePayments = SubscriptionPayment::where('status', 'po_splatnosti')
            ->with('subscription:id,name')
            ->orderBy('period_end')
            ->get();

        foreach ($overduePayments as $pay) {
            $alerts[] = [
                'type' => 'danger',
                'icon' => 'payment',
                'title' => "Nezaplacená platba: {$pay->subscription?->name}",
                'subtitle' => number_format($pay->amount, 0, ',', ' ') . ' Kč po splatnosti',
                'link' => "/neniweb/{$pay->subscription_id}",
            ];
        }

        // 7. Subscriptions to manually invoice (auto_renew=true, auto_invoice=false, expiring soon)
        $manualInvoiceSubs = Subscription::where('status', 'aktivni')
            ->whereNull('alerts_ignored_at')
            ->where('auto_renew', true)
            ->where('auto_invoice', false)
            ->where('is_free', false)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(30))
            ->orderBy('expires_at')
            ->get();

        foreach ($manualInvoiceSubs as $sub) {
            $days = (int) now()->diffInDays($sub->expires_at);
            $label = $days === 0 ? 'dnes' : ($days === 1 ? 'zítra' : "za {$days} dní");
            $alerts[] = [
                'type' => 'warning',
                'icon' => 'invoice',
                'title' => "{$sub->name} — ručně fakturovat ({$label})",
                'subtitle' => ucfirst($sub->type) . ' — auto-fakturace vypnuta',
                'link' => "/neniweb/{$sub->id}",
                'subscription_id' => $sub->id,
            ];
        }

        // Sort: danger first, then warning
        usort($alerts, fn($a, $b) => ($a['type'] === 'danger' ? 0 : 1) - ($b['type'] === 'danger' ? 0 : 1));

        return $alerts;
    }

    public static function getIgnoredAlerts(): array
    {
        return Subscription::whereNotNull('alerts_ignored_at')
            ->where('status', 'aktivni')
            ->orderByDesc('alerts_ignored_at')
            ->get()
            ->map(fn ($sub) => [
                'subscription_id' => $sub->id,
                'name' => $sub->name,
                'type' => ucfirst($sub->type),
                'ignored_at' => $sub->alerts_ignored_at->diffForHumans(),
                'link' => "/neniweb/{$sub->id}",
            ])
            ->toArray();
    }

    private function getTaskStats(): array
    {
        $overdue      = Task::overdue()->count();
        $dueToday     = Task::open()->dueToday()->count();
        $dueThisWeek  = Task::open()->dueThisWeek()->count();
        $totalOpen    = Task::open()->count();

        return [
            'overdue'       => $overdue,
            'due_today'     => $dueToday,
            'due_this_week' => $dueThisWeek,
            'total_open'    => $totalOpen,
        ];
    }

    private function getNeniwebStats(): array
    {
        $activeDomains = Subscription::where('type', 'domena')->where('status', 'aktivni')->count();
        $activeHostings = Subscription::where('type', 'hosting')->where('status', 'aktivni')->count();

        $expiringSoon = Subscription::where('status', 'aktivni')
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(30))
            ->count();

        $expired = Subscription::where('status', 'aktivni')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->count();

        $unpaidPayments = SubscriptionPayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])->count();

        $totalStorageMb = (int) Subscription::where('type', 'hosting')
            ->where('status', 'aktivni')
            ->sum('storage_used_mb');

        // Storage by server
        $storageByServer = Subscription::where('type', 'hosting')
            ->where('status', 'aktivni')
            ->whereNotNull('server')
            ->selectRaw("server, COUNT(*) as count, COALESCE(SUM(storage_used_mb), 0) as total_mb")
            ->groupBy('server')
            ->orderByDesc('total_mb')
            ->get()
            ->map(fn ($r) => [
                'server' => $r->server,
                'count' => $r->count,
                'total_mb' => (int) $r->total_mb,
            ])
            ->toArray();

        // Top 5 expiring soon
        $expiring = Subscription::where('status', 'aktivni')
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(60))
            ->with('customer:id,name')
            ->orderBy('expires_at')
            ->limit(5)
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'type' => $s->type,
                'expires_at' => $s->expires_at->toDateString(),
                'days' => $s->daysUntilExpiry(),
                'urgency' => $s->expiryUrgency(),
                'customer_name' => $s->customer?->name,
            ])
            ->toArray();

        return [
            'active_domains' => $activeDomains,
            'active_hostings' => $activeHostings,
            'expiring_soon' => $expiringSoon,
            'expired' => $expired,
            'unpaid_payments' => $unpaidPayments,
            'total_storage_mb' => $totalStorageMb,
            'storage_by_server' => $storageByServer,
            'expiring' => $expiring,
        ];
    }

    private function getFinancialSummary(): array
    {
        // Finanční přehled = jen zakázky (jednorázová práce)
        $completedOrders = Order::whereIn('status', ['hotovo', 'fakturovano'])->get();
        $orderRevenue = (float) $completedOrders->sum('price');
        $orderCosts = (float) DB::table('order_costs')
            ->whereIn('order_id', $completedOrders->pluck('id'))
            ->sum('amount');
        $orderProfit = $orderRevenue - $orderCosts;

        // Zaplaceno (zaplacené faktury za zakázky)
        $paid = (float) Invoice::where('status', 'zaplacena')->sum('total');

        // Nezaplacené faktury
        $unpaidInvoices = (float) Invoice::whereIn('status', ['vystavena', 'odeslana', 'po_splatnosti'])->sum('total');

        // Nezaplacené subscription platby
        $unpaidSubs = (float) SubscriptionPayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])->sum('amount');

        // Hotové zakázky bez faktury
        $notInvoiced = (float) Order::whereIn('status', ['hotovo', 'fakturovano'])
            ->whereDoesntHave('invoice')
            ->sum('price');

        return [
            'total_revenue' => round($orderRevenue),
            'total_costs' => round($orderCosts),
            'total_profit' => round($orderProfit),
            'paid' => round($paid),
            'unpaid_invoices' => round($unpaidInvoices),
            'unpaid_subscriptions' => round($unpaidSubs),
            'not_invoiced' => round($notInvoiced),
        ];
    }

    private function getReceivables(): array
    {
        // Nezaplacené faktury seskupené po zákaznících
        $fromInvoices = Invoice::whereIn('status', ['vystavena', 'odeslana', 'po_splatnosti'])
            ->with('customer:id,name,company')
            ->get()
            ->map(fn ($inv) => [
                'id' => $inv->id,
                'customer_id' => $inv->customer_id,
                'customer_name' => $inv->customer?->company ?: $inv->customer?->name ?? 'Neznámý',
                'type' => 'invoice',
                'label' => "Faktura {$inv->invoice_number}",
                'amount' => (float) $inv->total,
                'status' => $inv->status,
                'due_date' => $inv->due_date?->toDateString(),
                'days_overdue' => $inv->due_date && $inv->due_date->lt(now())
                    ? (int) now()->diffInDays($inv->due_date)
                    : null,
                'link' => "/faktury/{$inv->id}",
            ]);

        // Hotové zakázky BEZ faktury
        $fromOrders = Order::whereIn('status', ['hotovo', 'fakturovano'])
            ->whereDoesntHave('invoice')
            ->where('price', '>', 0)
            ->with('customer:id,name,company')
            ->get()
            ->map(fn ($order) => [
                'id' => $order->id,
                'customer_id' => $order->customer_id,
                'customer_name' => $order->customer?->company ?: $order->customer?->name ?? 'Neznámý',
                'type' => 'order',
                'label' => $order->title,
                'amount' => (float) $order->price,
                'status' => 'bez_faktury',
                'due_date' => null,
                'days_overdue' => null,
                'link' => "/zakazky/{$order->id}",
            ]);

        // Nezaplacené subscription platby (hostingy, domény po expiraci atd.)
        $fromSubscriptions = SubscriptionPayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])
            ->with(['subscription.customer:id,name,company'])
            ->get()
            ->map(fn ($pay) => [
                'id' => $pay->id,
                'customer_id' => $pay->subscription?->customer_id,
                'customer_name' => $pay->subscription?->customer?->company ?: $pay->subscription?->customer?->name ?? 'Neznámý',
                'type' => 'subscription',
                'label' => $pay->subscription?->name ?? 'Služba',
                'amount' => (float) $pay->amount,
                'status' => $pay->status,
                'due_date' => $pay->period_end?->toDateString() ?? null,
                'days_overdue' => $pay->period_end && $pay->period_end->lt(now())
                    ? (int) now()->diffInDays($pay->period_end)
                    : null,
                'link' => "/neniweb/{$pay->subscription_id}",
            ]);

        return $fromInvoices->concat($fromOrders)->concat($fromSubscriptions)
            ->sortByDesc('amount')
            ->values()
            ->toArray();
    }
}
