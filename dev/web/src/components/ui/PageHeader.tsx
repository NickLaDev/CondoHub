import { type ReactNode } from 'react';
import { cn } from '@/hooks/utils';

interface PageHeaderProps {
    title: string;
    description?: string;
    actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
    return (
        <div className="flex items-start justify-between mb-6">
            <div>
                <h2 className="text-xl font-bold text-tertiary">{title}</h2>
                {description && <p className="text-sm text-secondary mt-1">{description}</p>}
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}

interface SectionCardProps {
    title?: string;
    subtitle?: string;
    children: ReactNode;
    className?: string;
    headerActions?: ReactNode;
    noPadding?: boolean;
}

export function SectionCard({ title, subtitle, children, className, headerActions, noPadding }: SectionCardProps) {
    return (
        <div className={cn('bg-white rounded-xl border border-border', className)}>
            {(title || headerActions) && (
                <div className="flex items-center justify-between px-5 py-4 border-b border-border-light">
                    <div>
                        {title && <h3 className="text-sm font-semibold text-tertiary">{title}</h3>}
                        {subtitle && <p className="text-xs text-secondary mt-0.5">{subtitle}</p>}
                    </div>
                    {headerActions}
                </div>
            )}
            <div className={cn(!noPadding && 'p-5')}>{children}</div>
        </div>
    );
}

interface SearchInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function SearchInput({ value, onChange, placeholder = 'Buscar...', className }: SearchInputProps) {
    return (
        <div className={cn('relative', className)}>
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-secondary/60"
            />
        </div>
    );
}

interface FilterBarProps {
    children: ReactNode;
}

export function FilterBar({ children }: FilterBarProps) {
    return (
        <div className="flex flex-wrap items-center gap-3 mb-4">
            {children}
        </div>
    );
}

export function Select({ value, onChange, options, className }: {
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
    className?: string;
}) {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
                'pl-3 pr-8 py-2 text-sm bg-white border border-border rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-tertiary',
                className
            )}
        >
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
        </select>
    );
}
