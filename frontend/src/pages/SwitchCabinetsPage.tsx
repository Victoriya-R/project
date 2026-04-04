import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../i18n/provider';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { ConfirmModal } from '../components/common/ConfirmModal';
import { DataTable } from '../components/common/DataTable';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { CabinetFormModal } from '../modules/inventory/CabinetFormModal';
import { switchCabinetsApi, zonesApi } from '../services/api/client';
import { SwitchCabinet } from '../types/entities';
import { getApiErrorMessage } from '../utils/api-error';

export function SwitchCabinetsPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [selectedCabinet, setSelectedCabinet] = useState<SwitchCabinet | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const cabinets = useApiQuery({ queryKey: ['cabinet-list'], queryFn: switchCabinetsApi.list });
  const zones = useApiQuery({ queryKey: ['zone-list'], queryFn: zonesApi.list });

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['cabinet-list'] }),
      queryClient.invalidateQueries({ queryKey: ['cabinet-detail'] }),
      queryClient.invalidateQueries({ queryKey: ['zone-list'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    ]);
  };

  const createMutation = useMutation({
    mutationFn: switchCabinetsApi.create,
    onSuccess: async () => {
      setFormOpen(false);
      setSelectedCabinet(null);
      setSubmitError(null);
      await invalidate();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, t('crud.error.save')))
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<SwitchCabinet>) => switchCabinetsApi.update(selectedCabinet?.id ?? 0, payload),
    onSuccess: async () => {
      setFormOpen(false);
      setSelectedCabinet(null);
      setSubmitError(null);
      await invalidate();
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, t('crud.error.save')))
  });

  const deleteMutation = useMutation({
    mutationFn: () => switchCabinetsApi.remove(selectedCabinet?.id ?? 0),
    onSuccess: async () => {
      setDeleteOpen(false);
      setSelectedCabinet(null);
      setDeleteError(null);
      await invalidate();
    },
    onError: (error) => setDeleteError(getApiErrorMessage(error, t('crud.error.delete')))
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('cabinet.title')}
        description={t('cabinet.description')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.switchCabinets') }]} />}
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => { setSelectedCabinet(null); setSubmitError(null); setFormOpen(true); }}>{t('cabinet.create')}</Button>}
      />
      <MockBanner meta={cabinets.data?.meta} />
      <DataTable
        columns={[
          { key: 'name', header: t('equipment.rack'), render: (row) => <Link to={`/switch-cabinets/${row.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{row.name}</Link> },
          { key: 'zone', header: t('equipment.zone'), render: (row) => zones.data?.data.find((item) => item.id === row.zone_id)?.name ?? t('common.unassigned') },
          { key: 'serial', header: t('cabinet.form.serial'), render: (row) => row.serial_number },
          { key: 'load', header: t('cabinet.energy'), render: (row) => `${row.current_energy_consumption ?? 0} W / ${row.energy_limit} W` },
          { key: 'weight', header: t('cabinet.weightLimit'), render: (row) => `${row.current_weight ?? 0} kg / ${row.weight} kg` },
          { key: 'equipment', header: t('cabinet.assets'), render: (row) => t('cabinet.assetsCount', { count: row.equipment_count ?? 0 }) },
          {
            key: 'actions',
            header: t('equipment.actions'),
            render: (row) => (
              <div className="flex gap-2">
                <Button variant="ghost" className="px-2.5" onClick={() => { setSelectedCabinet(row); setSubmitError(null); setFormOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                <Button variant="ghost" className="px-2.5" onClick={() => { setSelectedCabinet(row); setDeleteError(null); setDeleteOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            )
          }
        ]}
        data={cabinets.data?.data ?? []}
      />
      <CabinetFormModal
        open={formOpen}
        cabinet={selectedCabinet}
        zones={zones.data?.data ?? []}
        loading={createMutation.isPending || updateMutation.isPending}
        submitError={submitError}
        onClose={() => setFormOpen(false)}
        onSubmit={(payload) => {
          setSubmitError(null);
          if (selectedCabinet) {
            updateMutation.mutate(payload);
            return;
          }
          createMutation.mutate(payload);
        }}
      />
      <ConfirmModal
        open={deleteOpen}
        title={t('cabinet.deleteTitle')}
        description={selectedCabinet ? t('cabinet.deleteDescription', { name: selectedCabinet.name }) : t('crud.deletePrompt')}
        confirmLabel={t('common.delete')}
        loading={deleteMutation.isPending}
        error={deleteError}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutate()}
      />
    </div>
  );
}
