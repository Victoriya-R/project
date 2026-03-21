import { useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { DataTable } from '../components/common/DataTable';
import { InfoCard } from '../components/common/InfoCard';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { equipmentApi, switchCabinetsApi, zonesApi } from '../services/api/client';

export function ZoneDetailPage() {
  const { id = '0' } = useParams();
  const zone = useApiQuery({ queryKey: ['zone-detail', id], queryFn: () => zonesApi.detail(Number(id)) });
  const cabinets = useApiQuery({ queryKey: ['cabinet-list'], queryFn: switchCabinetsApi.list });
  const equipment = useApiQuery({ queryKey: ['equipment'], queryFn: equipmentApi.list });

  if (!zone.data) return null;

  const zoneCabinets = (cabinets.data?.data ?? []).filter((cabinet) => cabinet.zone_id === Number(id));
  const zoneEquipment = (equipment.data?.data ?? []).filter((item) => zoneCabinets.some((cabinet) => cabinet.id === item.switch_cabinet_id));

  return (
    <div className="space-y-6">
      <PageHeader title={zone.data.data.name} description="Zone card with placement navigator, rack count and direct links into asset inventory." breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Zones', href: '/zones' }, { label: zone.data.data.name }]} />} />
      <MockBanner meta={zone.data.meta} />
      <section className="grid gap-4 xl:grid-cols-3">
        <InfoCard title="Switch cabinets" value={String(zoneCabinets.length)} description="Racks placed in this zone" />
        <InfoCard title="Equipment" value={String(zoneEquipment.length)} description="Assets currently placed in those racks" />
        <InfoCard title="Owner" value={zone.data.data.employee ?? '—'} description={zone.data.data.site ?? 'Site not specified'} />
      </section>
      <DataTable
        columns={[
          { key: 'name', header: 'Rack', render: (row) => row.name },
          { key: 'serial', header: 'Serial', render: (row) => row.serial_number },
          { key: 'energy', header: 'Energy limit', render: (row) => `${row.energy_limit} W` },
          { key: 'equipment', header: 'Equipment count', render: (row) => `${row.equipment?.length ?? 0}` }
        ]}
        data={zoneCabinets}
      />
    </div>
  );
}
