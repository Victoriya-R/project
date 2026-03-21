import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { ZoneNavigator } from '../modules/zones/ZoneNavigator';
import { equipmentApi, switchCabinetsApi, zonesApi } from '../services/api/client';

export function ZonesPage() {
  const zones = useApiQuery({ queryKey: ['zone-list'], queryFn: zonesApi.list });
  const cabinets = useApiQuery({ queryKey: ['cabinet-list'], queryFn: switchCabinetsApi.list });
  const equipment = useApiQuery({ queryKey: ['equipment'], queryFn: equipmentApi.list });

  return (
    <div className="space-y-6">
      <PageHeader title="Zones" description="Location-first navigation for understanding where equipment is physically placed: zone → cabinet → equipment." breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Zones' }]} />} />
      <MockBanner meta={zones.data?.meta} />
      <ZoneNavigator zones={zones.data?.data ?? []} cabinets={cabinets.data?.data ?? []} equipment={equipment.data?.data ?? []} />
    </div>
  );
}
