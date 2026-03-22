import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/provider';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { DataTable } from '../components/common/DataTable';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { switchCabinetsApi, zonesApi } from '../services/api/client';

export function SwitchCabinetsPage() {
  const { t } = useI18n();
  const cabinets = useApiQuery({ queryKey: ['cabinet-list'], queryFn: switchCabinetsApi.list });
  const zones = useApiQuery({ queryKey: ['zone-list'], queryFn: zonesApi.list });

  return (
    <div className="space-y-6">
      <PageHeader title={t('cabinet.title')} description={t('cabinet.description')} breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.switchCabinets') }]} />} />
      <MockBanner meta={cabinets.data?.meta} />
      <DataTable
        columns={[
          { key: 'name', header: t('equipment.rack'), render: (row) => <Link to={`/switch-cabinets/${row.id}`} className="font-semibold text-slate-900 hover:text-brand-700">{row.name}</Link> },
          { key: 'zone', header: t('equipment.zone'), render: (row) => zones.data?.data.find((item) => item.id === row.zone_id)?.name ?? t('common.unassigned') },
          { key: 'load', header: t('cabinet.energy'), render: (row) => `${row.energy_consumption} W / ${row.energy_limit} W` },
          { key: 'weight', header: t('cabinet.weightLimit'), render: (row) => `${row.weight} kg` },
          { key: 'equipment', header: t('cabinet.assets'), render: (row) => t('cabinet.assetsCount', { count: row.equipment?.length ?? 0 }) }
        ]}
        data={cabinets.data?.data ?? []}
      />
    </div>
  );
}
