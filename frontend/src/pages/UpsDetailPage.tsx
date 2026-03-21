import { useParams } from 'react-router-dom';
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
  const { id = '0' } = useParams();
  const detail = useApiQuery({ queryKey: ['ups-detail', id], queryFn: () => upsApi.detail(Number(id)) });
  const ports = useApiQuery({ queryKey: ['ups-ports', id], queryFn: () => upsApi.ports(Number(id)) });

  if (detail.isLoading || ports.isLoading) return <LoadingState label="Loading UPS details..." />;
  if (!detail.data) return null;

  const item = detail.data.data;

  return (
    <div className="space-y-6">
      <PageHeader title={item.name} description="Separate UPS detail screen with linked asset data, battery autonomy and explicit separation of patch/power ports." breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'UPS', href: '/ups' }, { label: item.name }]} />} actions={<StatusBadge status={item.status} />} />
      <MockBanner meta={detail.data.meta.usingMock ? detail.data.meta : ports.data?.meta} />
      <section className="grid gap-4 xl:grid-cols-4">
        <InfoCard title="Asset ID" value={String(item.id)} description="Linked asset record" />
        <InfoCard title="Capacity" value={`${item.upsData.capacity} VA`} description="Nominal power capacity" />
        <InfoCard title="Battery life" value={`${item.upsData.battery_life} min`} description="Estimated runtime" />
        <InfoCard title="UPS status" value={item.upsData.status} description="Dedicated UPS dataset" />
      </section>
      <PortGrid ports={ports.data?.data ?? item.ports ?? []} />
    </div>
  );
}
