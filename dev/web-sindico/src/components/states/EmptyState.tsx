import { Inbox } from 'lucide-react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <section className="state-card">
      <div className="state-card__icon">
        <Inbox size={24} />
      </div>
      <div className="state-card__content">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action ? <div className="state-card__action">{action}</div> : null}
    </section>
  );
}
