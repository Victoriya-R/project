import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { DataTable } from '../components/common/DataTable';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { switchCabinetsApi, zonesApi } from '../services/api/client';

export function SwitchCabinetsPage() {
  const cabinets = useApiQuery({ queryKey: ['cabinet-list'], queryFn: switchCabinetsApi.list });
  const zones = useApiQuery({ queryKey: ['zone-list'], queryFn: zonesApi.list });

  return (
    <div className="space-y-6">
      <PageHeader title="Switch Cabinets" description="Rack inventory with current load, configured limits and direct entry to graphical rack visualization." breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Switch Cabinets' }]} />} />
      <MockBanner meta={cabinets.data?.meta} />
      <DataTable
        columns={[
          { key: 'name', header: 'Rack', render: (row) => <Link to={`/switch-cabinets/${row.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{row.name}</Link> },
          { key: 'zone', header: 'Zone', render: (row) => zones.data?.data.find((item) => item.id === row.zone_id)?.name ?? 'Unassigned' },
          { key: 'load', header: 'Current energy', render: (row) => `${row.energy_consumption} W / ${row.energy_limit} W` },
          { key: 'weight', header: 'Weight limit', render: (row) => `${row.weight} kg` },
          { key: 'equipment', header: 'Equipment', render: (row) => `${row.equipment?.length ?? 0} assets` }
        ]}
        data={cabinets.data?.data ?? []}
      />
    </div>
  );
}
