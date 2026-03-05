<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\OrderCost;
use App\Models\Subscription;
use App\Models\SubscriptionPayment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class FinanceController extends Controller
{
    public function index(Request $request)
    {
        return Inertia::render('Finance', [
            'metrics' => $this->getOverallMetrics(),
            'profitabilityTrend' => $this->getProfitabilityTrend(),
            'revenueBreakdown' => $this->getRevenueBreakdown(),
            'invoiceAging' => $this->getInvoiceAging(),
            'cashflow' => $this->getCashflow(),
            'receivables' => $this->getDetailedReceivables(),
            'mrrDetail' => $this->getMrrDetail(),
        ]);
    }

    private function getOverallMetrics(): array
    {
        // Order revenue (completed/invoiced work)
        $orderRevenue = (float) Order::whereIn('status', ['hotovo', 'fakturovano'])->sum('price');

        // Subscription payments (paid)
        $paidSubPayments = (float) SubscriptionPayment::where('status', 'zaplaceno')->sum('amount');

        $totalRevenue = $orderRevenue + $paidSubPayments;

        // Order costs
        $orderCosts = (float) DB::table('order_costs')->sum('amount');

        // Subscription costs (annual, all active)
        $subCostsYearly = (float) Subscription::where('status', 'aktivni')
            ->where('is_external', false)
            ->sum('cost_yearly');

        // VPS costs
        $vpsCostsYearly = (float) \App\Models\VpsServer::active()->sum('price_yearly');

        $totalCosts = $orderCosts + $subCostsYearly + $vpsCostsYearly;

        $profit = $totalRevenue - $totalCosts;

        // Unpaid total
        $unpaidInvoices = (float) Invoice::whereIn('status', ['vystavena', 'odeslana', 'po_splatnosti'])->sum('total');
        $unpaidSubPayments = (float) SubscriptionPayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])->sum('amount');
        $unpaidTotal = $unpaidInvoices + $unpaidSubPayments;

        // MRR calculation
        $ownSubs = Subscription::where('status', 'aktivni')->where('is_external', false)->get();
        $mrrCalc = fn($sub) => $sub->billing_cycle === 'monthly'
            ? (float) $sub->monthly_price
            : (float) ($sub->sell_yearly ?: $sub->price_yearly) / 12;
        $totalMRR = $ownSubs->sum($mrrCalc);
        $vpsMRR = (float) \App\Models\VpsServer::active()->sum('price_yearly') / 12;
        $mrr = round($totalMRR + $vpsMRR);
        $arr = $mrr * 12;

        return [
            'total_revenue' => round($totalRevenue),
            'total_costs' => round($totalCosts),
            'profit' => round($profit),
            'unpaid_total' => round($unpaidTotal),
            'unpaid_invoices' => round($unpaidInvoices),
            'unpaid_sub_payments' => round($unpaidSubPayments),
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

        // Paid subscription payments by month
        $subRevenue = SubscriptionPayment::where('status', 'zaplaceno')
            ->where('paid_at', '>=', $startDate)
            ->selectRaw("TO_CHAR(paid_at, 'YYYY-MM') as month, SUM(amount) as revenue")
            ->groupByRaw("TO_CHAR(paid_at, 'YYYY-MM')")
            ->pluck('revenue', 'month')
            ->toArray();

        $data = [];
        $current = $startDate->copy();
        while ($current->lte(now())) {
            $key = $current->format('Y-m');
            $rev = (float) ($revenue[$key] ?? 0) + (float) ($subRevenue[$key] ?? 0);
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

        // Subscription breakdown
        $ownSubs = Subscription::where('status', 'aktivni')
            ->where('is_external', false)
            ->get();

        $arrCalc = fn($sub) => $sub->billing_cycle === 'monthly'
            ? (float) $sub->monthly_price * 12
            : (float) ($sub->sell_yearly ?: $sub->price_yearly);

        $hostingARR = $ownSubs->where('type', 'hosting')->sum($arrCalc);
        $domainARR = $ownSubs->where('type', 'domena')->sum($arrCalc);
        $serviceARR = $ownSubs->where('type', 'sluzba')->sum($arrCalc);
        $vpsARR = (float) \App\Models\VpsServer::active()->sum('price_yearly');

        return [
            ['label' => 'Zakázky', 'value' => round($orderTotal), 'color' => 'var(--chart-1)'],
            ['label' => 'Hosting', 'value' => round($hostingARR), 'color' => 'var(--chart-2)'],
            ['label' => 'Domény', 'value' => round($domainARR), 'color' => 'var(--chart-3)'],
            ['label' => 'Služby', 'value' => round($serviceARR), 'color' => 'var(--chart-4)'],
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

        // Cash IN: paid invoices by paid_at
        $invoiceIncome = Invoice::where('status', 'zaplacena')
            ->whereNotNull('paid_at')
            ->where('paid_at', '>=', $startDate)
            ->selectRaw("TO_CHAR(paid_at, 'YYYY-MM') as month, SUM(total) as amount")
            ->groupByRaw("TO_CHAR(paid_at, 'YYYY-MM')")
            ->pluck('amount', 'month')
            ->toArray();

        // Cash IN: paid subscription payments by paid_at
        $subIncome = SubscriptionPayment::where('status', 'zaplaceno')
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
            $income = (float) ($invoiceIncome[$key] ?? 0) + (float) ($subIncome[$key] ?? 0);
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

        // Unpaid subscription payments
        $fromSubs = SubscriptionPayment::whereIn('status', ['nezaplaceno', 'po_splatnosti'])
            ->with(['subscription.customer:id,name,company'])
            ->get()
            ->map(fn($pay) => [
                'id' => $pay->id,
                'customer_name' => $pay->subscription?->customer?->company ?: $pay->subscription?->customer?->name ?? 'Neznámý',
                'type' => 'subscription',
                'label' => $pay->subscription?->name ?? 'Služba',
                'amount' => (float) $pay->amount,
                'status' => $pay->status,
                'due_date' => $pay->period_end?->toDateString(),
                'days_overdue' => $pay->period_end && $pay->period_end->lt(now())
                    ? (int) now()->diffInDays($pay->period_end) : null,
                'link' => "/neniweb/{$pay->subscription_id}",
            ]);

        return $fromInvoices->concat($fromOrders)->concat($fromSubs)
            ->sortByDesc('days_overdue')
            ->values()
            ->toArray();
    }

    private function getMrrDetail(): array
    {
        $ownSubs = Subscription::where('status', 'aktivni')
            ->where('is_external', false)
            ->get();

        $revenueCalc = fn($sub) => $sub->billing_cycle === 'monthly'
            ? (float) $sub->monthly_price
            : (float) ($sub->sell_yearly ?: $sub->price_yearly) / 12;

        $costCalc = fn($sub) => (float) $sub->cost_yearly / 12;

        $types = ['hosting', 'domena', 'sluzba'];
        $labels = ['hosting' => 'Hosting', 'domena' => 'Domény', 'sluzba' => 'Služby'];
        $detail = [];

        foreach ($types as $type) {
            $subs = $ownSubs->where('type', $type);
            $monthlyRevenue = $subs->sum($revenueCalc);
            $monthlyCost = $subs->sum($costCalc);

            $detail[] = [
                'type' => $type,
                'label' => $labels[$type],
                'count' => $subs->count(),
                'mrr' => round($monthlyRevenue),
                'arr' => round($monthlyRevenue * 12),
                'costs_monthly' => round($monthlyCost),
                'costs_annual' => round($monthlyCost * 12),
                'margin_monthly' => round($monthlyRevenue - $monthlyCost),
                'margin_annual' => round(($monthlyRevenue - $monthlyCost) * 12),
            ];
        }

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
        $expiringSoon = Subscription::where('status', 'aktivni')
            ->where('is_external', false)
            ->whereNotNull('expires_at')
            ->where('expires_at', '>=', now())
            ->where('expires_at', '<=', now()->addDays(30))
            ->with('customer:id,name')
            ->orderBy('expires_at')
            ->get()
            ->map(fn($s) => [
                'id' => $s->id,
                'name' => $s->name,
                'type' => $s->type,
                'expires_at' => $s->expires_at->toDateString(),
                'days' => $s->daysUntilExpiry(),
                'customer_name' => $s->customer?->name,
                'mrr' => round($revenueCalc($s)),
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
