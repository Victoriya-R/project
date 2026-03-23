import { useId } from 'react';
import { cn } from '../../utils/cn';

type BrandLogoProps = {
  className?: string;
  iconClassName?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  showWordmark?: boolean;
  compact?: boolean;
  title?: string;
  subtitle?: string;
};

export function BrandLogo({
  className,
  iconClassName,
  titleClassName,
  subtitleClassName,
  showWordmark = false,
  compact = false,
  title = 'Data Center',
  subtitle = 'Infrastructure API UI'
}: BrandLogoProps) {
  const gradientId = useId();
  const accentId = useId();

  return (
    <div className={cn('flex items-center gap-3', compact ? 'gap-2.5' : 'gap-3.5', className)}>
      <svg
        viewBox="0 0 80 80"
        aria-hidden="true"
        className={cn('h-12 w-12 text-brand-600', compact ? 'h-10 w-10' : 'h-12 w-12', iconClassName)}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="14" y1="16" x2="66" y2="60" gradientUnits="userSpaceOnUse">
            <stop stopColor="#38BDF8" />
            <stop offset="1" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id={accentId} x1="19" y1="49" x2="61" y2="49" gradientUnits="userSpaceOnUse">
            <stop stopColor="#F97316" />
            <stop offset="1" stopColor="#FB923C" />
          </linearGradient>
        </defs>
        <path
          d="M24 57C16.82 57 11 51.18 11 44C11 37.89 15.24 32.77 20.93 31.43C23.62 24.75 30.16 20 37.81 20C46.59 20 54 26.25 55.79 34.49C56.85 34.17 57.97 34 59.13 34C65.68 34 71 39.32 71 45.87C71 52.42 65.68 57.74 59.13 57.74H24V57Z"
          fill={`url(#${gradientId})`}
        />
        <path
          d="M30 54V34.5L40 31.5L50 34.5V54"
          stroke="white"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path d="M40 54V28H50V54" stroke="white" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M55.5 35.5L64 38V54" stroke="white" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M24.5 35.5L16 38V54" stroke="white" strokeWidth="3.5" strokeLinejoin="round" />
        <path d="M20 48H60" stroke={`url(#${accentId})`} strokeWidth="4" strokeLinecap="round" />
        <path d="M40 54V64" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M32 64H48" stroke="#2563EB" strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="32" cy="64" r="2.75" fill="#2563EB" />
        <circle cx="48" cy="64" r="2.75" fill="#2563EB" />
      </svg>
      {showWordmark ? (
        <div className="min-w-0">
          <p className={cn('truncate text-lg font-semibold leading-tight text-slate-950', compact && 'text-base', titleClassName)}>{title}</p>
          <p className={cn('truncate text-xs uppercase tracking-[0.24em] text-slate-400', subtitleClassName)}>{subtitle}</p>
        </div>
      ) : null}
    </div>
  );
}
