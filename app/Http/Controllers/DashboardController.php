<?php

namespace App\Http\Controllers;

use App\Models\Invoice;
use App\Models\Order;
use App\Models\Subscription;
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
            'financialSummary' => $this->getFinancialSummary(),
            'revenueByDivision' => $this->getRevenueByDivision(),
            'expiringSubscriptions' => $this->getExpiringSubscriptions(),
            'revenueData' => $this->getRevenueData($request->input('period', '6m')),
            'recentActivity' => $this->getRecentActivity(),
            'recentTickets' => $this->getRecentTickets(),
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
        $activeSubscriptions = Subscription::where('status', 'aktivni')->get();
        $totalMRR = $activeSubscriptions->sum(fn($s) => $s->price_yearly / 12);
        $hostingMRR = $activeSubscriptions->where('type', 'hosting')->sum(fn($s) => $s->price_yearly / 12);
        $domainMRR = $activeSubscriptions->where('type', 'domena')->sum(fn($s) => $s->price_yearly / 12);

        return [
            'total' => round($totalMRR),
            'hosting' => round($hostingMRR),
            'domain' => round($domainMRR),
            'count' => $activeSubscriptions->count(),
        ];
    }

    private function getFinancialSummary(): array
    {
        $totalRevenue = (float) Invoice::where('status', 'zaplacena')->sum('total');
        $totalCosts = (float) DB::table('order_costs')->sum('amount');
        $profit = $totalRevenue - $totalCosts;
        $margin = $totalRevenue > 0 ? round(($profit / $totalRevenue) * 100) : 0;

        return [
            'revenue' => $totalRevenue,
            'costs' => $totalCosts,
            'profit' => $profit,
            'margin' => $margin,
        ];
    }

    private function getRevenueByDivision(): array
    {
        return Order::where('status', 'fakturovano')
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

    private function getExpiringSubscriptions(): array
    {
        return Subscription::where('status', 'aktivni')
            ->where('expires_at', '<=', now()->addDays(30))
            ->where('expires_at', '>=', now())
            ->with('customer:id,name,company')
            ->orderBy('expires_at')
            ->limit(5)
            ->get()
            ->toArray();
    }

    private function getRevenueData(string $period): array
    {
        $months = match ($period) {
            '1m' => 1,
            '3m' => 3,
            '6m' => 6,
            'rok' => 12,
            default => 6,
        };

        $startDate = now()->subMonths($months)->startOfMonth();

        // Revenue: paid invoices per month
        $revenue = Invoice::where('status', 'zaplacena')
            ->where('paid_at', '>=', $startDate)
            ->selectRaw("TO_CHAR(paid_at, 'YYYY-MM') as month, SUM(total) as revenue")
            ->groupByRaw("TO_CHAR(paid_at, 'YYYY-MM')")
            ->orderBy('month')
            ->pluck('revenue', 'month')
            ->toArray();

        // Costs: order_costs per month
        $costs = DB::table('order_costs')
            ->where('created_at', '>=', $startDate)
            ->selectRaw("TO_CHAR(created_at, 'YYYY-MM') as month, SUM(amount) as costs")
            ->groupByRaw("TO_CHAR(created_at, 'YYYY-MM')")
            ->orderBy('month')
            ->pluck('costs', 'month')
            ->toArray();

        // Build complete monthly series
        $data = [];
        $current = $startDate->copy();
        while ($current->lte(now())) {
            $key = $current->format('Y-m');
            $rev = (float) ($revenue[$key] ?? 0);
            $cost = (float) ($costs[$key] ?? 0);
            $data[] = [
                'month' => $current->format('m/Y'),
                'revenue' => $rev,
                'costs' => $cost,
                'profit' => $rev - $cost,
            ];
            $current->addMonth();
        }

        return $data;
    }

    private function getRecentActivity(): array
    {
        return Activity::with('causer:id,name')
            ->latest()
            ->limit(10)
            ->get()
            ->map(fn ($a) => [
                'id' => $a->id,
                'description' => $a->description,
                'subject_type' => class_basename($a->subject_type ?? ''),
                'subject_id' => $a->subject_id,
                'causer' => $a->causer?->name,
                'properties' => $a->properties,
                'created_at' => $a->created_at->toISOString(),
            ])
            ->toArray();
    }

    private function getRecentTickets(): array
    {
        return Ticket::with('customer:id,name,company')
            ->open()
            ->latest()
            ->limit(5)
            ->get()
            ->toArray();
    }
}
