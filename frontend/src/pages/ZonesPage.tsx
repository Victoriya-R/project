
import { useI18n } from '../i18n/provider';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { ZoneNavigator } from '../modules/zones/ZoneNavigator';
import { equipmentApi, switchCabinetsApi, zonesApi } from '../services/api/client';

export function ZonesPage() {
  const { t } = useI18n();
  const zones = useApiQuery({ queryKey: ['zone-list'], queryFn: zonesApi.list });
  const cabinets = useApiQuery({ queryKey: ['cabinet-list'], queryFn: switchCabinetsApi.list });
  const equipment = useApiQuery({ queryKey: ['equipment'], queryFn: equipmentApi.list });

  return (
    <div className="space-y-6">
      <PageHeader title={t('zones.title')} description={t('zones.description')} breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.zones') }]} />} />
      <MockBanner meta={zones.data?.meta} />
      <ZoneNavigator zones={zones.data?.data ?? []} cabinets={cabinets.data?.data ?? []} equipment={equipment.data?.data ?? []} />
    </div>
  );
}
