import { DatabaseZap } from 'lucide-react';
import { ApiMeta } from '../../types/entities';
import { useI18n } from '../../i18n/provider';

export function MockBanner({ meta }: { meta?: ApiMeta }) {
  const { t, language } = useI18n();
  if (!meta?.usingMock) return null;

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <DatabaseZap className="mt-0.5 h-4 w-4 shrink-0" />
      <div>
        <p className="font-medium">{t('common.mockTitle')}</p>
        <p className="mt-1">{language === 'en' && meta.reason ? meta.reason : t('common.mockReasonDefault')}</p>
      </div>
    </div>
  );
}
