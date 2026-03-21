import { DatabaseZap } from 'lucide-react';
import { ApiMeta } from '../../types/entities';

export function MockBanner({ meta }: { meta?: ApiMeta }) {
  if (!meta?.usingMock) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <DatabaseZap className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">Some widgets use fallback data.</p>
        <p className="mt-1">{meta.reason ?? 'The backend endpoint is unavailable or not implemented yet.'}</p>
      </div>
    </div>
  );
}
