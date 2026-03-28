<?php

namespace App\Http\Controllers;

use App\Models\Domain;
use App\Models\Hosting;
use App\Models\HostingPayment;
use App\Models\Invoice;
use App\Models\Order;
use App\Models\OrderCost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class FinanceController extends Controller
{
    public function index(Request $request)
    {
        $period = $request->input('period', '1m');

        return Inertia::render('Finance', [
            'metrics' => $this->getOverallMetrics($period),
            'period' => $period,
            'profitabilityTrend' => $this->getProfitabilityTrend(),
            'revenueBreakdown' => $this->getRevenueBreakdown(),
            'invoiceAging' => $this->getInvoiceAging(),
            'cashflow' => $this->getCashflow(),
            'receivables' => $this->getDetailedReceivables(),
            'mrrDetail' => $this->getMrrDetail(),
        ]);
    }

    private function getPeriodStart(string $period): ?\Carbon\Carbon
    {
        return match ($period) {
            '1m' => now()->subMonth()->startOfDay(),
            '3m' => now()->subMonths(3)->startOfDay(),
            '6m' => now()->subMonths(6)->startOfDay(),
            '1y' => now()->subYear()->startOfDay(),
            default => null, // 'all'
        };
    }

    private function getPeriodMonths(string $period): ?int
    {
        return match ($period) {
            '1m' => 1,
            '3m' => 3,
            '6m' => 6,
            '1y' => 12,
            default => null,
        };
    }

    private function getOverallMetrics(string $period = 'all'): array
    {
        $from = $this->getPeriodStart($period);
        $months = $this->getPeriodMonths($period);

        // Order revenue (completed/invoiced work)
        $orderQuery = Order::whereIn('status', ['hotovo', 'fakturovano']);
        if ($from) $orderQuery->where('created_at', '>=', $from);
        $orderRevenue = (float) $orderQuery->sum('price');

        // Hosting payments (paid)
        $hostingPayQuery = HostingPayment::where('status', 'zaplaceno');
        if ($from) $hostingPayQuery->where('paid_at', '>=', $from);
        $paidHostingPayments = (float) $hostingPayQuery->sum('amount');

        $totalRevenue = $orderRevenue + $paidHostingPayments;

        // Order costs
        $costQuery = DB::table('order_costs');
        if ($from) $costQuery->where('created_at', '>=', $from);
        $orderCosts = (float) $costQuery->sum('amount');

        // Hosting costs (pro-rated to period)
        $hostingCostsYearly = (float) Hosting::where('status', 'aktivni')
            ->where('is_external', false)
            ->where('is_free', false)
            ->sum('cost_yearly');
        $hostingCosts = $months ? $hostingCostsYearly * $months / 12 : $hostingCostsYearly;

        // Domain costs (pro-rated to period)
        $domainCostsYearly = (float) Domain::where('status', 'aktivni')
            ->where('is_registered_by_us', true)
            ->sum('cost_yearly');
        $domainCosts = $months ? $domainCostsYearly * $months / 12 : $domainCostsYearly;

        // VPS costs (pro-rated to period)
        $vpsCostsYearly = (float) \App\Models\VpsServer::active()->sum('price_yearly');
        $vpsCosts = $months ? $vpsCostsYearly * $months / 12 : $vpsCostsYearly;

        $totalCosts = $orderCosts + $hostingCosts + $domainCosts + $vpsCosts;

        $profit = $totalRevenue - $totalCosts;

        // Unpaid total
        $unpaidInvoices = (float) Invoice::whereIn('status', ['vystavena', 'odeslana', 'po_splatnosti'])->sum('total');
        $unpaidHostingPayments = (float) HostingPayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])->sum('amount');
        $unpaidTotal = $unpaidInvoices + $unpaidHostingPayments;

        // MRR calculation
        $ownHostings = Hosting::where('status', 'aktivni')
            ->where('is_external', false)
            ->where('is_free', false)
            ->with('managementPlan')
            ->get();

        $hostingMrr = $ownHostings->sum(fn ($h) => (float) ($h->sell_yearly ?: 0) / 12);
        $mgmtMrr = $ownHostings->sum(fn ($h) => $h->managementPlan?->price_monthly ?? 0);
        $domainMrr = (float) Domain::where('status', 'aktivni')
            ->where('is_registered_by_us', true)
            ->where('sell_yearly', '>', 0)
            ->sum('sell_yearly') / 12;
        $vpsMRR = (float) \App\Models\VpsServer::active()->sum('price_yearly') / 12;

        $mrr = round($hostingMrr + $domainMrr + $mgmtMrr + $vpsMRR);
        $arr = $mrr * 12;

        return [
            'total_revenue' => round($totalRevenue),
            'total_costs' => round($totalCosts),
            'profit' => round($profit),
            'unpaid_total' => round($unpaidTotal),
            'unpaid_invoices' => round($unpaidInvoices),
            'unpaid_sub_payments' => round($unpaidHostingPayments),
            'mrr' => $mrr,
            'arr' => $arr,
        ];
    }

    private function getProfitabilityTrend(): array
    {
        $startDate = now()->subMonths(12)->startOfMonth();
        $monthNames = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];

        $revenue = Order::whereIn('status', ['hotovo', 'fakturovano'])
            ->where('created_at', '>=', $startDate)
            ->selectRaw("TO_CHAR(created_at, 'YYYY-MM') as month, SUM(price) as revenue")
            ->groupByRaw("TO_CHAR(created_at, 'YYYY-MM')")
            ->pluck('revenue', 'month')
            ->toArray();

        $costs = DB::table('order_costs')
            ->where('created_at', '>=', $startDate)
            ->selectRaw("TO_CHAR(created_at, 'YYYY-MM') as month, SUM(amount) as costs")
            ->groupByRaw("TO_CHAR(created_at, 'YYYY-MM')")
            ->pluck('costs', 'month')
            ->toArray();

        // Paid hosting payments by month
        $hostingRevenue = HostingPayment::where('status', 'zaplaceno')
            ->where('paid_at', '>=', $startDate)
            ->selectRaw("TO_CHAR(paid_at, 'YYYY-MM') as month, SUM(amount) as revenue")
            ->groupByRaw("TO_CHAR(paid_at, 'YYYY-MM')")
            ->pluck('revenue', 'month')
            ->toArray();

        $data = [];
        $current = $startDate->copy();
        while ($current->lte(now())) {
            $key = $current->format('Y-m');
            $rev = (float) ($revenue[$key] ?? 0) + (float) ($hostingRevenue[$key] ?? 0);
            $cost = (float) ($costs[$key] ?? 0);
            $data[] = [
                'month' => $monthNames[$current->month - 1] . ' ' . $current->format("'y"),
                'revenue' => round($rev),
                'costs' => round($cost),
                'profit' => round($rev - $cost),
            ];
            $current->addMonth();
        }

        return $data;
    }

    private function getRevenueBreakdown(): array
    {
        // Orders (one-time work)
        $orderTotal = (float) Order::whereIn('status', ['hotovo', 'fakturovano'])->sum('price');

        // Hosting ARR
        $ownHostings = Hosting::where('status', 'aktivni')
            ->where('is_external', false)
            ->where('is_free', false)
            ->with('managementPlan')
            ->get();

        $hostingARR = $ownHostings->sum(fn($h) =>
            (float) ($h->sell_yearly ?: 0)
            + ($h->managementPlan?->price_monthly ?? 0) * 12
        );

        // Domain ARR
        $domainARR = (float) Domain::where('status', 'aktivni')
            ->where('is_registered_by_us', true)
            ->where('sell_yearly', '>', 0)
            ->sum('sell_yearly');

        $vpsARR = (float) \App\Models\VpsServer::active()->sum('price_yearly');

        return [
            ['label' => 'Zakázky', 'value' => round($orderTotal), 'color' => 'var(--chart-1)'],
            ['label' => 'Hostingy', 'value' => round($hostingARR), 'color' => 'var(--chart-2)'],
            ['label' => 'Domény', 'value' => round($domainARR), 'color' => 'var(--chart-3)'],
            ['label' => 'VPS', 'value' => round($vpsARR), 'color' => 'var(--chart-5)'],
        ];
    }

    private function getInvoiceAging(): array
    {
        $unpaid = Invoice::whereIn('status', ['vystavena', 'odeslana', 'po_splatnosti'])
            ->whereNotNull('due_date')
            ->get();

        $buckets = [
            'current' => ['label' => 'Aktuální (0-30 dní)', 'count' => 0, 'total' => 0],
            '30_60' => ['label' => '30-60 dní', 'count' => 0, 'total' => 0],
            '60_90' => ['label' => '60-90 dní', 'count' => 0, 'total' => 0],
            '90_plus' => ['label' => '90+ dní', 'count' => 0, 'total' => 0],
        ];

        foreach ($unpaid as $inv) {
            $daysOverdue = max(0, (int) now()->diffInDays($inv->due_date, false) * -1);

            if ($daysOverdue <= 30) {
                $buckets['current']['count']++;
                $buckets['current']['total'] += (float) $inv->total;
            } elseif ($daysOverdue <= 60) {
                $buckets['30_60']['count']++;
                $buckets['30_60']['total'] += (float) $inv->total;
            } elseif ($daysOverdue <= 90) {
                $buckets['60_90']['count']++;
                $buckets['60_90']['total'] += (float) $inv->total;
            } else {
                $buckets['90_plus']['count']++;
                $buckets['90_plus']['total'] += (float) $inv->total;
            }
        }

        return array_map(fn($b) => [
            'label' => $b['label'],
            'count' => $b['count'],
            'total' => round($b['total']),
        ], array_values($buckets));
    }

    private function getCashflow(): array
    {
        $startDate = now()->subMonths(12)->startOfMonth();
        $monthNames = ['Led', 'Úno', 'Bře', 'Dub', 'Kvě', 'Čvn', 'Čvc', 'Srp', 'Zář', 'Říj', 'Lis', 'Pro'];

        // Cash IN: paid invoices by paid_at (exclude barter — no real cash)
        $invoiceIncome = Invoice::where('status', 'zaplacena')
            ->whereNotNull('paid_at')
            ->where('paid_at', '>=', $startDate)
            ->where(fn ($q) => $q->whereNull('payment_method')->orWhere('payment_method', '!=', 'barter'))
            ->selectRaw("TO_CHAR(paid_at, 'YYYY-MM') as month, SUM(total) as amount")
            ->groupByRaw("TO_CHAR(paid_at, 'YYYY-MM')")
            ->pluck('amount', 'month')
            ->toArray();

        // Cash IN: paid hosting payments by paid_at
        $hostingIncome = HostingPayment::where('status', 'zaplaceno')
            ->whereNotNull('paid_at')
            ->where('paid_at', '>=', $startDate)
            ->selectRaw("TO_CHAR(paid_at, 'YYYY-MM') as month, SUM(amount) as amount")
            ->groupByRaw("TO_CHAR(paid_at, 'YYYY-MM')")
            ->pluck('amount', 'month')
            ->toArray();

        // Cash OUT: order costs by created_at
        $orderExpenses = DB::table('order_costs')
            ->where('created_at', '>=', $startDate)
            ->selectRaw("TO_CHAR(created_at, 'YYYY-MM') as month, SUM(amount) as amount")
            ->groupByRaw("TO_CHAR(created_at, 'YYYY-MM')")
            ->pluck('amount', 'month')
            ->toArray();

        $data = [];
        $cumulative = 0;
        $current = $startDate->copy();

        while ($current->lte(now())) {
            $key = $current->format('Y-m');
            $income = (float) ($invoiceIncome[$key] ?? 0) + (float) ($hostingIncome[$key] ?? 0);
            $expenses = (float) ($orderExpenses[$key] ?? 0);
            $net = $income - $expenses;
            $cumulative += $net;

            $data[] = [
                'month' => $monthNames[$current->month - 1] . ' ' . $current->format("'y"),
                'income' => round($income),
                'expenses' => round($expenses),
                'net' => round($net),
                'cumulative' => round($cumulative),
            ];
            $current->addMonth();
        }

        return $data;
    }

    private function getDetailedReceivables(): array
    {
        $fromInvoices = Invoice::whereIn('status', ['vystavena', 'odeslana', 'po_splatnosti'])
            ->with('customer:id,name,company')
            ->get()
            ->map(fn($inv) => [
                'id' => $inv->id,
                'customer_name' => $inv->customer?->company ?: $inv->customer?->name ?? 'Neznámý',
                'type' => 'invoice',
                'label' => "Faktura {$inv->invoice_number}",
                'amount' => (float) $inv->total,
                'status' => $inv->status,
                'due_date' => $inv->due_date?->toDateString(),
                'days_overdue' => $inv->due_date && $inv->due_date->lt(now())
                    ? (int) now()->diffInDays($inv->due_date) : null,
                'link' => "/faktury/{$inv->id}",
            ]);

        $fromOrders = Order::whereIn('status', ['hotovo', 'fakturovano'])
            ->whereDoesntHave('invoice')
            ->where('price', '>', 0)
            ->with('customer:id,name,company')
            ->get()
            ->map(fn($order) => [
                'id' => $order->id,
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
            ->map(fn($pay) => [
                'id' => $pay->id,
                'customer_name' => $pay->hosting?->customer?->company ?: $pay->hosting?->customer?->name ?? 'Neznámý',
                'type' => 'hosting',
                'label' => $pay->hosting?->name ?? 'Hosting',
                'amount' => (float) $pay->amount,
                'status' => $pay->status,
                'due_date' => $pay->period_end?->toDateString(),
                'days_overdue' => $pay->period_end && $pay->period_end->lt(now())
                    ? (int) now()->diffInDays($pay->period_end) : null,
                'link' => "/hostingy/{$pay->hosting_id}",
            ]);

        return $fromInvoices->concat($fromOrders)->concat($fromHostings)
            ->sortByDesc('days_overdue')
            ->values()
            ->toArray();
    }

    private function getMrrDetail(): array
    {
        // Hosting MRR
        $ownHostings = Hosting::where('status', 'aktivni')
            ->where('is_external', false)
            ->where('is_free', false)
            ->with('managementPlan')
            ->get();

        $hostingRevenue = $ownHostings->sum(fn ($h) => (float) ($h->sell_yearly ?: 0) / 12);
        $hostingCost = $ownHostings->sum(fn ($h) => (float) $h->cost_yearly / 12);

        $detail = [];
        $detail[] = [
            'type' => 'hostings',
            'label' => 'Hostingy',
            'count' => $ownHostings->count(),
            'mrr' => round($hostingRevenue),
            'arr' => round($hostingRevenue * 12),
            'costs_monthly' => round($hostingCost),
            'costs_annual' => round($hostingCost * 12),
            'margin_monthly' => round($hostingRevenue - $hostingCost),
            'margin_annual' => round(($hostingRevenue - $hostingCost) * 12),
        ];

        // Domain MRR
        $ownDomains = Domain::where('status', 'aktivni')
            ->where('is_registered_by_us', true)
            ->where('sell_yearly', '>', 0)
            ->get();

        $domainRevenue = $ownDomains->sum(fn ($d) => (float) $d->sell_yearly / 12);
        $domainCost = $ownDomains->sum(fn ($d) => (float) $d->cost_yearly / 12);

        $detail[] = [
            'type' => 'domains',
            'label' => 'Domény',
            'count' => $ownDomains->count(),
            'mrr' => round($domainRevenue),
            'arr' => round($domainRevenue * 12),
            'costs_monthly' => round($domainCost),
            'costs_annual' => round($domainCost * 12),
            'margin_monthly' => round($domainRevenue - $domainCost),
            'margin_annual' => round(($domainRevenue - $domainCost) * 12),
        ];

        // Management MRR
        $mgmtRevenue = $ownHostings->sum(fn ($h) => $h->managementPlan?->price_monthly ?? 0);
        $mgmtCount = $ownHostings->filter(fn ($h) => $h->management_plan_id !== null)->count();

        $detail[] = [
            'type' => 'management',
            'label' => 'Správa',
            'count' => $mgmtCount,
            'mrr' => round($mgmtRevenue),
            'arr' => round($mgmtRevenue * 12),
            'costs_monthly' => 0,
            'costs_annual' => 0,
            'margin_monthly' => round($mgmtRevenue),
            'margin_annual' => round($mgmtRevenue * 12),
        ];

        // VPS
        $vpsMRR = (float) \App\Models\VpsServer::active()->sum('price_yearly') / 12;
        $vpsCount = \App\Models\VpsServer::active()->count();
        $detail[] = [
            'type' => 'vps',
            'label' => 'VPS servery',
            'count' => $vpsCount,
            'mrr' => round($vpsMRR),
            'arr' => round($vpsMRR * 12),
            'costs_monthly' => round($vpsMRR),
            'costs_annual' => round($vpsMRR * 12),
            'margin_monthly' => 0,
            'margin_annual' => 0,
        ];

        // Expiring soon (hostings + domains combined)
        $expiringHostings = Hosting::where('status', 'aktivni')
            ->where('is_external', false)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(30))
            ->with('customer:id,name')
            ->orderBy('expires_at')
            ->get()
            ->map(fn($h) => [
                'id' => $h->id,
                'name' => $h->name,
                'type' => 'hosting',
                'expires_at' => $h->expires_at->toDateString(),
                'days' => $h->daysUntilExpiry(),
                'customer_name' => $h->customer?->name,
                'mrr' => round((float) ($h->sell_yearly ?: 0) / 12),
                'link' => "/hostingy/{$h->id}",
            ]);

        $expiringDomains = Domain::where('status', 'aktivni')
            ->where('is_registered_by_us', true)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(30))
            ->with('customer:id,name')
            ->orderBy('expires_at')
            ->get()
            ->map(fn($d) => [
                'id' => $d->id,
                'name' => $d->name,
                'type' => 'domain',
                'expires_at' => $d->expires_at->toDateString(),
                'days' => $d->daysUntilExpiry(),
                'customer_name' => $d->customer?->name,
                'mrr' => round((float) ($d->sell_yearly ?: 0) / 12),
                'link' => "/domeny/{$d->id}",
            ]);

        $expiringSoon = $expiringHostings->concat($expiringDomains)
            ->sortBy('days')
            ->values()
            ->toArray();

        // Totals
        $totalMRR = collect($detail)->sum('mrr');
        $totalCosts = collect($detail)->sum('costs_monthly');

        return [
            'detail' => $detail,
            'expiring_soon' => $expiringSoon,
            'totals' => [
                'mrr' => $totalMRR,
                'arr' => $totalMRR * 12,
                'costs_monthly' => $totalCosts,
                'margin_monthly' => $totalMRR - $totalCosts,
            ],
        ];
    }
}
