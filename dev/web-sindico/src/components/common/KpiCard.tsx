import type { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  description: string;
  tone?: 'primary' | 'warning' | 'danger' | 'violet';
  icon?: ReactNode;
}

export function KpiCard({
  title,
  value,
  description,
  tone = 'primary',
  icon,
}: KpiCardProps) {
  return (
    <article className={`kpi-card kpi-card--${tone}`}>
      <div className="kpi-card__header">
        <span className="kpi-card__eyebrow">{title}</span>
        {icon ? <div className="kpi-card__icon">{icon}</div> : null}
      </div>
      <strong className="kpi-card__value">{value}</strong>
      <p>{description}</p>
    </article>
  );
}
