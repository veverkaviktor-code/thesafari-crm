import { useCallback, useEffect, useRef, useState } from 'react';
import { router } from '@inertiajs/react';
import { Calculator, CheckSquare, FileText, Globe, MessageSquare, Search, User, X } from 'lucide-react';

interface SearchResult {
    id: number;
    title: string;
    subtitle: string | null;
    link: string;
    type: string;
}

interface SearchResults {
    customers: SearchResult[];
    websites: SearchResult[];
    orders: SearchResult[];
    invoices: SearchResult[];
    estimates: SearchResult[];
    tickets: SearchResult[];
    tasks: SearchResult[];
}

const sectionOrder: (keyof SearchResults)[] = [
    'customers',
    'websites',
    'orders',
    'invoices',
    'estimates',
    'tickets',
    'tasks',
];

const typeConfig: Record<string, { icon: typeof User; label: string; color: string }> = {
    customer:     { icon: User,          label: 'Zákazníci',   color: 'text-amber-500' },
    website:      { icon: Globe,         label: 'Služby',      color: 'text-emerald-500' },
    order:        { icon: FileText,      label: 'Zakázky',     color: 'text-primary' },
    invoice:      { icon: FileText,      label: 'Faktury',     color: 'text-[#D4A574]' },
    estimate:     { icon: Calculator,    label: 'Kalkulace',   color: 'text-amber-400' },
    ticket:       { icon: MessageSquare, label: 'Zprávy',      color: 'text-orange-500' },
    task:         { icon: CheckSquare,   label: 'Úkoly',       color: 'text-violet-500' },
};

interface Props {
    open: boolean;
    onClose: () => void;
}

export default function SearchPalette({ open, onClose }: Props) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<SearchResults | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);

    // All results flattened for keyboard navigation
    const allResults: SearchResult[] = results
        ? sectionOrder.flatMap((key) => results[key] ?? [])
        : [];

    const search = useCallback(async (q: string) => {
        if (q.length < 2) {
            setResults(null);
            return;
        }
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setLoading(true);
        try {
            const res = await fetch(`/search?q=${encodeURIComponent(q)}`, {
                signal: controller.signal,
                headers: { 'Accept': 'application/json' },
            });
            const data = await res.json();
            setResults(data.results);
            setSelectedIndex(0);
        } catch {
            // aborted or error
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!open) {
            setQuery('');
            setResults(null);
            setSelectedIndex(0);
            return;
        }
        setTimeout(() => inputRef.current?.focus(), 50);
    }, [open]);

    useEffect(() => {
        const timer = setTimeout(() => search(query), 200);
        return () => clearTimeout(timer);
    }, [query, search]);

    const navigate = (link: string) => {
        onClose();
        router.visit(link);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex((i) => Math.min(i + 1, allResults.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex((i) => Math.max(i - 1, 0));
        } else if (e.key === 'Enter' && allResults[selectedIndex]) {
            navigate(allResults[selectedIndex].link);
        }
    };

    if (!open) return null;

    const hasResults = allResults.length > 0;
    const sections = results
        ? sectionOrder.filter((k) => (results[k] ?? []).length > 0)
        : [];

    let runningIndex = 0;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            {/* Dialog */}
            <div className="fixed left-1/2 top-[15%] z-50 w-full max-w-lg -translate-x-1/2 rounded-xl border border-border bg-card shadow-2xl">
                {/* Search input */}
                <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                    <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Hledat zákazníky, služby, zakázky, faktury..."
                        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    {query && (
                        <button onClick={() => setQuery('')} className="text-muted-foreground hover:text-foreground">
                            <X className="h-4 w-4" />
                        </button>
                    )}
                    <kbd className="rounded border border-border bg-accent px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                        ESC
                    </kbd>
                </div>

                {/* Results */}
                <div className="max-h-[400px] overflow-y-auto p-2">
                    {loading && query.length >= 2 && (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            Hledám...
                        </div>
                    )}

                    {!loading && query.length >= 2 && !hasResults && (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            Žádné výsledky pro „{query}"
                        </div>
                    )}

                    {!loading && hasResults && sections.map((section) => {
                        const items = results![section];
                        const config = typeConfig[items[0]?.type] ?? typeConfig.order;
                        const startIdx = runningIndex;
                        runningIndex += items.length;

                        return (
                            <div key={section} className="mb-1">
                                <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {config.label}
                                </p>
                                {items.map((item, i) => {
                                    const idx = startIdx + i;
                                    const Icon = config.icon;
                                    return (
                                        <button
                                            key={`${item.type}-${item.id}`}
                                            onClick={() => navigate(item.link)}
                                            onMouseEnter={() => setSelectedIndex(idx)}
                                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                                                idx === selectedIndex
                                                    ? 'bg-accent text-foreground'
                                                    : 'text-foreground/80 hover:bg-accent/50'
                                            }`}
                                        >
                                            <Icon className={`h-4 w-4 shrink-0 ${config.color}`} />
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-medium">{item.title}</p>
                                                {item.subtitle && (
                                                    <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        );
                    })}

                    {query.length < 2 && (
                        <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                            Začněte psát pro vyhledávání...
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
