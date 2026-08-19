import { useId } from 'react';

interface CondoHubLogoProps {
  compact?: boolean;
  tone?: 'light' | 'dark';
  subtitle?: string;
}

export function CondoHubLogo({
  compact = false,
  tone = 'dark',
  subtitle = 'Tenant Admin',
}: CondoHubLogoProps) {
  const gradientId = useId();

  return (
    <div className={`brand-logo brand-logo--${tone}${compact ? ' brand-logo--compact' : ''}`}>
      <div className="brand-logo__badge" aria-hidden="true">
        <svg viewBox="0 0 164 124" role="presentation">
          <defs>
            <linearGradient id={gradientId} x1="79" y1="22" x2="140" y2="104" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#d6d9e0" />
              <stop offset="0.55" stopColor="#9aa1ae" />
              <stop offset="1" stopColor="#707889" />
            </linearGradient>
          </defs>

          <path
            d="M36 18h60l-9 29H44c-5.44 0-9 3.62-9 9.1v31.8c0 5.48 3.56 9.1 9 9.1h47l-9 27H37c-15 0-27-12.12-27-27V45c0-14.88 12-27 26-27Z"
            fill="#1d2b66"
          />
          <path
            d="M114 18h27v57.5c0 15.2-12.3 27.5-27.5 27.5H112V69H70l10-25h34V18Z"
            fill={`url(#${gradientId})`}
          />
        </svg>
      </div>

      {!compact ? (
        <div className="brand-logo__copy">
          <span className="brand-logo__title">CondoHub</span>
          <span className="brand-logo__subtitle">{subtitle}</span>
        </div>
      ) : null}
    </div>
  );
}
