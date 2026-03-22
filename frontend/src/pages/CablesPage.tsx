import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useI18n } from '../i18n/provider';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Button } from '../components/common/Button';
import { DataTable } from '../components/common/DataTable';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApiQuery } from '../hooks/useApiQuery';
import { CableFormModal } from '../modules/inventory/CableFormModal';
import { cablesApi } from '../services/api/client';
import { Cable } from '../types/entities';
import { getApiErrorMessage } from '../utils/api-error';

export function CablesPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const query = useApiQuery({ queryKey: ['cables'], queryFn: cablesApi.list });
  const createMutation = useMutation({
    mutationFn: (payload: Omit<Cable, 'id'>) => cablesApi.create(payload),
    onSuccess: async () => {
      setFormOpen(false);
      setSubmitError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cables'] }),
        queryClient.invalidateQueries({ queryKey: ['connections'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      ]);
    },
    onError: (error) => setSubmitError(getApiErrorMessage(error, t('crud.error.save')))
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('cables.title')}
        description={t('cables.description')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.cables') }]} />}
        actions={<Button icon={<Plus className="h-4 w-4" />} onClick={() => { setSubmitError(null); setFormOpen(true); }}>{t('cables.create')}</Button>}
      />
      <MockBanner meta={query.data?.meta} />
      <DataTable
        columns={[
          { key: 'id', header: 'ID', render: (row) => row.id },
          { key: 'type', header: t('equipment.type'), render: (row) => t(`cables.type.${row.type}` as const) },
          { key: 'length', header: t('cables.length'), render: (row) => `${row.length} m` },
          { key: 'status', header: t('equipment.status'), render: (row) => <StatusBadge status={row.status} /> },
          { key: 'compatibility', header: t('cables.compatibility'), render: (row) => t(`equipment.type.${row.equipment_type_allowed}` as const) }
        ]}
        data={query.data?.data ?? []}
      />
      <CableFormModal
        open={formOpen}
        loading={createMutation.isPending}
        submitError={submitError}
        onClose={() => setFormOpen(false)}
        onSubmit={(payload) => {
          setSubmitError(null);
          createMutation.mutate({
            type: payload.type,
            length: Number(payload.length),
            status: payload.status,
            equipment_type_allowed: payload.equipment_type_allowed
          });
        }}
      />
    </div>
  );
}
