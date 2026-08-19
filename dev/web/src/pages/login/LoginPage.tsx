import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export function LoginPage() {
    const { login, error, clearError, isLoading } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [remember, setRemember] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        clearError();
        try {
            await login(email, password, remember);
            navigate('/admin/dashboard');
        } catch { /* error is handled by context */ }
    };

    return (
        <div className="min-h-screen flex">
            {/* Left panel — branding */}
            <div className="hidden lg:flex lg:w-[480px] xl:w-[540px] bg-primary relative flex-col items-center justify-center p-12 overflow-hidden">
                {/* Decorative shapes */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full translate-y-1/3 -translate-x-1/3" />
                <div className="absolute top-1/3 left-10 w-32 h-32 border border-white/10 rounded-2xl rotate-12" />

                <div className="relative z-10 text-center">
                    <img src="/logo-icon.png" alt="CondoHub" className="w-20 h-20 mx-auto mb-6 bg-white/10 rounded-2xl p-3" />
                    <h1 className="text-3xl font-bold text-white mb-3">CondoHub</h1>
                    <p className="text-white/50 text-sm uppercase tracking-[0.25em] font-medium mb-8">Super Admin Console</p>
                    <div className="w-16 h-0.5 bg-accent/50 mx-auto mb-8" />
                    <p className="text-white/60 text-sm leading-relaxed max-w-xs mx-auto">
                        Painel de governança da plataforma. Controle instâncias, planos,
                        suporte e auditoria global em um só lugar.
                    </p>
                </div>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 flex items-center justify-center p-8 bg-surface-secondary">
                <div className="w-full max-w-[400px]">
                    {/* Mobile logo */}
                    <div className="lg:hidden flex flex-col items-center mb-10">
                        <img src="/logo-icon.png" alt="CondoHub" className="w-14 h-14 mb-3 bg-primary/5 rounded-xl p-2" />
                        <h1 className="text-xl font-bold text-primary">CondoHub</h1>
                        <p className="text-secondary text-[10px] uppercase tracking-widest font-medium">Super Admin</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-border p-8">
                        <div className="mb-8">
                            <h2 className="text-xl font-bold text-tertiary">Entrar no console</h2>
                            <p className="text-sm text-secondary mt-1">Acesse com suas credenciais de administrador global.</p>
                        </div>

                        {error && (
                            <div className="mb-5 px-4 py-3 bg-danger-light text-danger text-sm rounded-lg border border-danger/20 flex items-center gap-2">
                                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-tertiary mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="admin@condohub.com.br"
                                    required
                                    className="w-full px-4 py-2.5 text-sm border border-border rounded-lg bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent focus:bg-white transition-all placeholder:text-secondary/50"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-tertiary mb-1.5">Senha</label>
                                <div className="relative">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                        className="w-full px-4 py-2.5 pr-10 text-sm border border-border rounded-lg bg-surface-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent focus:bg-white transition-all placeholder:text-secondary/50"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-tertiary transition-colors"
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="remember"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                    className="w-4 h-4 rounded border-border text-accent focus:ring-accent/30"
                                />
                                <label htmlFor="remember" className="ml-2 text-sm text-secondary cursor-pointer">
                                    Lembrar sessão
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-2.5 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-accent transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading && <Loader2 size={16} className="animate-spin" />}
                                {isLoading ? 'Entrando...' : 'Entrar'}
                            </button>
                        </form>

                    </div>

                    <p className="text-center text-xs text-secondary/60 mt-6">
                        CondoHub © 2026 — Plataforma de gestão condominial
                    </p>
                </div>
            </div>
        </div>
    );
}
