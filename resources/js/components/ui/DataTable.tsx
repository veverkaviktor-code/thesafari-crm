import { type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface Column<T> {
    key: string;
    label: string;
    sortable?: boolean;
    className?: string;
    render: (item: T) => ReactNode;
    filterOptions?: { value: string; label: string }[];
    filterKey?: string; // URL param key, defaults to key
}

interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    pagination?: PaginationMeta;
    searchValue?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;
    sortField?: string;
    sortDirection?: 'asc' | 'desc';
    onSort?: (field: string) => void;
    onPageChange?: (page: number) => void;
    onRowClick?: (item: T) => void;
    toolbar?: ReactNode;
    emptyMessage?: string;
    perPageOptions?: number[];
    onPerPageChange?: (perPage: number) => void;
    selectable?: boolean;
    selectedIds?: Set<number>;
    onSelectionChange?: (ids: Set<number>) => void;
    getItemId?: (item: T) => number;
    columnFilters?: Record<string, string>;
    onColumnFilterChange?: (filterKey: string, value: string) => void;
}

export default function DataTable<T>({
    columns,
    data,
    pagination,
    searchValue,
    onSearchChange,
    searchPlaceholder = 'Hledat...',
    sortField,
    sortDirection,
    onSort,
    onPageChange,
    onRowClick,
    toolbar,
    emptyMessage = 'Žádné záznamy',
    selectable = false,
    selectedIds = new Set(),
    onSelectionChange,
    getItemId,
    perPageOptions,
    onPerPageChange,
    columnFilters,
    onColumnFilterChange,
}: DataTableProps<T>) {
    const allVisibleIds: number[] = selectable && getItemId
        ? data.map(getItemId)
        : [];

    const allSelected =
        allVisibleIds.length > 0 &&
        allVisibleIds.every((id) => selectedIds.has(id));

    const someSelected =
        !allSelected && allVisibleIds.some((id) => selectedIds.has(id));

    const toggleAll = () => {
        if (!onSelectionChange) return;
        if (allSelected) {
            const next = new Set(selectedIds);
            allVisibleIds.forEach((id) => next.delete(id));
            onSelectionChange(next);
        } else {
            const next = new Set(selectedIds);
            allVisibleIds.forEach((id) => next.add(id));
            onSelectionChange(next);
        }
    };

    const toggleOne = (id: number) => {
        if (!onSelectionChange) return;
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        onSelectionChange(next);
    };

    return (
        <div className="rounded-xl border border-border bg-card">
            {/* Toolbar */}
            {(onSearchChange || toolbar) && (
                <div className="flex items-center gap-3 border-b border-border p-4">
                    {onSearchChange && (
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={searchValue ?? ''}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="border-border bg-muted pl-9 text-foreground placeholder:text-muted-foreground focus-visible:ring-ring/30"
                            />
                        </div>
                    )}
                    {toolbar && <div className="ml-auto flex items-center gap-2">{toolbar}</div>}
                </div>
            )}

            {/* Table */}
            <Table>
                <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                        {selectable && (
                            <TableHead className="w-[40px]">
                                <Checkbox
                                    checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                                    onCheckedChange={toggleAll}
                                    aria-label="Vybrat vše"
                                />
                            </TableHead>
                        )}
                        {columns.map((col) => {
                            const fk = col.filterKey ?? col.key;
                            const hasFilter = col.filterOptions && col.filterOptions.length > 0;
                            const filterActive = hasFilter && !!columnFilters?.[fk];
                            return (
                                <TableHead
                                    key={col.key}
                                    className={cn('text-muted-foreground', col.className)}
                                >
                                    <span className="flex items-center gap-1">
                                        <span
                                            className={cn(
                                                'flex items-center gap-1',
                                                col.sortable && 'cursor-pointer select-none hover:text-foreground',
                                            )}
                                            onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                                        >
                                            {col.label}
                                            {col.sortable && (
                                                <SortIcon
                                                    active={sortField === col.key}
                                                    direction={sortDirection}
                                                />
                                            )}
                                        </span>
                                        {hasFilter && onColumnFilterChange && (
                                            <ColumnFilterPopover
                                                options={col.filterOptions!}
                                                value={columnFilters?.[fk] ?? ''}
                                                onChange={(v) => onColumnFilterChange(fk, v)}
                                                active={filterActive}
                                            />
                                        )}
                                    </span>
                                </TableHead>
                            );
                        })}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell
                                colSpan={selectable ? columns.length + 1 : columns.length}
                                className="h-32 text-center text-muted-foreground"
                            >
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((item, i) => {
                            const itemId = selectable && getItemId ? getItemId(item) : undefined;
                            const isSelected = itemId !== undefined && selectedIds.has(itemId);

                            return (
                                <TableRow
                                    key={i}
                                    className={cn(
                                        'border-border',
                                        onRowClick && 'cursor-pointer hover:bg-accent',
                                        isSelected && 'bg-accent/50',
                                    )}
                                    onClick={
                                        onRowClick
                                            ? () => onRowClick(item)
                                            : undefined
                                    }
                                >
                                    {selectable && itemId !== undefined && (
                                        <TableCell
                                            className="w-[40px]"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleOne(itemId);
                                            }}
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleOne(itemId)}
                                                aria-label="Vybrat řádek"
                                            />
                                        </TableCell>
                                    )}
                                    {columns.map((col) => (
                                        <TableCell
                                            key={col.key}
                                            className={col.className}
                                        >
                                            {col.render(item)}
                                        </TableCell>
                                    ))}
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && (pagination.last_page > 1 || perPageOptions) && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                            {pagination.from && pagination.to
                                ? `${pagination.from}–${pagination.to} z ${pagination.total}`
                                : `${pagination.total} záznamů`}
                        </span>
                        {perPageOptions && onPerPageChange && (
                            <div className="flex items-center gap-1.5">
                                {perPageOptions.map((n) => (
                                    <button
                                        key={n}
                                        onClick={() => onPerPageChange(n)}
                                        className={cn(
                                            'rounded px-2 py-0.5 text-xs transition-colors',
                                            pagination.per_page === n
                                                ? 'bg-accent text-foreground font-medium'
                                                : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {pagination.last_page > 1 && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={pagination.current_page <= 1}
                                onClick={() =>
                                    onPageChange?.(pagination.current_page - 1)
                                }
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            {generatePageNumbers(
                                pagination.current_page,
                                pagination.last_page,
                            ).map((page, idx) =>
                                page === null ? (
                                    <span
                                        key={`dots-${idx}`}
                                        className="px-1 text-muted-foreground"
                                    >
                                        ...
                                    </span>
                                ) : (
                                    <Button
                                        key={page}
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => onPageChange?.(page)}
                                        className={cn(
                                            'text-muted-foreground hover:text-foreground',
                                            page === pagination.current_page &&
                                                'bg-accent text-foreground',
                                        )}
                                    >
                                        {page}
                                    </Button>
                                ),
                            )}
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                disabled={
                                    pagination.current_page >=
                                    pagination.last_page
                                }
                                onClick={() =>
                                    onPageChange?.(pagination.current_page + 1)
                                }
                                className="text-muted-foreground hover:text-foreground"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function ColumnFilterPopover({
    options,
    value,
    onChange,
    active,
}: {
    options: { value: string; label: string }[];
    value: string;
    onChange: (value: string) => void;
    active?: boolean;
}) {
    const selected = new Set(value ? value.split(',') : []);
    const count = selected.size;

    const toggle = (optValue: string) => {
        const next = new Set(selected);
        if (next.has(optValue)) {
            next.delete(optValue);
        } else {
            next.add(optValue);
        }
        onChange(Array.from(next).join(','));
    };

    return (
        <Popover>
            <PopoverTrigger asChild>
                <button
                    onClick={(e) => e.stopPropagation()}
                    className={cn(
                        'relative rounded p-0.5 transition-colors',
                        active
                            ? 'text-primary'
                            : 'text-muted-foreground/40 hover:text-muted-foreground',
                    )}
                >
                    <Filter className="h-3 w-3" fill={active ? 'currentColor' : 'none'} />
                    {count > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-primary text-[8px] font-bold text-white">
                            {count}
                        </span>
                    )}
                </button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-auto min-w-[160px] max-h-[300px] overflow-y-auto p-1 border-border bg-card"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={() => onChange('')}
                    className={cn(
                        'w-full rounded px-2.5 py-1.5 text-left text-xs transition-colors',
                        !value
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                >
                    Vše
                </button>
                {options.map((opt) => (
                    <label
                        key={opt.value}
                        className="flex items-center gap-2 w-full rounded px-2.5 py-1.5 text-xs cursor-pointer transition-colors hover:bg-accent"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Checkbox
                            checked={selected.has(opt.value)}
                            onCheckedChange={() => toggle(opt.value)}
                        />
                        <span className={selected.has(opt.value) ? 'text-foreground font-medium' : 'text-muted-foreground'}>
                            {opt.label}
                        </span>
                    </label>
                ))}
            </PopoverContent>
        </Popover>
    );
}

function SortIcon({
    active,
    direction,
}: {
    active: boolean;
    direction?: 'asc' | 'desc';
}) {
    if (!active) return <ArrowUpDown className="h-3 w-3 opacity-30" />;
    return direction === 'asc' ? (
        <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
        <ArrowDown className="h-3 w-3 text-primary" />
    );
}

function generatePageNumbers(
    current: number,
    total: number,
): (number | null)[] {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages: (number | null)[] = [1];
    if (current > 3) pages.push(null);
    for (
        let i = Math.max(2, current - 1);
        i <= Math.min(total - 1, current + 1);
        i++
    ) {
        pages.push(i);
    }
    if (current < total - 2) pages.push(null);
    pages.push(total);
    return pages;
}
