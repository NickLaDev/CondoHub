import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Building2,
    CreditCard,
    Headphones,
    ScrollText,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/hooks/utils';

const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/instances', icon: Building2, label: 'Instâncias' },
    { to: '/admin/plans', icon: CreditCard, label: 'Planos' },
    { to: '/admin/support', icon: Headphones, label: 'Suporte' },
    { to: '/admin/logs', icon: ScrollText, label: 'Logs' },
];

export function AppSidebar() {
    const [collapsed, setCollapsed] = useState(false);
    const location = useLocation();

    return (
        <aside
            className={cn(
                'fixed top-0 left-0 h-screen bg-primary flex flex-col z-40 transition-all duration-300 ease-in-out',
                collapsed ? 'w-[72px]' : 'w-[260px]'
            )}
        >
            {/* Logo */}
            <div className={cn(
                'flex items-center h-16 border-b border-white/10 px-4',
                collapsed ? 'justify-center' : 'gap-3'
            )}>
                <img
                    src="/logo-icon.png"
                    alt="CondoHub"
                    className="h-9 w-9 rounded-lg object-contain flex-shrink-0 bg-white/10 p-1"
                />
                {!collapsed && (
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-white font-bold text-lg leading-tight tracking-tight">CondoHub</span>
                        <span className="text-white/50 text-[10px] font-medium uppercase tracking-widest">Super Admin</span>
                    </div>
                )}
            </div>

            {/* Nav */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto scrollbar-thin">
                {navItems.map((item) => {
                    const isActive = location.pathname.startsWith(item.to);
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            className={cn(
                                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                                isActive
                                    ? 'bg-white/15 text-white shadow-sm'
                                    : 'text-white/60 hover:bg-white/8 hover:text-white/90'
                            )}
                            title={collapsed ? item.label : undefined}
                        >
                            <item.icon
                                size={20}
                                className={cn(
                                    'flex-shrink-0 transition-colors',
                                    isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80'
                                )}
                            />
                            {!collapsed && (
                                <span className="text-sm font-medium truncate">{item.label}</span>
                            )}
                            {isActive && !collapsed && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent" />
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Collapse toggle */}
            <button
                onClick={() => setCollapsed(!collapsed)}
                className="flex items-center justify-center h-12 border-t border-white/10 text-white/40 hover:text-white/70 hover:bg-white/5 transition-colors"
            >
                {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
        </aside>
    );
}
