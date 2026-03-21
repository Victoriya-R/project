import { useI18n } from '../../i18n/provider';
import { RecentActivity } from '../../types/entities';
import { StatusBadge } from '../../components/common/StatusBadge';

export function RecentActivityFeed({ items }: { items: RecentActivity[] }) {
  const { t } = useI18n();
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{t('dashboard.recentChanges')}</h3>
        <span className="text-sm text-slate-500">{t('dashboard.recentChangesDesc')}</span>
      </div>
      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-4">
            <div>
              <p className="font-medium text-slate-900">{item.title}</p>
              <p className="mt-1 text-sm text-slate-500">{t('recent.time.entity', { entity: item.entity, time: item.time })}</p>
            </div>
            <StatusBadge status={item.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
