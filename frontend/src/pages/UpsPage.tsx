import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../i18n/provider';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { DataTable } from '../components/common/DataTable';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApiQuery } from '../hooks/useApiQuery';
import { UpsCreateModal } from '../modules/inventory/UpsCreateModal';
import { upsApi } from '../services/api/client';
import { getApiErrorMessage } from '../utils/api-error';

export function UpsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const query = useApiQuery({ queryKey: ['ups'], queryFn: upsApi.list });
  const createMutation = useMutation({
    mutationFn: upsApi.create,
    onSuccess: async (response) => {
      const createdId = response.data?.id;
      setFormOpen(false);
      setSubmitError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['ups'] }),
        queryClient.invalidateQueries({ queryKey: ['equipment'] }),
        queryClient.invalidateQueries({ queryKey: ['connections'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      ]);
      if (createdId) {
        void queryClient.invalidateQueries({ queryKey: ['ups-detail', String(createdId)] });
        void queryClient.invalidateQueries({ queryKey: ['ups-ports', String(createdId)] });
        navigate(`/ups/${createdId}`);
      }
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, t('crud.error.save')))
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('ups.title')}
        description={t('ups.description')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.ups') }]} />}
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => { setSubmitError(null); setFormOpen(true); }}>{t('ups.create')}</Button>}
      />
      <MockBanner meta={query.data?.meta} />
      <DataTable
        columns={[
          { key: 'name', header: t('nav.ups'), render: (row) => <Link to={`/ups/${row.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{row.name}</Link> },
          { key: 'status', header: t('equipment.status'), render: (row) => <StatusBadge status={row.status} /> },
          { key: 'capacity', header: t('ups.capacity'), render: (row) => `${row.upsData.capacity} VA` },
          { key: 'battery', header: t('ups.batteryLife'), render: (row) => `${row.upsData.battery_life} min` },
          { key: 'ports', header: t('ups.ports'), render: (row) => t('ups.patchPowerSummary', { patch: row.ports?.filter((port) => port.port_type === 'patch').length ?? 0, power: row.ports?.filter((port) => port.port_type === 'power').length ?? 0 }) }
        ]}
        data={query.data?.data ?? []}
      />
      <UpsCreateModal
        open={formOpen}
        loading={createMutation.isPending}
        submitError={submitError}
        onClose={() => setFormOpen(false)}
        onSubmit={(payload) => {
          setSubmitError(null);
          createMutation.mutate({
            name: payload.name,
            status: payload.status,
            upsData: {
              capacity: Number(payload.capacity),
              battery_life: Number(payload.battery_life)
            }
          });
        }}
      />
    </div>
  );
}
