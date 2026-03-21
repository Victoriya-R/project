import { Link } from 'react-router-dom';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { DataTable } from '../components/common/DataTable';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApiQuery } from '../hooks/useApiQuery';
import { upsApi } from '../services/api/client';

export function UpsPage() {
  const query = useApiQuery({ queryKey: ['ups'], queryFn: upsApi.list });

  return (
    <div className="space-y-6">
      <PageHeader title="UPS" description="Dedicated module for uninterruptible power supply assets, their capacities, battery autonomy and mixed port topology." breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'UPS' }]} />} />
      <MockBanner meta={query.data?.meta} />
      <DataTable
        columns={[
          { key: 'name', header: 'UPS', render: (row) => <Link to={`/ups/${row.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{row.name}</Link> },
          { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} /> },
          { key: 'capacity', header: 'Capacity', render: (row) => `${row.upsData.capacity} VA` },
          { key: 'battery', header: 'Battery life', render: (row) => `${row.upsData.battery_life} min` },
          { key: 'ports', header: 'Ports', render: (row) => `${row.ports?.filter((port) => port.port_type === 'patch').length ?? 0} patch / ${row.ports?.filter((port) => port.port_type === 'power').length ?? 0} power` }
        ]}
        data={query.data?.data ?? []}
      />
    </div>
  );
}
