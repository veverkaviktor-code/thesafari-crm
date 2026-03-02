import AuthenticatedLayout from '@/layouts/AuthenticatedLayout';

export default function Dashboard() {
    return (
        <AuthenticatedLayout
            title="Dashboard"
            breadcrumbs={[{ label: 'Dashboard' }]}
        >
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {/* Stat cards placeholder */}
                {[
                    { label: 'Zákazníci', value: '0' },
                    { label: 'Zakázky', value: '0' },
                    { label: 'Faktury', value: '0' },
                    { label: 'Požadavky', value: '0' },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="rounded-xl border border-white/5 bg-[#1a1a22] p-6"
                    >
                        <p className="text-sm text-gray-400">{stat.label}</p>
                        <p className="mt-2 text-3xl font-semibold text-white">
                            {stat.value}
                        </p>
                    </div>
                ))}
            </div>
        </AuthenticatedLayout>
    );
}
