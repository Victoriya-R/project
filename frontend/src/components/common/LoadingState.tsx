
import { useI18n } from '../../i18n/provider';

export function LoadingState({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-soft">
      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-600" />
      {label ?? t('common.loading')}

    </div>
  );
}
