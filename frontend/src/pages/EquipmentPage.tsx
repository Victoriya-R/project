import { Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { DataTable } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { FilterBar } from '../components/common/FilterBar';
import { FormField, SelectInput, TextInput } from '../components/common/FormField';
import { Modal } from '../components/common/Modal';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApiQuery } from '../hooks/useApiQuery';
import { equipmentApi, switchCabinetsApi, zonesApi } from '../services/api/client';
import { useAuthStore } from '../store/auth-store';

export function EquipmentPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [zone, setZone] = useState('');
  const [cabinet, setCabinet] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const role = useAuthStore((state) => state.user?.role);
  const equipment = useApiQuery({ queryKey: ['equipment'], queryFn: equipmentApi.list });
  const cabinets = useApiQuery({ queryKey: ['cabinet-list'], queryFn: switchCabinetsApi.list });
  const zones = useApiQuery({ queryKey: ['zone-list'], queryFn: zonesApi.list });

  const filtered = useMemo(() => {
    if (!equipment.data) return [];
    const cabinetZoneMap = new Map((cabinets.data?.data ?? []).map((item) => [item.id, item.zone_id]));
    return equipment.data.data.filter((item) => {
      const matchesSearch = [item.name, item.serial].some((value) => value.toLowerCase().includes(search.toLowerCase()));
      const matchesType = !type || item.type === type;
      const matchesStatus = !status || item.status === status;
      const matchesCabinet = !cabinet || String(item.switch_cabinet_id ?? '') === cabinet;
      const matchesZone = !zone || String(cabinetZoneMap.get(item.switch_cabinet_id ?? -1) ?? '') === zone;
      return matchesSearch && matchesType && matchesStatus && matchesCabinet && matchesZone;
    });
  }, [cabinet, cabinets.data, equipment.data, search, status, type, zone]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipment"
        description="Unified asset registry with filters, placement context, card-style drilldown and quick access to port topology."
        breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Equipment' }]} />}
        actions={<><Button variant="secondary">Import</Button>{role === 'admin' ? <Button icon={<Plus className="h-4 w-4" />}>Create equipment</Button> : null}</>}
      />
      <MockBanner meta={equipment.data?.meta} />
      <FilterBar>
        <FormField label="Search"><TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or serial" /></FormField>
        <FormField label="Type"><SelectInput value={type} onChange={(e) => setType(e.target.value)}><option value="">All</option><option value="server">Server</option><option value="patchPanel">Patch panel</option><option value="ups">UPS</option></SelectInput></FormField>
        <FormField label="Status"><SelectInput value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="active">Active</option><option value="inactive">Inactive</option><option value="maintenance">Maintenance</option><option value="planned">Planned</option></SelectInput></FormField>
        <FormField label="Zone"><SelectInput value={zone} onChange={(e) => setZone(e.target.value)}><option value="">All</option>{zones.data?.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectInput></FormField>
        <FormField label="Rack"><SelectInput value={cabinet} onChange={(e) => setCabinet(e.target.value)}><option value="">All</option>{cabinets.data?.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectInput></FormField>
      </FilterBar>
      {filtered.length ? (
        <DataTable
          columns={[
            { key: 'name', header: 'Name', render: (row) => <div><Link to={`/equipment/${row.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{row.name}</Link><p className="text-xs text-slate-500">{row.model}</p></div> },
            { key: 'type', header: 'Type', render: (row) => row.type },
            { key: 'serial', header: 'Serial', render: (row) => row.serial },
            { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
            { key: 'metrics', header: 'Weight / Energy', render: (row) => <div><p>{row.weight ?? '—'} kg</p><p className="text-xs text-slate-500">{row.energy_consumption ?? '—'} W</p></div> },
            { key: 'rack', header: 'Rack', render: (row) => cabinets.data?.data.find((item) => item.id === row.switch_cabinet_id)?.name ?? 'Unassigned' },
            { key: 'actions', header: 'Actions', render: () => <div className="flex gap-2"><Button variant="ghost" className="px-2.5"><Search className="h-4 w-4" /></Button>{role === 'admin' ? <Button variant="ghost" className="px-2.5" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /></Button> : null}</div> }
          ]}
          data={filtered}
        />
      ) : <EmptyState title="No equipment found" description="Adjust filters or create a new asset to start filling the rack topology." />}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title="Confirm deletion">
        <p className="text-sm text-slate-600">Опасное действие должно быть подтверждено. Здесь будет вызов backend delete endpoint после выбора конкретного объекта.</p>
        <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="danger" onClick={() => setDeleteOpen(false)}>Delete</Button></div>
      </Modal>
    </div>
  );
}
