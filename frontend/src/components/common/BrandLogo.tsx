import { useId } from 'react';
import { cn } from '../../utils/cn';

type BrandLogoProps = {
  className?: string;
  iconClassName?: string;
};

export function BrandLogo({ className, iconClassName }: BrandLogoProps) {
  const cloudGradientId = useId();
  const cloudShadowId = useId();
  const buildingGradientId = useId();
  const windowGradientId = useId();
  const swooshGradientId = useId();

  return (
    <div className={cn('flex items-center', className)}>
      <svg
        viewBox="0 0 512 512"
        aria-hidden="true"
        className={cn('h-16 w-16 shrink-0', iconClassName)}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={cloudGradientId} x1="172" y1="96" x2="352" y2="286" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2FC3FF" />
            <stop offset="0.55" stopColor="#0B78D0" />
            <stop offset="1" stopColor="#07205E" />
          </linearGradient>
          <linearGradient id={cloudShadowId} x1="126" y1="248" x2="394" y2="358" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0E5FB8" />
            <stop offset="1" stopColor="#06184D" />
          </linearGradient>
          <linearGradient id={buildingGradientId} x1="256" y1="138" x2="256" y2="308" gradientUnits="userSpaceOnUse">
            <stop stopColor="#0D5B8B" />
            <stop offset="1" stopColor="#123A6D" />
          </linearGradient>
          <linearGradient id={windowGradientId} x1="256" y1="160" x2="256" y2="286" gradientUnits="userSpaceOnUse">
            <stop stopColor="#8BFAFF" />
            <stop offset="1" stopColor="#149FD7" />
          </linearGradient>
          <linearGradient id={swooshGradientId} x1="112" y1="296" x2="414" y2="296" gradientUnits="userSpaceOnUse">
            <stop stopColor="#FF9D00" />
            <stop offset="1" stopColor="#FF6A00" />
          </linearGradient>
        </defs>

        <path
          d="M130 316C98 316 72 290 72 258C72 232 88 210 112 200C126 157 166 126 214 126C267 126 312 163 326 212C334 209 343 208 352 208C394 208 428 242 428 284C428 326 394 360 352 360H130V316Z"
          fill={`url(#${cloudGradientId})`}
        />
        <path
          d="M126 316H356C384 316 406 294 406 266C406 257 404 248 401 240C417 252 428 271 428 292C428 330 397 360 359 360H130C98 360 72 334 72 302C72 281 83 262 100 252C94 261 90 272 90 284C90 302 103 316 126 316Z"
          fill={`url(#${cloudShadowId})`}
          opacity="0.95"
        />
        <path
          d="M218 150C252 150 282 168 300 196C294 177 279 161 260 151C246 144 230 140 214 140C176 140 142 162 126 196C144 168 177 150 218 150Z"
          fill="#81E5FF"
          opacity="0.45"
        />

        <g stroke="#FFFFFF" strokeWidth="8" strokeLinejoin="round">
          <path d="M170 304V202L214 190L258 202V304" fill={`url(#${buildingGradientId})`} />
          <path d="M214 304V164H278V304" fill={`url(#${buildingGradientId})`} />
          <path d="M292 202L344 216V304H292V202Z" fill={`url(#${buildingGradientId})`} />
        </g>

        <g fill={`url(#${windowGradientId})`}>
          <rect x="188" y="224" width="22" height="18" rx="2" />
          <rect x="188" y="248" width="22" height="18" rx="2" />
          <rect x="188" y="272" width="22" height="18" rx="2" />
          <rect x="234" y="190" width="24" height="18" rx="2" />
          <rect x="234" y="216" width="24" height="18" rx="2" />
          <rect x="234" y="242" width="24" height="18" rx="2" />
          <rect x="234" y="268" width="24" height="18" rx="2" />
          <rect x="308" y="226" width="22" height="18" rx="2" />
          <rect x="308" y="250" width="22" height="18" rx="2" />
          <rect x="308" y="274" width="22" height="18" rx="2" />
        </g>

        <path
          d="M94 290C146 320 232 332 326 324C374 320 411 310 430 296C411 326 366 349 310 360C224 377 132 362 94 332V290Z"
          fill="#FFFFFF"
        />
        <path
          d="M102 290C152 315 238 326 330 318C375 314 409 306 428 292C412 318 370 338 318 347C231 362 136 349 102 322V290Z"
          fill={`url(#${swooshGradientId})`}
        />

        <g stroke="#1558B0" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M136 328V382H170" />
          <path d="M188 328V388H156" />
          <path d="M226 328V408L194 432H162" />
          <path d="M256 328V420L224 444H196" />
          <path d="M286 328V408L318 432H348" />
          <path d="M324 328V388H356" />
          <path d="M366 328V382H398" />
        </g>

        <g fill="#FFFFFF" stroke="#1558B0" strokeWidth="9">
          <circle cx="136" cy="382" r="12" />
          <circle cx="188" cy="388" r="12" />
          <circle cx="156" cy="432" r="12" />
          <circle cx="196" cy="444" r="12" />
          <circle cx="348" cy="432" r="12" />
          <circle cx="356" cy="388" r="12" />
          <circle cx="398" cy="382" r="12" />
        </g>
      </svg>
    </div>
  );
}
