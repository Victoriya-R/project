import { useId } from 'react';
import { cn } from '../../utils/cn';

type SidebarCodLogoProps = {
  className?: string;
};

export function SidebarCodLogo({ className }: SidebarCodLogoProps) {
  const cloudGradientId = useId();
  const serverGradientId = useId();

  return (
    <svg
      viewBox="0 0 220 92"
      aria-hidden="true"
      className={cn('h-10 w-[116px] shrink-0', className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={cloudGradientId} x1="39" y1="10" x2="155" y2="68" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7DD3FC" />
          <stop offset="1" stopColor="#2563EB" />
        </linearGradient>
        <linearGradient id={serverGradientId} x1="118" y1="18" x2="118" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#64748B" />
          <stop offset="1" stopColor="#334155" />
        </linearGradient>
      </defs>

      <path
        d="M54 56C40.19 56 29 44.81 29 31C29 18.64 37.98 8.38 49.76 6.39C56.37 0.84 64.91 -2 74.67 -2C93.58 -2 109.06 8.81 113.14 23.1C116.64 21.74 120.45 21 124.44 21C141.87 21 156 35.13 156 52.56C156 69.99 141.87 84.12 124.44 84.12H54V56Z"
        transform="translate(18 4) scale(1 0.74)"
        stroke={`url(#${cloudGradientId})`}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {[0, 15, 30].map((offset) => (
        <g key={offset} transform={`translate(92 ${18 + offset})`}>
          <rect width="46" height="10" rx="2.5" fill={`url(#${serverGradientId})`} stroke="#0F172A" strokeWidth="0.7" />
          <circle cx="8" cy="5" r="2.2" fill="#38BDF8" stroke="#93C5FD" strokeWidth="0.6" />
          <circle cx="15" cy="5" r="1.5" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="0.4" />
        </g>
      ))}

      <text
        x="110"
        y="88"
        textAnchor="middle"
        fill="#F8FAFC"
        fontSize="25"
        fontWeight="800"
        letterSpacing="1.2"
        style={{ filter: 'drop-shadow(0 1px 1px rgba(15, 23, 42, 0.65))' }}
      >
        ЦОД
      </text>
    </svg>
  );
}
