import { useI18n } from '../i18n/provider';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { DataTable } from '../components/common/DataTable';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApiQuery } from '../hooks/useApiQuery';
import { cablesApi } from '../services/api/client';

export function CablesPage() {
  const { t } = useI18n();
  const query = useApiQuery({ queryKey: ['cables'], queryFn: cablesApi.list });

  return (
    <div className="space-y-6">
      <PageHeader title={t('cables.title')} description={t('cables.description')} breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.cables') }]} />} />
      <MockBanner meta={query.data?.meta} />
      <DataTable
        columns={[
          { key: 'id', header: 'ID', render: (row) => row.id },
          { key: 'type', header: t('equipment.type'), render: (row) => row.type },
          { key: 'length', header: t('cables.length'), render: (row) => `${row.length} m` },
          { key: 'status', header: t('equipment.status'), render: (row) => <StatusBadge status={row.status} /> },
          { key: 'compatibility', header: t('cables.compatibility'), render: (row) => row.equipment_type_allowed }
        ]}
        data={query.data?.data ?? []}
      />
    </div>
  );
}
