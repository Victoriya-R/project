import { useParams } from 'react-router-dom';
import { useI18n } from '../i18n/provider';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { InfoCard } from '../components/common/InfoCard';
import { LoadingState } from '../components/common/LoadingState';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApiQuery } from '../hooks/useApiQuery';
import { PortGrid } from '../modules/ports/PortGrid';
import { upsApi } from '../services/api/client';

export function UpsDetailPage() {
  const { t } = useI18n();
  const { id = '0' } = useParams();
  const detail = useApiQuery({ queryKey: ['ups-detail', id], queryFn: () => upsApi.detail(Number(id)) });
  const ports = useApiQuery({ queryKey: ['ups-ports', id], queryFn: () => upsApi.ports(Number(id)) });

  if (detail.isLoading || ports.isLoading) return <LoadingState />;
  if (!detail.data) return null;

  const item = detail.data.data;

  return (
    <div className="space-y-6">
      <PageHeader title={item.name} description={t('ups.detail.description')} breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.ups'), href: '/ups' }, { label: item.name }]} />} actions={<StatusBadge status={item.status} />} />
      <MockBanner meta={detail.data.meta.usingMock ? detail.data.meta : ports.data?.meta} />
      <section className="grid gap-4 xl:grid-cols-4">
        <InfoCard title={t('ups.detail.assetId')} value={String(item.id)} description={t('ups.detail.assetIdDesc')} />
        <InfoCard title={t('ups.capacity')} value={`${item.upsData.capacity} VA`} description={t('ups.detail.capacityDesc')} />
        <InfoCard title={t('ups.batteryLife')} value={`${item.upsData.battery_life} min`} description={t('ups.detail.batteryDesc')} />
        <InfoCard title={t('ups.detail.statusTitle')} value={t(`status.${item.upsData.status}` as const)} description={t('ups.detail.statusDesc')} />
      </section>
      <PortGrid ports={ports.data?.data ?? item.ports ?? []} />
    </div>
  );
}
