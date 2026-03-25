<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\OrderCost;
use App\Models\Website;
use App\Models\WebsitePayment;
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

        // Website payments (paid)
        $webPayQuery = WebsitePayment::where('status', 'zaplaceno');
        if ($from) $webPayQuery->where('paid_at', '>=', $from);
        $paidWebPayments = (float) $webPayQuery->sum('amount');

        $totalRevenue = $orderRevenue + $paidWebPayments;

        // Order costs
        $costQuery = DB::table('order_costs');
        if ($from) $costQuery->where('created_at', '>=', $from);
        $orderCosts = (float) $costQuery->sum('amount');

        // Website costs (pro-rated to period)
        $webCostsYearly = (float) Website::where('status', 'aktivni')
            ->where('is_external', false)
            ->where('is_free', false)
            ->sum('cost_yearly');
        $webCosts = $months ? $webCostsYearly * $months / 12 : $webCostsYearly;

        // VPS costs (pro-rated to period)
        $vpsCostsYearly = (float) \App\Models\VpsServer::active()->sum('price_yearly');
        $vpsCosts = $months ? $vpsCostsYearly * $months / 12 : $vpsCostsYearly;

        $totalCosts = $orderCosts + $webCosts + $vpsCosts;

        $profit = $totalRevenue - $totalCosts;

        // Unpaid total
        $unpaidInvoices = (float) Invoice::whereIn('status', ['vystavena', 'odeslana', 'po_splatnosti'])->sum('total');
        $unpaidWebPayments = (float) WebsitePayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])->sum('amount');
        $unpaidTotal = $unpaidInvoices + $unpaidWebPayments;

        // MRR calculation — simplified: always sell_yearly / 12 + management plan
        $ownWebsites = Website::where('status', 'aktivni')->where('is_external', false)->where('is_free', false)->whereNull('alias_of_id')->with('managementPlan')->get();
        $mrrCalc = fn($website) =>
            (float) ($website->sell_yearly ?: 0) / 12
            + ($website->managementPlan?->price_monthly ?? 0);
        $totalMRR = $ownWebsites->sum($mrrCalc);
        $vpsMRR = (float) \App\Models\VpsServer::active()->sum('price_yearly') / 12;
        $mrr = round($totalMRR + $vpsMRR);
        $arr = $mrr * 12;

        return [
            'total_revenue' => round($totalRevenue),
            'total_costs' => round($totalCosts),
            'profit' => round($profit),
            'unpaid_total' => round($unpaidTotal),
            'unpaid_invoices' => round($unpaidInvoices),
            'unpaid_sub_payments' => round($unpaidWebPayments),
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

        // Paid website payments by month
        $webRevenue = WebsitePayment::where('status', 'zaplaceno')
            ->where('paid_at', '>=', $startDate)
            ->selectRaw("TO_CHAR(paid_at, 'YYYY-MM') as month, SUM(amount) as revenue")
            ->groupByRaw("TO_CHAR(paid_at, 'YYYY-MM')")
            ->pluck('revenue', 'month')
            ->toArray();

        $data = [];
        $current = $startDate->copy();
        while ($current->lte(now())) {
            $key = $current->format('Y-m');
            $rev = (float) ($revenue[$key] ?? 0) + (float) ($webRevenue[$key] ?? 0);
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

        // Website ARR — simplified: sell_yearly + management plan * 12
        $ownWebsites = Website::where('status', 'aktivni')
            ->where('is_external', false)
            ->where('is_free', false)
            ->with('managementPlan')
            ->get();

        $websiteARR = $ownWebsites->sum(fn($w) =>
            (float) ($w->sell_yearly ?: 0)
            + ($w->managementPlan?->price_monthly ?? 0) * 12
        );

        $vpsARR = (float) \App\Models\VpsServer::active()->sum('price_yearly');

        return [
            ['label' => 'Zakázky', 'value' => round($orderTotal), 'color' => 'var(--chart-1)'],
            ['label' => 'Weby', 'value' => round($websiteARR), 'color' => 'var(--chart-2)'],
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

        // Cash IN: paid website payments by paid_at
        $webIncome = WebsitePayment::where('status', 'zaplaceno')
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
            $income = (float) ($invoiceIncome[$key] ?? 0) + (float) ($webIncome[$key] ?? 0);
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
        // Unpaid invoices
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

        // Completed orders without invoice
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

        // Unpaid website payments
        $fromWebsites = WebsitePayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])
            ->with(['website.customer:id,name,company'])
            ->get()
            ->map(fn($pay) => [
                'id' => $pay->id,
                'customer_name' => $pay->website?->customer?->company ?: $pay->website?->customer?->name ?? 'Neznámý',
                'type' => 'website',
                'label' => $pay->website?->name ?? 'Web',
                'amount' => (float) $pay->amount,
                'status' => $pay->status,
                'due_date' => $pay->period_end?->toDateString(),
                'days_overdue' => $pay->period_end && $pay->period_end->lt(now())
                    ? (int) now()->diffInDays($pay->period_end) : null,
                'link' => "/webove-sluzby/{$pay->website_id}",
            ]);

        return $fromInvoices->concat($fromOrders)->concat($fromWebsites)
            ->sortByDesc('days_overdue')
            ->values()
            ->toArray();
    }

    private function getMrrDetail(): array
    {
        $ownWebsites = Website::where('status', 'aktivni')
            ->where('is_external', false)
            ->where('is_free', false)
            ->with('managementPlan')
            ->get();

        // Simplified: always sell_yearly / 12 + management plan
        $revenueCalc = fn($website) =>
            (float) ($website->sell_yearly ?: 0) / 12
            + ($website->managementPlan?->price_monthly ?? 0);

        $costCalc = fn($website) => (float) $website->cost_yearly / 12;

        $monthlyRevenue = $ownWebsites->sum($revenueCalc);
        $monthlyCost = $ownWebsites->sum($costCalc);

        $detail = [];
        $detail[] = [
            'type' => 'websites',
            'label' => 'Weby',
            'count' => $ownWebsites->count(),
            'mrr' => round($monthlyRevenue),
            'arr' => round($monthlyRevenue * 12),
            'costs_monthly' => round($monthlyCost),
            'costs_annual' => round($monthlyCost * 12),
            'margin_monthly' => round($monthlyRevenue - $monthlyCost),
            'margin_annual' => round(($monthlyRevenue - $monthlyCost) * 12),
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

        // Expiring soon
        $expiringSoon = Website::where('status', 'aktivni')
            ->where('is_external', false)
            ->whereNotNull('hosting_expires_at')
            ->where('hosting_expires_at', '>=', now())
            ->where('hosting_expires_at', '<=', now()->addDays(30))
            ->with('customer:id,name')
            ->orderBy('hosting_expires_at')
            ->get()
            ->map(fn($w) => [
                'id' => $w->id,
                'name' => $w->name,
                'hosting_expires_at' => $w->hosting_expires_at->toDateString(),
                'days' => $w->daysUntilExpiry(),
                'customer_name' => $w->customer?->name,
                'mrr' => round($revenueCalc($w)),
            ])
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
