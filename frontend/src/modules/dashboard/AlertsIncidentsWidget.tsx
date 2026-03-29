import { Link } from 'react-router-dom';
import { useApiQuery } from '../../hooks/useApiQuery';
import { useI18n } from '../../i18n/provider';
import { dashboardApi } from '../../services/api/client';

const counterTone: Record<'newAlerts' | 'criticalAlerts' | 'openIncidents', string> = {
  newAlerts: 'border-amber-200 bg-amber-50 text-amber-800',
  criticalAlerts: 'border-rose-200 bg-rose-50 text-rose-700',
  openIncidents: 'border-indigo-200 bg-indigo-50 text-indigo-700'
};

export function AlertsIncidentsWidget() {
  const { t } = useI18n();
  const summaryQuery = useApiQuery({
    queryKey: ['dashboard', 'alerts-incidents-summary'],
    queryFn: dashboardApi.getAlertsIncidentsSummary
  });

  if (summaryQuery.isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <div className="h-5 w-52 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
          ))}
        </div>
      </div>
    );
  }

  if (summaryQuery.isError) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700 shadow-soft">
        {t('dashboard.alertsIncidentsError')}
      </div>
    );
  }

  const summary = summaryQuery.data?.data;

  if (!summary || (summary.newAlerts === 0 && summary.criticalAlerts === 0 && summary.openIncidents === 0)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
        <h3 className="text-lg font-semibold text-slate-900">{t('dashboard.alertsIncidentsTitle')}</h3>
        <p className="mt-3 text-sm text-slate-500">{t('dashboard.alertsIncidentsEmpty')}</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
      <h3 className="text-lg font-semibold text-slate-900">{t('dashboard.alertsIncidentsTitle')}</h3>
      <p className="mt-1 text-sm text-slate-500">{t('dashboard.alertsIncidentsDesc')}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Link
          to="/alerts?status=new"
          className={`rounded-2xl border px-4 py-3 transition hover:shadow-soft ${counterTone.newAlerts}`}
        >
          <p className="text-xs font-medium uppercase tracking-wide">{t('dashboard.newAlerts')}</p>
          <p className="mt-2 text-2xl font-semibold">{summary.newAlerts}</p>
        </Link>

        <Link
          to="/alerts?severity=critical"
          className={`rounded-2xl border px-4 py-3 transition hover:shadow-soft ${counterTone.criticalAlerts}`}
        >
          <p className="text-xs font-medium uppercase tracking-wide">{t('dashboard.criticalAlerts')}</p>
          <p className="mt-2 text-2xl font-semibold">{summary.criticalAlerts}</p>
        </Link>

        <Link
          to="/incidents?status=open"
          className={`rounded-2xl border px-4 py-3 transition hover:shadow-soft ${counterTone.openIncidents}`}
        >
          <p className="text-xs font-medium uppercase tracking-wide">{t('dashboard.openIncidents')}</p>
          <p className="mt-2 text-2xl font-semibold">{summary.openIncidents}</p>
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-sm">
        <Link to="/alerts" className="font-medium text-brand-700 hover:text-brand-800">
          {t('dashboard.goToAlerts')} →
        </Link>
        <Link to="/incidents" className="font-medium text-brand-700 hover:text-brand-800">
          {t('dashboard.goToIncidents')} →
        </Link>
      </div>
    </div>
  );
}
