import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  badge?: string;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  description,
  badge,
  actions,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__copy">
        {badge ? <span className="page-header__badge">{badge}</span> : null}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>

      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
