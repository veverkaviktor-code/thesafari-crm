<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\Task;
use App\Models\Website;
use App\Models\WebsitePayment;
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
            'websiteStats' => $this->getWebsiteStats(),
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
        $ownWebsites = Website::where('status', 'aktivni')
            ->where('is_external', false)
            ->get();

        // Revenue (what we charge) — monthly equivalent
        // New simplified formula: always sell_yearly / 12 + management plan price
        $mrrCalc = fn($website) =>
            (float) ($website->sell_yearly ?: 0) / 12
            + ($website->managementPlan?->price_monthly ?? 0);

        $totalMRR = $ownWebsites->sum($mrrCalc);
        $vpsMRR = (float) \App\Models\VpsServer::active()->sum('price_yearly') / 12;

        // Costs (what we pay) — monthly equivalent
        $costCalc = fn($website) => (float) $website->cost_yearly / 12;
        $websiteCosts = $ownWebsites->sum($costCalc);
        $vpsCosts = $vpsMRR; // VPS price is our cost (we pay for servers)

        $totalRevenue = $totalMRR + $vpsMRR;
        $totalCosts = $websiteCosts + $vpsCosts;

        return [
            'total' => round($totalRevenue),
            'websites' => round($totalMRR),
            'vps' => round($vpsMRR),
            'count' => $ownWebsites->count(),
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
                    'Website'             => 'order',
                    'WebsitePayment'      => 'payment',
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
                    'Website'             => 'Web',
                    'WebsitePayment'      => 'Platba',
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
                        'is_free' => 'zdarma', 'hosting_expires_at' => 'expirace hostingu',
                        'domain_expires_at' => 'expirace domény',
                        'customer_id' => 'zákazník', 'notes' => 'poznámky',
                        'sell_yearly' => 'prodejní cena', 'cost_yearly' => 'nákupní cena',
                        'management_plan_id' => 'plán správy',
                        'starts_at' => 'datum zahájení', 'managed_since' => 've správě od',
                        'auto_renew' => 'auto-renew', 'provider' => 'poskytovatel',
                        'server' => 'server', 'title' => 'název', 'division' => 'divize',
                        'deadline' => 'termín', 'priority' => 'priorita',
                        'subject' => 'předmět', 'email' => 'e-mail', 'phone' => 'telefon',
                        'company' => 'firma', 'description' => 'popis',
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
                    'Website', 'WebsitePayment' => $subjectType === 'WebsitePayment'
                        ? ($a->subject?->website_id ? "/webove-sluzby/{$a->subject->website_id}" : null)
                        : "/webove-sluzby/{$a->subject_id}",
                    'Task'                => '/planovac',
                    'VpsServer'           => '/webove-sluzby',
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
        return cache()->remember('dashboard_alerts', 60, fn () => static::computeAttentionAlerts());
    }

    private static function computeAttentionAlerts(): array
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

        // 4. Weby expirující do 7 dní (bez ignorovaných)
        $expiringWebsites = Website::where('status', 'aktivni')
            ->whereNull('alerts_ignored_at')
            ->whereNotNull('hosting_expires_at')
            ->where('hosting_expires_at', '>=', now())
            ->where('hosting_expires_at', '<=', now()->addDays(7))
            ->orderBy('hosting_expires_at')
            ->get();

        foreach ($expiringWebsites as $website) {
            $days = (int) now()->diffInDays($website->hosting_expires_at);
            $label = $days === 0 ? 'dnes' : ($days === 1 ? 'zítra' : "za {$days} dní");
            $alerts[] = [
                'type' => $days <= 1 ? 'danger' : 'warning',
                'icon' => 'subscription',
                'title' => "{$website->name} expiruje {$label}",
                'subtitle' => 'Hosting',
                'link' => "/webove-sluzby/{$website->id}",
                'website_id' => $website->id,
            ];
        }

        // 5. Weby po expiraci (stále aktivní, bez ignorovaných)
        $expiredWebsites = Website::where('status', 'aktivni')
            ->whereNull('alerts_ignored_at')
            ->whereNotNull('hosting_expires_at')
            ->where('hosting_expires_at', '<', now())
            ->orderBy('hosting_expires_at')
            ->get();

        foreach ($expiredWebsites as $website) {
            $days = (int) abs(now()->diffInDays($website->hosting_expires_at));
            $alerts[] = [
                'type' => 'danger',
                'icon' => 'subscription',
                'title' => "{$website->name} — expirováno před {$days} dny",
                'subtitle' => 'Hosting · stále označeno jako aktivní',
                'link' => "/webove-sluzby/{$website->id}",
                'website_id' => $website->id,
            ];
        }

        // 5b. Úložiště přes 90% kvóty
        $storageWebsites = Website::where('status', 'aktivni')
            ->whereNull('alerts_ignored_at')
            ->where('storage_quota_mb', '>', 0)
            ->whereColumn('storage_used_mb', '>', DB::raw('storage_quota_mb * 0.9'))
            ->orderByRaw('storage_used_mb::float / storage_quota_mb DESC')
            ->get();

        foreach ($storageWebsites as $website) {
            $pct = round(($website->storage_used_mb / $website->storage_quota_mb) * 100);
            $over = $website->storage_used_mb > $website->storage_quota_mb;
            $alerts[] = [
                'type' => $over ? 'danger' : 'warning',
                'icon' => 'subscription',
                'title' => "{$website->name} — úložiště {$pct}%",
                'subtitle' => "{$website->storage_used_mb} / {$website->storage_quota_mb} MB",
                'link' => "/webove-sluzby/{$website->id}",
                'website_id' => $website->id,
            ];
        }

        // 6. Nezaplacené platby po splatnosti
        $overduePayments = WebsitePayment::where('status', 'po_splatnosti')
            ->with('website:id,name')
            ->orderBy('period_end')
            ->get();

        foreach ($overduePayments as $pay) {
            $alerts[] = [
                'type' => 'danger',
                'icon' => 'payment',
                'title' => "Nezaplacená platba: {$pay->website?->name}",
                'subtitle' => number_format($pay->amount, 0, ',', ' ') . ' Kč po splatnosti',
                'link' => "/webove-sluzby/{$pay->website_id}",
            ];
        }

        // 7. Websites to manually invoice (auto_renew=true, auto_invoice=false, expiring soon)
        $manualInvoiceWebsites = Website::where('status', 'aktivni')
            ->whereNull('alerts_ignored_at')
            ->where('auto_renew', true)
            ->where('auto_invoice', false)
            ->where('is_free', false)
            ->whereNotNull('hosting_expires_at')
            ->where('hosting_expires_at', '>=', now())
            ->where('hosting_expires_at', '<=', now()->addDays(30))
            ->orderBy('hosting_expires_at')
            ->get();

        foreach ($manualInvoiceWebsites as $website) {
            $days = (int) now()->diffInDays($website->hosting_expires_at);
            $label = $days === 0 ? 'dnes' : ($days === 1 ? 'zítra' : "za {$days} dní");
            $alerts[] = [
                'type' => 'warning',
                'icon' => 'invoice',
                'title' => "{$website->name} — ručně fakturovat ({$label})",
                'subtitle' => 'Auto-fakturace vypnuta',
                'link' => "/webove-sluzby/{$website->id}",
                'website_id' => $website->id,
            ];
        }

        // Sort: danger first, then warning
        usort($alerts, fn($a, $b) => ($a['type'] === 'danger' ? 0 : 1) - ($b['type'] === 'danger' ? 0 : 1));

        return $alerts;
    }

    public static function getIgnoredAlerts(): array
    {
        return Website::whereNotNull('alerts_ignored_at')
            ->where('status', 'aktivni')
            ->orderByDesc('alerts_ignored_at')
            ->get()
            ->map(fn ($website) => [
                'website_id' => $website->id,
                'name' => $website->name,
                'ignored_at' => $website->alerts_ignored_at->diffForHumans(),
                'link' => "/webove-sluzby/{$website->id}",
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

    private function getWebsiteStats(): array
    {
        $activeWebsites = Website::where('status', 'aktivni')->count();

        $expiringSoon = Website::where('status', 'aktivni')
            ->whereNotNull('hosting_expires_at')
            ->where('hosting_expires_at', '>=', now())
            ->where('hosting_expires_at', '<=', now()->addDays(30))
            ->count();

        $expired = Website::where('status', 'aktivni')
            ->whereNotNull('hosting_expires_at')
            ->where('hosting_expires_at', '<', now())
            ->count();

        $unpaidPayments = WebsitePayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])->count();

        $totalStorageMb = (int) Website::where('status', 'aktivni')
            ->sum('storage_used_mb');

        // Storage by server
        $storageByServer = Website::where('status', 'aktivni')
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
        $expiring = Website::where('status', 'aktivni')
            ->whereNotNull('hosting_expires_at')
            ->where('hosting_expires_at', '>=', now())
            ->where('hosting_expires_at', '<=', now()->addDays(60))
            ->with('customer:id,name')
            ->orderBy('hosting_expires_at')
            ->limit(5)
            ->get()
            ->map(fn ($w) => [
                'id' => $w->id,
                'name' => $w->name,
                'hosting_expires_at' => $w->hosting_expires_at->toDateString(),
                'days' => $w->daysUntilExpiry(),
                'urgency' => $w->expiryUrgency(),
                'customer_name' => $w->customer?->name,
            ])
            ->toArray();

        return [
            'active_websites' => $activeWebsites,
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

        // Nezaplacené website platby
        $unpaidWebsites = (float) WebsitePayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])->sum('amount');

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
            'unpaid_websites' => round($unpaidWebsites),
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

        // Nezaplacené website platby
        $fromWebsites = WebsitePayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])
            ->with(['website.customer:id,name,company'])
            ->get()
            ->map(fn ($pay) => [
                'id' => $pay->id,
                'customer_id' => $pay->website?->customer_id,
                'customer_name' => $pay->website?->customer?->company ?: $pay->website?->customer?->name ?? 'Neznámý',
                'type' => 'website',
                'label' => $pay->website?->name ?? 'Web',
                'amount' => (float) $pay->amount,
                'status' => $pay->status,
                'due_date' => $pay->period_end?->toDateString() ?? null,
                'days_overdue' => $pay->period_end && $pay->period_end->lt(now())
                    ? (int) now()->diffInDays($pay->period_end)
                    : null,
                'link' => "/webove-sluzby/{$pay->website_id}",
            ]);

        return $fromInvoices->concat($fromOrders)->concat($fromWebsites)
            ->sortByDesc('amount')
            ->values()
            ->toArray();
    }
}
