import { Download } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { DataTable } from '../components/common/DataTable';
import { InfoCard } from '../components/common/InfoCard';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { reportsApi } from '../services/api/client';

export function ReportsPage() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'equipment';
  const equipment = useApiQuery({ queryKey: ['report-equipment'], queryFn: reportsApi.equipmentStatus });
  const cabinets = useApiQuery({ queryKey: ['report-cabinets'], queryFn: reportsApi.switchCabinets });
  const zones = useApiQuery({ queryKey: ['report-zones'], queryFn: reportsApi.zones });
  const zoneLoad = useApiQuery({ queryKey: ['report-zones-load'], queryFn: reportsApi.zonesLoad });

  const tabs = [
    { key: 'equipment', label: 'Equipment status' },
    { key: 'cabinets', label: 'Racks' },
    { key: 'zones', label: 'Zones' },
    { key: 'zone-load', label: 'Zone load' }
  ];

  const meta = equipment.data?.meta ?? cabinets.data?.meta ?? zones.data?.meta ?? zoneLoad.data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" description="Analyst-friendly reports with summaries, filter placeholders, table output and export stubs prepared for backend integration." breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Reports' }]} />} actions={<><Button variant="secondary" icon={<Download className="h-4 w-4" />}>Export CSV</Button><Button variant="secondary">Download PDF</Button></>} />
      <MockBanner meta={meta} />
      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => <button key={item.key} onClick={() => setParams({ tab: item.key })} className={`rounded-xl px-4 py-2 text-sm font-medium ${tab === item.key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}>{item.label}</button>)}
      </div>
      {tab === 'equipment' ? (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard title="Types covered" value={String(equipment.data?.data.length ?? 0)} description="Grouped by backend asset type" />
            <InfoCard title="Active assets" value={String(equipment.data?.data.reduce((sum, item) => sum + item.active_count, 0) ?? 0)} description="Across all tracked types" />
            <InfoCard title="Maintenance assets" value={String(equipment.data?.data.reduce((sum, item) => sum + item.maintenance_count, 0) ?? 0)} description="Useful for change windows" />
          </div>
          <DataTable columns={[{ key: 'type', header: 'Type', render: (row) => row.type }, { key: 'total', header: 'Total', render: (row) => row.total_count }, { key: 'active', header: 'Active', render: (row) => row.active_count }, { key: 'inactive', header: 'Inactive', render: (row) => row.inactive_count }, { key: 'maintenance', header: 'Maintenance', render: (row) => row.maintenance_count }]} data={equipment.data?.data ?? []} />
        </div>
      ) : null}
      {tab === 'cabinets' ? <DataTable columns={[{ key: 'name', header: 'Rack', render: (row) => row.name }, { key: 'zone', header: 'Zone', render: (row) => row.zone_name ?? '—' }, { key: 'equipment', header: 'Equipment', render: (row) => row.equipment_count }, { key: 'weight', header: 'Weight load', render: (row) => `${row.current_weight}/${row.weight_limit}` }, { key: 'energy', header: 'Energy load', render: (row) => `${row.current_energy_consumption}/${row.energy_limit}` }]} data={cabinets.data?.data ?? []} /> : null}
      {tab === 'zones' ? <DataTable columns={[{ key: 'name', header: 'Zone', render: (row) => row.name }, { key: 'racks', header: 'Racks', render: (row) => row.switch_cabinet_count }, { key: 'equipment', header: 'Equipment', render: (row) => row.equipment_count }, { key: 'weight', header: 'Total weight', render: (row) => row.total_equipment_weight }, { key: 'energy', header: 'Energy', render: (row) => row.total_energy_consumption }]} data={zones.data?.data ?? []} /> : null}
      {tab === 'zone-load' ? <DataTable columns={[{ key: 'zone', header: 'Zone', render: (row) => row.zone_name }, { key: 'racks', header: 'Racks', render: (row) => row.switch_cabinet_count }, { key: 'weight', header: 'Weight %', render: (row) => `${row.weight_load_percent}%` }, { key: 'energy', header: 'Energy %', render: (row) => `${row.energy_load_percent}%` }, { key: 'overload', header: 'Overloaded racks', render: (row) => row.overloaded_by_energy_cabinets + row.overloaded_by_weight_cabinets }]} data={zoneLoad.data?.data ?? []} /> : null}
    </div>
  );
}
