import { type ReactNode, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@/hooks/utils';

// ===== CONFIRM DIALOG =====
interface ConfirmDialogProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string | ReactNode;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'warning' | 'default';
    loading?: boolean;
}

export function ConfirmDialog({
    open, onClose, onConfirm, title, message,
    confirmLabel = 'Confirmar', cancelLabel = 'Cancelar',
    variant = 'default', loading
}: ConfirmDialogProps) {
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
                className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-4 mb-5">
                    {variant !== 'default' && (
                        <div className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                            variant === 'danger' ? 'bg-danger-light text-danger' : 'bg-warning-light text-warning'
                        )}>
                            <AlertTriangle size={20} />
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-semibold text-tertiary">{title}</h3>
                        <div className="text-sm text-secondary mt-1">{message}</div>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-secondary bg-surface-secondary rounded-lg hover:bg-surface-tertiary transition-colors"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={cn(
                            'px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-60',
                            variant === 'danger'
                                ? 'bg-danger text-white hover:bg-red-600'
                                : variant === 'warning'
                                    ? 'bg-warning text-white hover:bg-amber-600'
                                    : 'bg-primary text-white hover:bg-accent'
                        )}
                    >
                        {loading ? 'Processando...' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ===== ENTITY FORM MODAL =====
interface EntityFormModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: ReactNode;
    onSubmit?: () => void;
    submitLabel?: string;
    loading?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function EntityFormModal({
    open, onClose, title, subtitle, children, onSubmit,
    submitLabel = 'Salvar', loading, size = 'md'
}: EntityFormModalProps) {
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={onClose}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <div
                className={cn(
                    'relative bg-white rounded-2xl shadow-2xl w-full flex flex-col max-h-[85vh]',
                    size === 'sm' && 'max-w-md',
                    size === 'md' && 'max-w-lg',
                    size === 'lg' && 'max-w-2xl',
                )}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-tertiary">{title}</h3>
                        {subtitle && <p className="text-xs text-secondary mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-surface-secondary text-secondary hover:text-tertiary transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                {/* Body */}
                <div className="px-6 py-5 overflow-y-auto scrollbar-thin flex-1">{children}</div>
                {/* Footer */}
                {onSubmit && (
                    <div className="flex justify-end gap-2 px-6 py-4 border-t border-border flex-shrink-0">
                        <button
                            onClick={onClose}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-secondary bg-surface-secondary rounded-lg hover:bg-surface-tertiary transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={onSubmit}
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-accent transition-all disabled:opacity-60"
                        >
                            {loading ? 'Salvando...' : submitLabel}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

// ===== DETAIL DRAWER =====
interface DetailDrawerProps {
    open: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: ReactNode;
    width?: string;
}

export function DetailDrawer({ open, onClose, title, subtitle, children, width = 'max-w-md' }: DetailDrawerProps) {
    useEffect(() => {
        if (open) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] flex justify-end" onClick={onClose}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div
                className={cn(
                    'relative bg-white h-full w-full shadow-2xl flex flex-col',
                    width
                )}
                style={{ animation: 'slideInRight 0.3s ease-out' }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
                    <div>
                        <h3 className="text-lg font-semibold text-tertiary">{title}</h3>
                        {subtitle && <p className="text-xs text-secondary mt-0.5">{subtitle}</p>}
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg hover:bg-surface-secondary text-secondary hover:text-tertiary transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">{children}</div>
            </div>
            <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
        </div>
    );
}

// ===== EMPTY STATE =====
interface EmptyStateProps {
    icon?: ReactNode;
    title: string;
    description?: string;
    action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            {icon && <div className="text-secondary/30 mb-4">{icon}</div>}
            <h3 className="text-base font-semibold text-tertiary mb-1">{title}</h3>
            {description && <p className="text-sm text-secondary max-w-sm">{description}</p>}
            {action && <div className="mt-4">{action}</div>}
        </div>
    );
}

// ===== ERROR STATE =====
interface ErrorStateProps {
    title?: string;
    message: string;
    onRetry?: () => void;
}

export function ErrorState({ title = 'Erro ao carregar dados', message, onRetry }: ErrorStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="w-12 h-12 rounded-full bg-danger-light flex items-center justify-center mb-4">
                <AlertTriangle size={24} className="text-danger" />
            </div>
            <h3 className="text-base font-semibold text-tertiary mb-1">{title}</h3>
            <p className="text-sm text-secondary max-w-sm mb-4">{message}</p>
            {onRetry && (
                <button
                    onClick={onRetry}
                    className="px-4 py-2 text-sm font-medium bg-primary text-white rounded-lg hover:bg-accent transition-all"
                >
                    Tentar novamente
                </button>
            )}
        </div>
    );
}

// ===== TOAST / SUCCESS FEEDBACK =====
interface ToastProps {
    show: boolean;
    message: string;
    variant?: 'success' | 'error' | 'warning';
    onClose: () => void;
}

export function Toast({ show, message, variant = 'success', onClose }: ToastProps) {
    useEffect(() => {
        if (show) {
            const t = setTimeout(onClose, 4000);
            return () => clearTimeout(t);
        }
    }, [show, onClose]);

    if (!show) return null;

    return (
        <div className={cn(
            'fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white',
            variant === 'success' && 'bg-success',
            variant === 'error' && 'bg-danger',
            variant === 'warning' && 'bg-warning',
        )} style={{ animation: 'slideUp 0.3s ease-out' }}>
            {message}
            <button onClick={onClose} className="text-white/70 hover:text-white">
                <X size={16} />
            </button>
            <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
        </div>
    );
}
