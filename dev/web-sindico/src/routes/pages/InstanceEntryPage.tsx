import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { CondoHubLogo } from '@/components/brand/CondoHubLogo';
import { useAuthStore } from '@/store/auth';

export function InstanceEntryPage() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const currentInstanceKey = useAuthStore((state) => state.currentInstanceKey);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const authError = useAuthStore((state) => state.authError);
  const pendingInstanceSelection = useAuthStore((state) => state.pendingInstanceSelection);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearAuthError();

    try {
      const instanceKey = await login({ email, password });
      if (instanceKey) {
        navigate(`/${instanceKey}/dashboard`, { replace: true });
        return;
      }

      navigate('/select-instance', { replace: true });
    } catch {
      // O erro é refletido centralmente pela store.
    }
  }

  if (isAuthenticated && currentInstanceKey) {
    return <Navigate to={`/${currentInstanceKey}/dashboard`} replace />;
  }

  if (pendingInstanceSelection) {
    return <Navigate to="/select-instance" replace />;
  }

  return (
    <div className="entry-screen">
      <div className="entry-screen__panel">
        <CondoHubLogo />

        <div className="entry-screen__copy">
          <h1>Entrar no painel do síndico</h1>
          <p>
            Use seu e-mail e senha. O condomínio da sessão será definido pelo
            backend quando sua conta pertencer a uma única instância.
          </p>
        </div>

        {authError ? (
          <div className="inline-feedback inline-feedback--error" role="alert">
            {authError}
          </div>
        ) : null}

        <form className="entry-screen__form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">E-mail</span>
            <input
              className="field__input"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="sindico@condohub.com.br"
              autoComplete="email"
              required
            />
          </label>

          <label className="field">
            <span className="field__label">Senha</span>
            <div className="field__password">
              <input
                className="field__input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <button
            type="submit"
            className="button button--primary button--full"
            disabled={isSubmitting}
          >
            {isSubmitting ? <LoaderCircle size={18} className="spin" /> : null}
            {isSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
