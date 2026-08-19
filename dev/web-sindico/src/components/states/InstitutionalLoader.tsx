import { CondoHubLogo } from '@/components/brand/CondoHubLogo';

interface InstitutionalLoaderProps {
  title?: string;
  description?: string;
}

export function InstitutionalLoader({
  title = 'Carregando painel do condomínio',
  description = 'Preparando sessão tenant e contexto institucional.',
}: InstitutionalLoaderProps) {
  return (
    <div className="loader-screen">
      <div className="loader-screen__card">
        <CondoHubLogo />
        <div className="loader-screen__spinner" aria-hidden="true" />
        <div className="loader-screen__copy">
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>
    </div>
  );
}
