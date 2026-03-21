import { useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { InfoCard } from '../components/common/InfoCard';
import { LoadingState } from '../components/common/LoadingState';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApiQuery } from '../hooks/useApiQuery';
import { PortGrid } from '../modules/ports/PortGrid';
import { equipmentApi, switchCabinetsApi } from '../services/api/client';

export function EquipmentDetailPage() {
  const { id = '0' } = useParams();
  const equipment = useApiQuery({ queryKey: ['equipment', id], queryFn: () => equipmentApi.detail(Number(id)) });
  const ports = useApiQuery({ queryKey: ['equipment-ports', id], queryFn: () => equipmentApi.ports(Number(id)) });
  const cabinets = useApiQuery({ queryKey: ['cabinet-list'], queryFn: switchCabinetsApi.list });

  if (equipment.isLoading || ports.isLoading) return <LoadingState label="Loading equipment details..." />;
  if (!equipment.data) return null;

  const item = equipment.data.data;
  const rack = cabinets.data?.data.find((cabinet) => cabinet.id === item.switch_cabinet_id);

  return (
    <div className="space-y-6">
      <PageHeader title={item.name} description="Equipment card with enterprise-ready details, placement context and visual ports." breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Equipment', href: '/equipment' }, { label: item.name }]} />} actions={<StatusBadge status={item.status} />} />
      <MockBanner meta={equipment.data.meta.usingMock ? equipment.data.meta : ports.data?.meta} />
      <section className="grid gap-4 xl:grid-cols-4">
        <InfoCard title="Type" value={item.type} description={item.model} />
        <InfoCard title="Serial" value={item.serial} description="Backend asset identifier" />
        <InfoCard title="Rack placement" value={rack?.name ?? 'Unassigned'} description="switch_cabinet_id linkage" />
        <InfoCard title="Power / Weight" value={`${item.energy_consumption ?? '—'} W`} description={`${item.weight ?? '—'} kg`} />
      </section>
      <PortGrid ports={ports.data?.data ?? []} />
    </div>
  );
}
