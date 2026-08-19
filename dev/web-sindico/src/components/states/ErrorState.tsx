import { TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

interface ErrorStateProps {
  title: string;
  description: string;
  code?: string;
  action?: ReactNode;
}

export function ErrorState({
  title,
  description,
  code,
  action,
}: ErrorStateProps) {
  return (
    <section className="state-card state-card--error">
      <div className="state-card__icon">
        <TriangleAlert size={24} />
      </div>
      <div className="state-card__content">
        {code ? <span className="state-card__eyebrow">{code}</span> : null}
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? <div className="state-card__action">{action}</div> : null}
    </section>
  );
}
