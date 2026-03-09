import React from 'react';

interface ResponsiveTableProps {
    children: React.ReactNode;
    className?: string;
}

export function ResponsiveTable({ children, className = '' }: ResponsiveTableProps) {
    return (
        <div className={`overflow-x-auto -mx-4 md:mx-0 ${className}`}>
            <div className="inline-block min-w-full align-middle">
                {children}
            </div>
        </div>
    );
}
