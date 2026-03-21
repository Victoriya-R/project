import { useI18n } from '../../i18n/provider';

export function ErrorState({ title, description }: { title?: string; description?: string }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700 shadow-soft">
      <p className="font-semibold">{title ?? t('common.failedToLoad')}</p>
      {description ? <p className="mt-2">{description}</p> : null}
    </div>
  );
}
