<?php

namespace App\Http\Controllers;

use App\Models\Domain;
use App\Models\Hosting;
use App\Models\HostingPayment;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\Task;
use App\Models\Ticket;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Cache;
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
            'servicesStats' => $this->getServicesStats(),
            'alerts' => static::getAttentionAlerts(),
            'ignoredAlerts' => static::getIgnoredAlerts(),
            'taskStats' => $this->getTaskStats(),
            'financialSummary' => $this->getFinancialSummary(),
            'receivables' => $this->getReceivables(),
            'bankBalance' => $this->getBankBalance(),
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
        // Hosting MRR
        $ownHostings = Hosting::where('status', 'aktivni')
            ->where('is_free', false)
            ->with('managementPlan')
            ->get();

        $hostingMrr = $ownHostings->sum(fn ($h) => (float) ($h->sell_yearly ?: 0) / 12);
        $mgmtMrr = $ownHostings->sum(fn ($h) => $h->managementPlan?->price_monthly ?? 0);

        // Domain MRR
        $domainMrr = (float) Domain::where('status', 'aktivni')
            ->where('is_registered_by_us', true)
            ->where('sell_yearly', '>', 0)
            ->sum('sell_yearly') / 12;

        // VPS MRR
        $vpsMRR = (float) \App\Models\VpsServer::active()->sum('price_yearly') / 12;

        $totalMRR = $hostingMrr + $domainMrr + $mgmtMrr + $vpsMRR;

        // Costs
        $hostingCosts = $ownHostings->sum(fn ($h) => (float) $h->cost_yearly / 12);
        $domainCosts = (float) Domain::where('status', 'aktivni')
            ->where('is_registered_by_us', true)
            ->sum('cost_yearly') / 12;
        $vpsCosts = $vpsMRR;

        $totalCosts = $hostingCosts + $domainCosts + $vpsCosts;

        return [
            'total' => round($totalMRR),
            'hosting' => round($hostingMrr),
            'domain' => round($domainMrr),
            'management' => round($mgmtMrr),
            'vps' => round($vpsMRR),
            'count' => $ownHostings->count(),
            'costs_monthly' => round($totalCosts),
            'margin_monthly' => round($totalMRR - $totalCosts),
            'arr_total' => round($totalMRR * 12),
            'costs_annual' => round($totalCosts * 12),
            'margin_annual' => round(($totalMRR - $totalCosts) * 12),
        ];
    }

    private function getRevenueByDivision(): array
    {
        $orders = Order::whereIn('status', ['hotovo', 'fakturovano'])->get(['division', 'price']);
        $grouped = [];
        foreach ($orders as $order) {
            $divs = is_array($order->division) ? $order->division : [$order->division];
            foreach ($divs as $div) {
                if (!isset($grouped[$div])) {
                    $grouped[$div] = ['count' => 0, 'total' => 0];
                }
                $grouped[$div]['count']++;
                $grouped[$div]['total'] += (float) $order->price;
            }
        }
        return collect($grouped)->map(fn($data, $div) => [
            'division' => $div,
            'count' => $data['count'],
            'total' => $data['total'],
        ])->values()->toArray();
    }

    private function getRevenueData(): array
    {
        $startDate = now()->subMonths(12)->startOfMonth();
        $monthNames = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];

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
                    'Hosting'             => 'hosting',
                    'Domain'              => 'domain',
                    'HostingPayment'      => 'payment',
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
                    'Hosting'             => 'Hosting',
                    'Domain'              => 'Doména',
                    'HostingPayment'      => 'Platba',
                    'VpsServer'           => 'VPS',
                    // Legacy support for old activity log entries
                    'Website'             => 'Web',
                    'WebsitePayment'      => 'Platba',
                    default               => 'Záznam',
                };
                $actionLabel = match ($a->description) {
                    'created' => 'vytvořen/a',
                    'updated' => 'upraven/a',
                    'deleted' => 'smazán/a',
                    default   => $a->description,
                };

                $subjectName = null;
                $subject = $a->subject;
                if ($subject) {
                    $subjectName = $subject->name
                        ?? $subject->title
                        ?? $subject->number
                        ?? null;
                }

                $text = "{$subjectLabel} {$actionLabel}";
                if ($subjectName) {
                    $text = "{$subjectLabel} \"{$subjectName}\" {$actionLabel}";
                }

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
                        'management_plan_id' => 'plán správy',
                        'starts_at' => 'datum zahájení', 'managed_since' => 've správě od',
                        'auto_renew' => 'auto-renew', 'provider' => 'poskytovatel',
                        'server' => 'server', 'title' => 'název', 'division' => 'divize',
                        'deadline' => 'termín', 'priority' => 'priorita',
                        'subject' => 'předmět', 'email' => 'e-mail', 'phone' => 'telefon',
                        'company' => 'firma', 'description' => 'popis',
                        'storage_quota_mb' => 'kvóta úložiště',
                        'registrar' => 'registrátor', 'is_registered_by_us' => 'naše doména',
                    ];
                    $readable = array_map(fn($f) => $fieldLabels[$f] ?? $f, array_slice($changedFields, 0, 3));
                    if (count($readable) > 0) {
                        $changes = implode(', ', $readable);
                    }
                }

                $link = match ($subjectType) {
                    'Customer'                    => "/zakaznici/{$a->subject_id}",
                    'Order', 'TimeEntry', 'OrderCost', 'OrderItem' => $a->subject?->order_id
                        ? "/zakazky/{$a->subject->order_id}"
                        : ($subjectType === 'Order' ? "/zakazky/{$a->subject_id}" : null),
                    'Invoice'                     => "/faktury/{$a->subject_id}",
                    'Ticket'                      => "/zpravy/{$a->subject_id}",
                    'Hosting'                     => "/hostingy/{$a->subject_id}",
                    'Domain'                      => "/domeny/{$a->subject_id}",
                    'HostingPayment'              => $a->subject?->hosting_id
                        ? "/hostingy/{$a->subject->hosting_id}"
                        : null,
                    // Legacy support for old activity log entries
                    'Website', 'WebsitePayment'   => $subjectType === 'WebsitePayment'
                        ? ($a->subject?->website_id ? "/hostingy/{$a->subject->website_id}" : null)
                        : "/hostingy/{$a->subject_id}",
                    'Task'                        => '/planovac',
                    'VpsServer'                   => '/vps',
                    'Estimate'                    => "/kalkulator/{$a->subject_id}",
                    default                       => null,
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

        // 4. Hostingy expirující do 7 dní (bez ignorovaných)
        $expiringHostings = Hosting::where('status', 'aktivni')
            ->whereNull('alerts_ignored_at')
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(7))
            ->orderBy('expires_at')
            ->get();

        foreach ($expiringHostings as $hosting) {
            $days = (int) now()->diffInDays($hosting->expires_at);
            $label = $days === 0 ? 'dnes' : ($days === 1 ? 'zítra' : "za {$days} dní");
            $alerts[] = [
                'type' => $days <= 1 ? 'danger' : 'warning',
                'icon' => 'hosting',
                'title' => "{$hosting->name} expiruje {$label}",
                'subtitle' => 'Hosting',
                'link' => "/hostingy/{$hosting->id}",
                'hosting_id' => $hosting->id,
            ];
        }

        // 5. Hostingy po expiraci (stále aktivní, bez ignorovaných)
        $expiredHostings = Hosting::where('status', 'aktivni')
            ->whereNull('alerts_ignored_at')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->orderBy('expires_at')
            ->get();

        foreach ($expiredHostings as $hosting) {
            $days = (int) abs(now()->diffInDays($hosting->expires_at));
            $alerts[] = [
                'type' => 'danger',
                'icon' => 'hosting',
                'title' => "{$hosting->name} — expirováno před {$days} dny",
                'subtitle' => 'Hosting · stále označeno jako aktivní',
                'link' => "/hostingy/{$hosting->id}",
                'hosting_id' => $hosting->id,
            ];
        }

        // 5b. Úložiště přes 90% kvóty
        $storageHostings = Hosting::where('status', 'aktivni')
            ->whereNull('alerts_ignored_at')
            ->where('storage_quota_mb', '>', 0)
            ->whereColumn('storage_used_mb', '>', DB::raw('storage_quota_mb * 0.9'))
            ->orderByRaw('storage_used_mb::float / storage_quota_mb DESC')
            ->get();

        foreach ($storageHostings as $hosting) {
            $pct = round(($hosting->storage_used_mb / $hosting->storage_quota_mb) * 100);
            $over = $hosting->storage_used_mb > $hosting->storage_quota_mb;
            $alerts[] = [
                'type' => $over ? 'danger' : 'warning',
                'icon' => 'hosting',
                'title' => "{$hosting->name} — úložiště {$pct}%",
                'subtitle' => "{$hosting->storage_used_mb} / {$hosting->storage_quota_mb} MB",
                'link' => "/hostingy/{$hosting->id}",
                'hosting_id' => $hosting->id,
            ];
        }

        // 5c. Domény expirující do 7 dní
        $expiringDomains = Domain::where('status', 'aktivni')
            ->where('is_registered_by_us', true)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(7))
            ->orderBy('expires_at')
            ->get();

        foreach ($expiringDomains as $domain) {
            $days = (int) now()->diffInDays($domain->expires_at);
            $label = $days === 0 ? 'dnes' : ($days === 1 ? 'zítra' : "za {$days} dní");
            $alerts[] = [
                'type' => $days <= 1 ? 'danger' : 'warning',
                'icon' => 'domain',
                'title' => "{$domain->name} expiruje {$label}",
                'subtitle' => 'Doména',
                'link' => "/domeny/{$domain->id}",
            ];
        }

        // 5d. Domény po expiraci
        $expiredDomains = Domain::where('status', 'aktivni')
            ->where('is_registered_by_us', true)
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->orderBy('expires_at')
            ->get();

        foreach ($expiredDomains as $domain) {
            $days = (int) abs(now()->diffInDays($domain->expires_at));
            $alerts[] = [
                'type' => 'danger',
                'icon' => 'domain',
                'title' => "{$domain->name} — expirováno před {$days} dny",
                'subtitle' => 'Doména · stále označeno jako aktivní',
                'link' => "/domeny/{$domain->id}",
            ];
        }

        // 6. Nezaplacené platby po splatnosti
        $overduePayments = HostingPayment::where('status', 'po_splatnosti')
            ->with('hosting:id,name')
            ->orderBy('period_end')
            ->get();

        foreach ($overduePayments as $pay) {
            $alerts[] = [
                'type' => 'danger',
                'icon' => 'payment',
                'title' => "Nezaplacená platba: {$pay->hosting?->name}",
                'subtitle' => number_format($pay->amount, 0, ',', ' ') . ' Kč po splatnosti',
                'link' => "/hostingy/{$pay->hosting_id}",
            ];
        }

        // 7. Hostings to manually invoice (auto_invoice=false, expiring soon)
        $manualInvoiceHostings = Hosting::where('status', 'aktivni')
            ->whereNull('alerts_ignored_at')
            ->where('auto_invoice', false)
            ->where('is_free', false)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(30))
            ->orderBy('expires_at')
            ->get();

        foreach ($manualInvoiceHostings as $hosting) {
            $days = (int) now()->diffInDays($hosting->expires_at);
            $label = $days === 0 ? 'dnes' : ($days === 1 ? 'zítra' : "za {$days} dní");
            $alerts[] = [
                'type' => 'warning',
                'icon' => 'invoice',
                'title' => "{$hosting->name} — ručně fakturovat ({$label})",
                'subtitle' => 'Auto-fakturace vypnuta',
                'link' => "/hostingy/{$hosting->id}",
                'hosting_id' => $hosting->id,
            ];
        }

        // Sort: danger first, then warning
        usort($alerts, fn($a, $b) => ($a['type'] === 'danger' ? 0 : 1) - ($b['type'] === 'danger' ? 0 : 1));

        return $alerts;
    }

    public static function getIgnoredAlerts(): array
    {
        return Hosting::whereNotNull('alerts_ignored_at')
            ->where('status', 'aktivni')
            ->orderByDesc('alerts_ignored_at')
            ->get()
            ->map(fn ($hosting) => [
                'hosting_id' => $hosting->id,
                'name' => $hosting->name,
                'ignored_at' => $hosting->alerts_ignored_at->diffForHumans(),
                'link' => "/hostingy/{$hosting->id}",
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

    private function getServicesStats(): array
    {
        $activeHostings = Hosting::where('status', 'aktivni')->count();
        $activeDomains = Domain::where('status', 'aktivni')->count();

        $expiringHostings = Hosting::where('status', 'aktivni')
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(30))
            ->count();

        $expiringDomains = Domain::where('status', 'aktivni')
            ->where('is_registered_by_us', true)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(30))
            ->count();

        $expiredHostings = Hosting::where('status', 'aktivni')
            ->whereNotNull('expires_at')
            ->where('expires_at', '<', now())
            ->count();

        $unpaidPayments = HostingPayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])->count();

        $totalStorageMb = (int) Hosting::where('status', 'aktivni')
            ->sum('storage_used_mb');

        // Storage by server
        $storageByServer = Hosting::where('status', 'aktivni')
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

        // Top 5 expiring hostings
        $expiringHostingsList = Hosting::where('status', 'aktivni')
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(60))
            ->with('customer:id,name')
            ->orderBy('expires_at')
            ->limit(5)
            ->get()
            ->map(fn ($h) => [
                'id' => $h->id,
                'name' => $h->name,
                'type' => 'hosting',
                'expires_at' => $h->expires_at->toDateString(),
                'days' => $h->daysUntilExpiry(),
                'urgency' => $h->expiryUrgency(),
                'customer_name' => $h->customer?->name,
                'link' => "/hostingy/{$h->id}",
            ])
            ->toArray();

        // Top 5 expiring domains
        $expiringDomainsList = Domain::where('status', 'aktivni')
            ->where('is_registered_by_us', true)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(60))
            ->with('customer:id,name')
            ->orderBy('expires_at')
            ->limit(5)
            ->get()
            ->map(fn ($d) => [
                'id' => $d->id,
                'name' => $d->name,
                'type' => 'domain',
                'expires_at' => $d->expires_at->toDateString(),
                'days' => $d->daysUntilExpiry(),
                'urgency' => $d->expiryUrgency(),
                'customer_name' => $d->customer?->name,
                'link' => "/domeny/{$d->id}",
            ])
            ->toArray();

        $expiring = array_merge($expiringHostingsList, $expiringDomainsList);
        usort($expiring, fn ($a, $b) => ($a['days'] ?? 999) - ($b['days'] ?? 999));
        $expiring = array_slice($expiring, 0, 5);

        return [
            'active_hostings' => $activeHostings,
            'active_domains' => $activeDomains,
            'expiring_hostings' => $expiringHostings,
            'expiring_domains' => $expiringDomains,
            'expired_hostings' => $expiredHostings,
            'unpaid_payments' => $unpaidPayments,
            'total_storage_mb' => $totalStorageMb,
            'storage_by_server' => $storageByServer,
            'expiring' => $expiring,
        ];
    }

    private function getBankBalance(): ?array
    {
        // Balance is refreshed out-of-band by the fio:sync cron and written to the
        // 'fio_balance' cache key. The dashboard only reads it — never calls the Fio
        // API synchronously, so a slow/dead Fio endpoint can't block the page render.
        return Cache::get('fio_balance');
    }

    private function getFinancialSummary(): array
    {
        $completedOrders = Order::whereIn('status', ['hotovo', 'fakturovano'])->get();
        $orderRevenue = (float) $completedOrders->sum('price');
        $orderCosts = (float) DB::table('order_costs')->sum('amount');
        $orderProfit = $orderRevenue - $orderCosts;

        $paid = (float) Invoice::where('status', 'zaplacena')->sum('total');

        $unpaidInvoices = (float) Invoice::whereIn('status', ['vystavena', 'odeslana', 'po_splatnosti'])->sum('total');

        $unpaidHostings = (float) HostingPayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])->sum('amount');

        $notInvoiced = (float) Order::whereIn('status', ['hotovo', 'fakturovano'])
            ->whereDoesntHave('invoice')
            ->sum('price');

        return [
            'total_revenue' => round($orderRevenue),
            'total_costs' => round($orderCosts),
            'total_profit' => round($orderProfit),
            'paid' => round($paid),
            'unpaid_invoices' => round($unpaidInvoices),
            'unpaid_websites' => round($unpaidHostings),
            'not_invoiced' => round($notInvoiced),
        ];
    }

    private function getReceivables(): array
    {
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

        $fromHostings = HostingPayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])
            ->with(['hosting.customer:id,name,company'])
            ->get()
            ->map(fn ($pay) => [
                'id' => $pay->id,
                'customer_id' => $pay->hosting?->customer_id,
                'customer_name' => $pay->hosting?->customer?->company ?: $pay->hosting?->customer?->name ?? 'Neznámý',
                'type' => 'hosting',
                'label' => $pay->hosting?->name ?? 'Hosting',
                'amount' => (float) $pay->amount,
                'status' => $pay->status,
                'due_date' => $pay->period_end?->toDateString() ?? null,
                'days_overdue' => $pay->period_end && $pay->period_end->lt(now())
                    ? (int) now()->diffInDays($pay->period_end)
                    : null,
                'link' => "/hostingy/{$pay->hosting_id}",
            ]);

        return $fromInvoices->concat($fromOrders)->concat($fromHostings)
            ->sortByDesc('amount')
            ->values()
            ->toArray();
    }
}
