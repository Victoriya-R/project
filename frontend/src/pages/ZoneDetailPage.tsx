import { useParams } from 'react-router-dom';
import { useI18n } from '../i18n/provider';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { DataTable } from '../components/common/DataTable';
import { InfoCard } from '../components/common/InfoCard';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { equipmentApi, switchCabinetsApi, zonesApi } from '../services/api/client';

export function ZoneDetailPage() {
  const { t } = useI18n();
  const { id = '0' } = useParams();
  const zone = useApiQuery({ queryKey: ['zone-detail', id], queryFn: () => zonesApi.detail(Number(id)) });
  const cabinets = useApiQuery({ queryKey: ['cabinet-list'], queryFn: switchCabinetsApi.list });
  const equipment = useApiQuery({ queryKey: ['equipment'], queryFn: equipmentApi.list });

  if (!zone.data) return null;

  const zoneCabinets = (cabinets.data?.data ?? []).filter((cabinet) => cabinet.zone_id === Number(id));
  const zoneEquipment = (equipment.data?.data ?? []).filter((item) => zoneCabinets.some((cabinet) => cabinet.id === item.switch_cabinet_id));

  return (
    <div className="space-y-6">
      <PageHeader title={zone.data.data.name} description={t('zone.detail.description')} breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.zones'), href: '/zones' }, { label: zone.data.data.name }]} />} />
      <MockBanner meta={zone.data.meta} />
      <section className="grid gap-4 xl:grid-cols-3">
        <InfoCard title={t('zone.detail.switchCabinets')} value={String(zoneCabinets.length)} description={t('zone.detail.switchCabinetsDesc')} />
        <InfoCard title={t('zone.detail.equipment')} value={String(zoneEquipment.length)} description={t('zone.detail.equipmentDesc')} />
        <InfoCard title={t('zone.detail.owner')} value={zone.data.data.employee ?? '—'} description={zone.data.data.site ?? t('common.placeholderSite')} />
      </section>
      <DataTable
        columns={[
          { key: 'name', header: t('equipment.rack'), render: (row) => row.name },
          { key: 'serial', header: t('zone.detail.serial'), render: (row) => row.serial_number },
          { key: 'energy', header: t('zone.detail.energyLimit'), render: (row) => `${row.energy_limit} W` },
          { key: 'equipment', header: t('zone.detail.equipmentCount'), render: (row) => `${row.equipment?.length ?? 0}` }
        ]}
        data={zoneCabinets}
      />
    </div>
  );
}
