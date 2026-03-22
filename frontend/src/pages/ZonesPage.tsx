import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../i18n/provider';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { DataTable } from '../components/common/DataTable';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { ZoneFormModal } from '../modules/inventory/ZoneFormModal';
import { ZoneNavigator } from '../modules/zones/ZoneNavigator';
import { equipmentApi, switchCabinetsApi, zonesApi } from '../services/api/client';
import { useAuthStore } from '../store/auth-store';
import { Zone } from '../types/entities';
import { getApiErrorMessage } from '../utils/api-error';

export function ZonesPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const role = useAuthStore((state) => state.user?.role);
  const [formOpen, setFormOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const zones = useApiQuery({ queryKey: ['zone-list'], queryFn: zonesApi.list });
  const cabinets = useApiQuery({ queryKey: ['cabinet-list'], queryFn: switchCabinetsApi.list });
  const equipment = useApiQuery({ queryKey: ['equipment'], queryFn: equipmentApi.list });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['zone-list'] }),
      queryClient.invalidateQueries({ queryKey: ['zone-detail'] }),
      queryClient.invalidateQueries({ queryKey: ['cabinet-list'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    ]);
  };

  const createMutation = useMutation({
    mutationFn: zonesApi.create,
    onSuccess: async () => {
      setFormOpen(false);
      setSelectedZone(null);
      setSubmitError(null);
      await invalidate();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, t('crud.error.save')))
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Zone>) => zonesApi.update(selectedZone?.id ?? 0, payload),
    onSuccess: async () => {
      setFormOpen(false);
      setSelectedZone(null);
      setSubmitError(null);
      await invalidate();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, t('crud.error.save')))
  });

  const deleteMutation = useMutation({
    mutationFn: () => zonesApi.remove(selectedZone?.id ?? 0),
    onSuccess: async () => {
      setDeleteOpen(false);
      setSelectedZone(null);
      setDeleteError(null);
      await invalidate();
    },
    onError: (error) => setDeleteError(getApiErrorMessage(error, t('crud.error.delete')))
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('zones.title')}
        description={t('zones.description')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.zones') }]} />}
        actions={role === 'admin' ? <Button icon={<Plus className="h-4 w-4" />} onClick={() => { setSelectedZone(null); setSubmitError(null); setFormOpen(true); }}>{t('zones.create')}</Button> : undefined}
      />
      <MockBanner meta={zones.data?.meta} />
      <ZoneNavigator zones={zones.data?.data ?? []} cabinets={cabinets.data?.data ?? []} equipment={equipment.data?.data ?? []} />
      <DataTable
        columns={[
          { key: 'name', header: t('zones.form.name'), render: (row) => <div><p className="font-semibold text-slate-900">{row.name}</p><p className="text-xs text-slate-500">{row.site || row.address || '—'}</p></div> },
          { key: 'employee', header: t('zone.detail.owner'), render: (row) => row.employee ?? '—' },
          { key: 'racks', header: t('zone.detail.switchCabinets'), render: (row) => String((cabinets.data?.data ?? []).filter((cabinet) => cabinet.zone_id === row.id).length) },
          { key: 'equipment', header: t('zone.detail.equipment'), render: (row) => String((equipment.data?.data ?? []).filter((item) => (cabinets.data?.data ?? []).some((cabinet) => cabinet.zone_id === row.id && cabinet.id === item.switch_cabinet_id)).length) },
          {
            key: 'actions',
            header: t('equipment.actions'),
            render: (row) => role === 'admin' ? (
              <div className="flex gap-2">
                <Button variant="ghost" className="px-2.5" onClick={() => { setSelectedZone(row); setSubmitError(null); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" className="px-2.5" onClick={() => { setSelectedZone(row); setDeleteError(null); setDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ) : <span className="text-slate-400">—</span>
          }
        ]}
        data={zones.data?.data ?? []}
      />
      <ZoneFormModal
        open={formOpen}
        zone={selectedZone}
        loading={createMutation.isPending || updateMutation.isPending}
        submitError={submitError}
        onClose={() => setFormOpen(false)}
        onSubmit={(payload) => {
          setSubmitError(null);
          if (selectedZone) {
            updateMutation.mutate(payload);
            return;
          }
          createMutation.mutate(payload);
        }}
      />
      <ConfirmModal
        open={deleteOpen}
        title={t('zones.deleteTitle')}
        description={selectedZone ? t('zones.deleteDescription', { name: selectedZone.name }) : t('crud.deletePrompt')}
        confirmLabel={t('common.delete')}
        loading={deleteMutation.isPending}
        error={deleteError}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
