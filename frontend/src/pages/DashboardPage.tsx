import { Activity, Cable, Cpu, MapPinned, ShieldCheck, SquareStack } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useApiQuery } from '../hooks/useApiQuery';
import { useI18n } from '../i18n/provider';
import { dashboardApi } from '../services/api/client';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { InfoCard } from '../components/common/InfoCard';
import { LoadingState } from '../components/common/LoadingState';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { RecentActivityFeed } from '../modules/dashboard/RecentActivityFeed';

export function DashboardPage() {
  const { t } = useI18n();
  const query = useApiQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.getOverview });

  if (query.isLoading) return <LoadingState label={t('common.loading')} />;
  if (!query.data) return null;

  const { counts, recentActivity, quickLinks } = query.data.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('dashboard.title')}
        description={t('dashboard.description')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard') }]} />}
        actions={<><Button variant="secondary">{t('dashboard.exportSnapshot')}</Button><Button>{t('dashboard.newAsset')}</Button></>}
      />
      <MockBanner meta={query.data.meta} />
      <section className="grid gap-4 xl:grid-cols-3">
        <InfoCard title={t('nav.equipment')} value={String(counts.equipment)} description={t('dashboard.equipmentDesc')} icon={<Cpu className="h-5 w-5" />} />
        <InfoCard title={t('nav.switchCabinets')} value={String(counts.switchCabinets)} description={t('dashboard.switchCabinetsDesc')} icon={<SquareStack className="h-5 w-5" />} />
        <InfoCard title={t('nav.zones')} value={String(counts.zones)} description={t('dashboard.zonesDesc')} icon={<MapPinned className="h-5 w-5" />} />
        <InfoCard title={t('nav.ups')} value={String(counts.ups)} description={t('dashboard.upsDesc')} icon={<ShieldCheck className="h-5 w-5" />} />
        <InfoCard title={t('nav.cables')} value={String(counts.cables)} description={t('dashboard.cablesDesc')} icon={<Cable className="h-5 w-5" />} />
        <InfoCard title={t('nav.connections')} value={String(counts.connections)} description={t('dashboard.connectionsDesc')} icon={<Activity className="h-5 w-5" />} />
      </section>
      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">{t('dashboard.quickActions')}</h3>
                <p className="mt-1 text-sm text-slate-500">{t('dashboard.quickActionsDesc')}</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {[
                { label: t('dashboard.action.addEquipment'), href: '/equipment' },
                { label: t('dashboard.action.reviewRack'), href: '/switch-cabinets' },
                { label: t('dashboard.action.createConnection'), href: '/connections' },
                { label: t('dashboard.action.openUps'), href: '/ups' },
                { label: t('dashboard.action.navigateZone'), href: '/zones' },
                { label: t('dashboard.action.runReports'), href: '/reports' }
              ].map((action) => (
                <Link key={action.label} to={action.href} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700">{action.label}</Link>
              ))}
            </div>
          </div>
          <RecentActivityFeed items={recentActivity} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
          <h3 className="text-lg font-semibold text-slate-900">{t('dashboard.reportShortcuts')}</h3>
          <p className="mt-1 text-sm text-slate-500">{t('dashboard.reportShortcutsDesc')}</p>
          <div className="mt-4 space-y-3">
            {quickLinks.map((item) => {
              const labels: Record<string, string> = {
                '/reports?tab=equipment': t('dashboard.report.equipmentStatus'),
                '/reports?tab=cabinets': t('dashboard.report.rackUtilization'),
                '/reports?tab=zones': t('dashboard.report.zoneLoad')
              };
              return (
              <Link key={item.href} to={item.href} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700">
                <span>{labels[item.href] ?? item.label}</span>
                <span>→</span>
              </Link>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
