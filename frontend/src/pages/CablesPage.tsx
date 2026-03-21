import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { DataTable } from '../components/common/DataTable';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApiQuery } from '../hooks/useApiQuery';
import { cablesApi } from '../services/api/client';

export function CablesPage() {
  const query = useApiQuery({ queryKey: ['cables'], queryFn: cablesApi.list });

  return (
    <div className="space-y-6">
      <PageHeader title="Cables" description="Cable inventory with compatibility hints, lifecycle status and search-ready tabular layout for test scenarios." breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Cables' }]} />} />
      <MockBanner meta={query.data?.meta} />
      <DataTable
        columns={[
          { key: 'id', header: 'ID', render: (row) => row.id },
          { key: 'type', header: 'Type', render: (row) => row.type },
          { key: 'length', header: 'Length', render: (row) => `${row.length} m` },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'compatibility', header: 'Compatible equipment', render: (row) => row.equipment_type_allowed }
        ]}
        data={query.data?.data ?? []}
      />
    </div>
  );
}
