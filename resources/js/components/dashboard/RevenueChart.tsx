import { useState } from 'react';
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';
import { cn } from '@/lib/utils';

type Period = '1M' | '3M' | '6M' | '1Y';

// Placeholder demo data
const demoData: Record<Period, { month: string; revenue: number; costs: number }[]> = {
    '1M': [
        { month: '1. týden', revenue: 45000, costs: 18000 },
        { month: '2. týden', revenue: 62000, costs: 24000 },
        { month: '3. týden', revenue: 38000, costs: 15000 },
        { month: '4. týden', revenue: 71000, costs: 28000 },
    ],
    '3M': [
        { month: 'Leden', revenue: 185000, costs: 72000 },
        { month: 'Únor', revenue: 210000, costs: 85000 },
        { month: 'Březen', revenue: 195000, costs: 78000 },
    ],
    '6M': [
        { month: 'Říjen', revenue: 165000, costs: 68000 },
        { month: 'Listopad', revenue: 178000, costs: 71000 },
        { month: 'Prosinec', revenue: 220000, costs: 92000 },
        { month: 'Leden', revenue: 185000, costs: 72000 },
        { month: 'Únor', revenue: 210000, costs: 85000 },
        { month: 'Březen', revenue: 195000, costs: 78000 },
    ],
    '1Y': [
        { month: 'Dub', revenue: 142000, costs: 58000 },
        { month: 'Kvě', revenue: 158000, costs: 62000 },
        { month: 'Čvn', revenue: 135000, costs: 55000 },
        { month: 'Čvc', revenue: 120000, costs: 48000 },
        { month: 'Srp', revenue: 145000, costs: 60000 },
        { month: 'Zář', revenue: 168000, costs: 65000 },
        { month: 'Říj', revenue: 165000, costs: 68000 },
        { month: 'Lis', revenue: 178000, costs: 71000 },
        { month: 'Pro', revenue: 220000, costs: 92000 },
        { month: 'Led', revenue: 185000, costs: 72000 },
        { month: 'Úno', revenue: 210000, costs: 85000 },
        { month: 'Bře', revenue: 195000, costs: 78000 },
    ],
};

const periods: { value: Period; label: string }[] = [
    { value: '1M', label: '1M' },
    { value: '3M', label: '3M' },
    { value: '6M', label: '6M' },
    { value: '1Y', label: 'Rok' },
];

const formatCurrency = (v: number) =>
    new Intl.NumberFormat('cs-CZ', {
        style: 'currency',
        currency: 'CZK',
        maximumFractionDigits: 0,
    }).format(v);

interface Props {
    data?: Record<Period, { month: string; revenue: number; costs: number }[]>;
}

export default function RevenueChart({ data }: Props) {
    const [period, setPeriod] = useState<Period>('6M');
    const chartData = (data ?? demoData)[period];

    return (
        <div className="rounded-xl border border-white/5 bg-[#1a1a22] p-5">
            <div className="mb-4 flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-semibold text-gray-300">
                        Příjmy vs Náklady
                    </h3>
                    <p className="mt-0.5 text-xs text-gray-500">
                        Přehled financí za období
                    </p>
                </div>
                <div className="flex gap-1 rounded-lg bg-white/5 p-1">
                    {periods.map((p) => (
                        <button
                            key={p.value}
                            onClick={() => setPeriod(p.value)}
                            className={cn(
                                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                                period === p.value
                                    ? 'bg-[#D97706] text-white'
                                    : 'text-gray-400 hover:text-gray-300',
                            )}
                        >
                            {p.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Legend */}
            <div className="mb-3 flex gap-4">
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-[#D97706]" />
                    <span className="text-xs text-gray-400">Příjmy</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-gray-500" />
                    <span className="text-xs text-gray-400">Náklady</span>
                </div>
            </div>

            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient
                                id="revenueGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="#D97706"
                                    stopOpacity={0.3}
                                />
                                <stop
                                    offset="100%"
                                    stopColor="#D97706"
                                    stopOpacity={0}
                                />
                            </linearGradient>
                            <linearGradient
                                id="costsGradient"
                                x1="0"
                                y1="0"
                                x2="0"
                                y2="1"
                            >
                                <stop
                                    offset="0%"
                                    stopColor="#6b7280"
                                    stopOpacity={0.2}
                                />
                                <stop
                                    offset="100%"
                                    stopColor="#6b7280"
                                    stopOpacity={0}
                                />
                            </linearGradient>
                        </defs>
                        <CartesianGrid
                            stroke="#ffffff10"
                            strokeDasharray="3 3"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="month"
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fill: '#9ca3af', fontSize: 12 }}
                            axisLine={false}
                            tickLine={false}
                            tickFormatter={(v) =>
                                `${Math.round(v / 1000)}k`
                            }
                            width={45}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1a1a22',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#e5e7eb',
                                fontSize: '13px',
                            }}
                            formatter={(value: number, name: string) => [
                                formatCurrency(value),
                                name === 'revenue' ? 'Příjmy' : 'Náklady',
                            ]}
                            labelStyle={{ color: '#9ca3af', marginBottom: 4 }}
                        />
                        <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="#D97706"
                            strokeWidth={2}
                            fill="url(#revenueGradient)"
                        />
                        <Area
                            type="monotone"
                            dataKey="costs"
                            stroke="#6b7280"
                            strokeWidth={2}
                            fill="url(#costsGradient)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
