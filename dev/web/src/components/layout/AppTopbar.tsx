import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, LogOut, User, Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface AppTopbarProps {
    title: string;
    subtitle?: string;
}

export function AppTopbar({ title, subtitle }: AppTopbarProps) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [menuOpen, setMenuOpen] = useState(false);
    const [searchFocused, setSearchFocused] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    return (
        <header className="h-16 bg-white border-b border-border flex items-center justify-between px-6 flex-shrink-0">
            {/* Left: Title */}
            <div className="flex flex-col">
                <h1 className="text-lg font-semibold text-tertiary leading-tight">{title}</h1>
                {subtitle && <p className="text-xs text-secondary mt-0.5">{subtitle}</p>}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                {/* Search */}
                <div className={`relative transition-all duration-200 ${searchFocused ? 'w-72' : 'w-56'}`}>
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="w-full pl-9 pr-4 py-2 text-sm bg-surface-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all placeholder:text-secondary/60"
                        onFocus={() => setSearchFocused(true)}
                        onBlur={() => setSearchFocused(false)}
                    />
                </div>

                {/* Notifications */}
                <button className="relative p-2 rounded-lg hover:bg-surface-secondary transition-colors text-secondary hover:text-tertiary">
                    <Bell size={20} />
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
                </button>

                {/* User menu */}
                <div ref={menuRef} className="relative">
                    <button
                        onClick={() => setMenuOpen(!menuOpen)}
                        className="flex items-center gap-2.5 pl-3 pr-2 py-1.5 rounded-lg hover:bg-surface-secondary transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-semibold">
                            {user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="text-left hidden sm:block">
                            <p className="text-sm font-medium text-tertiary leading-tight">{user?.name}</p>
                            <p className="text-[11px] text-secondary leading-tight">Admin Global</p>
                        </div>
                        <ChevronDown size={14} className={`text-secondary transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {menuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-border py-1.5 z-50">
                            <div className="px-3 py-2 border-b border-border-light">
                                <p className="text-sm font-medium text-tertiary">{user?.name}</p>
                                <p className="text-xs text-secondary">{user?.email}</p>
                            </div>
                            <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-tertiary hover:bg-surface-secondary transition-colors">
                                <User size={15} className="text-secondary" />
                                Meu perfil
                            </button>
                            <button className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-tertiary hover:bg-surface-secondary transition-colors">
                                <Settings size={15} className="text-secondary" />
                                Configurações
                            </button>
                            <div className="border-t border-border-light mt-1 pt-1">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-danger hover:bg-danger-light transition-colors"
                                >
                                    <LogOut size={15} />
                                    Sair
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
