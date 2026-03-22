import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/provider';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { DataTable } from '../components/common/DataTable';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApiQuery } from '../hooks/useApiQuery';
import { upsApi } from '../services/api/client';

export function UpsPage() {
  const { t } = useI18n();
  const query = useApiQuery({ queryKey: ['ups'], queryFn: upsApi.list });

  return (
    <div className="space-y-6">
      <PageHeader title={t('ups.title')} description={t('ups.description')} breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.ups') }]} />} />
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
    </div>
  );
}
