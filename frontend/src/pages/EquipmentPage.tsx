import { Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/provider';
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
  const { t } = useI18n();
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
        title={t('equipment.title')}
        description={t('equipment.description')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.equipment') }]} />}
        actions={<><Button variant="secondary">{t('common.import')}</Button>{role === 'admin' ? <Button icon={<Plus className="h-4 w-4" />}>{t('common.createEquipment')}</Button> : null}</>}
      />
      <MockBanner meta={equipment.data?.meta} />
      <FilterBar>
        <FormField label={t('equipment.search')}><TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('equipment.searchPlaceholder')} /></FormField>
        <FormField label={t('equipment.type')}><SelectInput value={type} onChange={(e) => setType(e.target.value)}><option value="">{t('common.all')}</option><option value="server">{t('equipment.type.server')}</option><option value="patchPanel">{t('equipment.type.patchPanel')}</option><option value="ups">{t('equipment.type.ups')}</option></SelectInput></FormField>
        <FormField label={t('equipment.status')}><SelectInput value={status} onChange={(e) => setStatus(e.target.value)}><option value="">{t('common.all')}</option><option value="active">{t('status.active')}</option><option value="inactive">{t('status.inactive')}</option><option value="maintenance">{t('status.maintenance')}</option><option value="planned">{t('status.planned')}</option></SelectInput></FormField>
        <FormField label={t('equipment.zone')}><SelectInput value={zone} onChange={(e) => setZone(e.target.value)}><option value="">{t('common.all')}</option>{zones.data?.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectInput></FormField>
        <FormField label={t('equipment.rack')}><SelectInput value={cabinet} onChange={(e) => setCabinet(e.target.value)}><option value="">{t('common.all')}</option>{cabinets.data?.data.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</SelectInput></FormField>
      </FilterBar>
      {filtered.length ? (
        <DataTable
          columns={[
            { key: 'name', header: t('nav.equipment'), render: (row) => <div><Link to={`/equipment/${row.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{row.name}</Link><p className="text-xs text-slate-500">{row.model}</p></div> },
            { key: 'type', header: t('equipment.type'), render: (row) => t(`equipment.type.${row.type}` as const) },
            { key: 'serial', header: t('equipment.detail.serial'), render: (row) => row.serial },
            { key: 'status', header: t('equipment.status'), render: (row) => <StatusBadge status={row.status} /> },
            { key: 'metrics', header: t('equipment.weightEnergy'), render: (row) => <div><p>{row.weight ?? '—'} kg</p><p className="text-xs text-slate-500">{row.energy_consumption ?? '—'} W</p></div> },
            { key: 'rack', header: t('equipment.rack'), render: (row) => cabinets.data?.data.find((item) => item.id === row.switch_cabinet_id)?.name ?? t('common.unassigned') },
            { key: 'actions', header: t('equipment.actions'), render: () => <div className="flex gap-2"><Button variant="ghost" className="px-2.5"><Search className="h-4 w-4" /></Button>{role === 'admin' ? <Button variant="ghost" className="px-2.5" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /></Button> : null}</div> }
          ]}
          data={filtered}
        />
      ) : <EmptyState title={t('equipment.noResults')} description={t('equipment.noResultsDesc')} />}
      <Modal open={deleteOpen} onClose={() => setDeleteOpen(false)} title={t('equipment.confirmDelete')}>
        <p className="text-sm text-slate-600">{t('equipment.confirmDeleteDesc')}</p>
        <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setDeleteOpen(false)}>{t('common.cancel')}</Button><Button variant="danger" onClick={() => setDeleteOpen(false)}>{t('common.delete')}</Button></div>
      </Modal>
    </div>
  );
}
