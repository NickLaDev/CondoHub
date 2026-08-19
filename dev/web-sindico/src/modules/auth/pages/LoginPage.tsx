import { useState, type FormEvent } from 'react';
import { Eye, EyeOff, LoaderCircle } from 'lucide-react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTenantContext } from '@/app/tenant/tenantContext';
import { CondoHubLogo } from '@/components/brand/CondoHubLogo';
import { useAuthStore } from '@/store/auth';

export function LoginPage() {
  const navigate = useNavigate();
  const { instanceKey, instanceName } = useTenantContext();
  const loginTenant = useAuthStore((state) => state.loginTenant);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isSubmitting = useAuthStore((state) => state.isSubmitting);
  const authError = useAuthStore((state) => state.authError);
  const clearAuthError = useAuthStore((state) => state.clearAuthError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearAuthError();

    try {
      await loginTenant(instanceKey, { email, password });
      navigate(`/${instanceKey}/dashboard`, { replace: true });
    } catch {
      // O erro é refletido centralmente pela store.
    }
  }

  if (isAuthenticated) {
    return <Navigate to={`/${instanceKey}/dashboard`} replace />;
  }

  return (
    <div className="login-screen">
      <section className="login-screen__brand">
        <div className="login-screen__brand-panel">
          <CondoHubLogo tone="light" />

          <div className="login-screen__brand-copy">
            <span className="login-screen__eyebrow">Painel tenant CondoHub</span>
            <h1>Administre um condomínio por vez, com contexto isolado.</h1>
            <p>
              Esta base foi preparada para o fluxo do síndico administrador, com
              bootstrap de sessão, refresh centralizado e rotas privadas por instância.
            </p>
          </div>

          <div className="login-screen__instance-card">
            <span>Instância ativa</span>
            <strong>{instanceName}</strong>
            <small>/{instanceKey}</small>
          </div>
        </div>
      </section>

      <section className="login-screen__content">
        <div className="login-card">
          <CondoHubLogo compact />

          <div className="login-card__copy">
            <h2>Entrar no painel do condomínio</h2>
            <p>
              Use suas credenciais tenant para iniciar a sessão administrativa da
              instância.
            </p>
          </div>

          {authError ? (
            <div className="inline-feedback inline-feedback--error" role="alert">
              {authError}
            </div>
          ) : null}

          <form className="login-card__form" onSubmit={handleSubmit}>
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
      </section>
    </div>
  );
}
