import { Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../i18n/provider';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { DataTable } from '../components/common/DataTable';
import { EmptyState } from '../components/common/EmptyState';
import { FilterBar } from '../components/common/FilterBar';
import { FormField, SelectInput, TextInput } from '../components/common/FormField';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApiQuery } from '../hooks/useApiQuery';
import { EquipmentFormModal } from '../modules/inventory/EquipmentFormModal';
import { equipmentApi, switchCabinetsApi, upsApi, zonesApi } from '../services/api/client';
import { useAuthStore } from '../store/auth-store';
import { Equipment, UpsEntity } from '../types/entities';
import { getApiErrorMessage } from '../utils/api-error';

type EquipmentEditorTarget = Equipment | UpsEntity;

export function EquipmentPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [zone, setZone] = useState('');
  const [cabinet, setCabinet] = useState('');
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentEditorTarget | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const role = useAuthStore((state) => state.user?.role);
  const equipment = useApiQuery({ queryKey: ['equipment'], queryFn: equipmentApi.list });
  const cabinets = useApiQuery({ queryKey: ['cabinet-list'], queryFn: switchCabinetsApi.list });
  const zones = useApiQuery({ queryKey: ['zone-list'], queryFn: zonesApi.list });

  const invalidateEquipmentData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['equipment'] }),
      queryClient.invalidateQueries({ queryKey: ['cabinet-list'] }),
      queryClient.invalidateQueries({ queryKey: ['equipment-ports'] }),
      queryClient.invalidateQueries({ queryKey: ['cabinet-detail'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    ]);
  };

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (payload.type === 'ups') {
        return upsApi.create({
          name: payload.name,
          status: payload.status,
          upsData: {
            capacity: Number(payload.ups_capacity),
            battery_life: Number(payload.ups_battery_life),
            status: payload.status
          }
        });
      }

      return equipmentApi.create({
        name: payload.name,
        type: payload.type,
        model: payload.model,
        serial: payload.serial,
        status: payload.status,
        serverData: payload.type === 'server' ? {
          ip_address: payload.server_ip_address,
          memory_slots: Number(payload.server_memory_slots),
          cpu: payload.server_cpu,
          os: payload.server_os
        } : undefined,
        patchPanelData: payload.type === 'patchPanel' ? {
          number_of_ports: Number(payload.patch_ports),
          port_type: payload.patch_port_type
        } : undefined
      });
    },
    onSuccess: async () => {
      setFormOpen(false);
      setSelectedEquipment(null);
      setSubmitError(null);
      await invalidateEquipmentData();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, t('crud.error.save')))
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (!selectedEquipment) return null;
      const typeValue = 'type' in selectedEquipment ? selectedEquipment.type : 'ups';
      if (typeValue === 'ups') {
        return upsApi.update(selectedEquipment.id, {
          name: payload.name,
          status: payload.status,
          upsData: {
            capacity: Number(payload.ups_capacity),
            battery_life: Number(payload.ups_battery_life),
            status: payload.status
          }
        });
      }

      return equipmentApi.update(selectedEquipment.id, {
        name: payload.name,
        status: payload.status
      });
    },
    onSuccess: async () => {
      setFormOpen(false);
      setSelectedEquipment(null);
      setSubmitError(null);
      await invalidateEquipmentData();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, t('crud.error.save')))
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedEquipment) return null;
      const typeValue = 'type' in selectedEquipment ? selectedEquipment.type : 'ups';
      return typeValue === 'ups' ? upsApi.remove(selectedEquipment.id) : equipmentApi.remove(selectedEquipment.id);
    },
    onSuccess: async () => {
      setDeleteOpen(false);
      setSelectedEquipment(null);
      setDeleteError(null);
      await invalidateEquipmentData();
    },
    onError: (error) => setDeleteError(getApiErrorMessage(error, t('crud.error.delete')))
  });

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

  const openCreate = () => {
    setFormMode('create');
    setSelectedEquipment(null);
    setSubmitError(null);
    setFormOpen(true);
  };

  const openEdit = async (item: Equipment) => {
    setFormMode('edit');
    setSubmitError(null);
    if (item.type === 'ups') {
      try {
        const response = await upsApi.detail(item.id);
        setSelectedEquipment(response.data);
      } catch {
        setSelectedEquipment(item);
      }
    } else {
      setSelectedEquipment(item);
    }
    setFormOpen(true);
  };

  const openDelete = (item: Equipment) => {
    setSelectedEquipment(item);
    setDeleteError(null);
    setDeleteOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('equipment.title')}
        description={t('equipment.description')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.equipment') }]} />}
        actions={<><Button variant="secondary">{t('common.import')}</Button>{<Button icon={<Plus className="h-4 w-4" />} onClick={openCreate}>{t('equipment.create')}</Button>}</>}
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
            {
              key: 'actions',
              header: t('equipment.actions'),
              render: (row) => (
                <div className="flex gap-2">
                  <Link to={`/equipment/${row.id}`}><Button variant="ghost" className="px-2.5"><Search className="h-4 w-4" /></Button></Link>
                  {<Button variant="ghost" className="px-2.5" onClick={() => void openEdit(row)}><Pencil className="h-4 w-4" /></Button>}
                  {<Button variant="ghost" className="px-2.5" onClick={() => openDelete(row)}><Trash2 className="h-4 w-4" /></Button>}
                </div>
              )
            }
          ]}
          data={filtered}
        />
      ) : <EmptyState title={t('equipment.noResults')} description={t('equipment.noResultsDesc')} />}
      <EquipmentFormModal
        open={formOpen}
        mode={formMode}
        equipment={selectedEquipment}
        loading={createMutation.isPending || updateMutation.isPending}
        submitError={submitError}
        onClose={() => setFormOpen(false)}
        onSubmit={(payload) => {
          setSubmitError(null);
          if (formMode === 'create') {
            createMutation.mutate(payload);
            return;
          }
          updateMutation.mutate(payload);
        }}
      />
      <ConfirmModal
        open={deleteOpen}
        title={t('equipment.deleteTitle')}
        description={selectedEquipment ? t('equipment.deleteDescription', { name: selectedEquipment.name }) : t('equipment.confirmDeleteDesc')}
        confirmLabel={t('common.delete')}
        loading={deleteMutation.isPending}
        error={deleteError}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
