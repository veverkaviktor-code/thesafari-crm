import { type ReactNode, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface Column<T> {
    key: string;
    label: string;
    sortable?: boolean;
    className?: string;
    render: (item: T) => ReactNode;
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
}: DataTableProps<T>) {
    return (
        <div className="rounded-xl border border-white/5 bg-[#1a1a22]">
            {/* Toolbar */}
            {(onSearchChange || toolbar) && (
                <div className="flex items-center gap-3 border-b border-white/5 p-4">
                    {onSearchChange && (
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                            <Input
                                value={searchValue ?? ''}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder={searchPlaceholder}
                                className="border-white/10 bg-white/5 pl-9"
                            />
                        </div>
                    )}
                    {toolbar && <div className="ml-auto flex items-center gap-2">{toolbar}</div>}
                </div>
            )}

            {/* Table */}
            <Table>
                <TableHeader>
                    <TableRow className="border-white/5 hover:bg-transparent">
                        {columns.map((col) => (
                            <TableHead
                                key={col.key}
                                className={cn(
                                    'text-gray-400',
                                    col.sortable && 'cursor-pointer select-none',
                                    col.className,
                                )}
                                onClick={
                                    col.sortable && onSort
                                        ? () => onSort(col.key)
                                        : undefined
                                }
                            >
                                <span className="flex items-center gap-1">
                                    {col.label}
                                    {col.sortable && (
                                        <SortIcon
                                            active={sortField === col.key}
                                            direction={sortDirection}
                                        />
                                    )}
                                </span>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow className="hover:bg-transparent">
                            <TableCell
                                colSpan={columns.length}
                                className="h-32 text-center text-gray-500"
                            >
                                {emptyMessage}
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((item, i) => (
                            <TableRow
                                key={i}
                                className={cn(
                                    'border-white/5',
                                    onRowClick &&
                                        'cursor-pointer hover:bg-white/5',
                                )}
                                onClick={
                                    onRowClick
                                        ? () => onRowClick(item)
                                        : undefined
                                }
                            >
                                {columns.map((col) => (
                                    <TableCell
                                        key={col.key}
                                        className={col.className}
                                    >
                                        {col.render(item)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>

            {/* Pagination */}
            {pagination && pagination.last_page > 1 && (
                <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
                    <span className="text-sm text-gray-500">
                        {pagination.from}–{pagination.to} z {pagination.total}
                    </span>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={pagination.current_page <= 1}
                            onClick={() =>
                                onPageChange?.(pagination.current_page - 1)
                            }
                            className="text-gray-400 hover:text-white"
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
                                    className="px-1 text-gray-600"
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
                                        'text-gray-400 hover:text-white',
                                        page === pagination.current_page &&
                                            'bg-white/5 text-white',
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
                            className="text-gray-400 hover:text-white"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
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
        <ArrowUp className="h-3 w-3 text-[#D97706]" />
    ) : (
        <ArrowDown className="h-3 w-3 text-[#D97706]" />
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
