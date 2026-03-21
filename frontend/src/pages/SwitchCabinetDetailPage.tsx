import { useParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { RackVisualizer } from '../modules/switch-cabinets/RackVisualizer';
import { switchCabinetsApi } from '../services/api/client';

export function SwitchCabinetDetailPage() {
  const { id = '0' } = useParams();
  const query = useApiQuery({ queryKey: ['cabinet-detail', id], queryFn: () => switchCabinetsApi.detail(Number(id)) });

  if (!query.data) return null;
  const cabinet = query.data.data;

  return (
    <div className="space-y-6">
      <PageHeader title={cabinet.name} description="Graphical rack view with reserved rack units, current utilization and warnings for capacity overruns." breadcrumbs={<Breadcrumbs items={[{ label: 'Dashboard', href: '/' }, { label: 'Switch Cabinets', href: '/switch-cabinets' }, { label: cabinet.name }]} />} />
      <MockBanner meta={query.data.meta} />
      <RackVisualizer cabinet={cabinet} />
    </div>
  );
}
