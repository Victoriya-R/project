import { useMemo } from 'react';
import { useI18n } from '../i18n/provider';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { DataTable } from '../components/common/DataTable';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { useApiQuery } from '../hooks/useApiQuery';
import { ConnectionWizard } from '../modules/connections/ConnectionWizard';
import { cablesApi, connectionsApi, equipmentApi, upsApi } from '../services/api/client';
import { createDefaultPortsForEquipment } from '../utils/ports';

export function ConnectionsPage() {
  const { t } = useI18n();
  const cables = useApiQuery({ queryKey: ['cables'], queryFn: cablesApi.list });
  const connections = useApiQuery({ queryKey: ['connections'], queryFn: connectionsApi.list });
  const equipment = useApiQuery({ queryKey: ['equipment'], queryFn: equipmentApi.list });
  const ups = useApiQuery({ queryKey: ['ups'], queryFn: upsApi.list });

  const portsMap = useMemo(() => {
    const equipmentPorts = Object.fromEntries((equipment.data?.data ?? []).map((item) => [item.id, createDefaultPortsForEquipment(item)]));
    const upsPorts = Object.fromEntries((ups.data?.data ?? []).map((item) => [item.id, item.ports ?? createDefaultPortsForEquipment(item)]));
    return { ...equipmentPorts, ...upsPorts };
  }, [equipment.data, ups.data]);

  return (
    <div className="space-y-6">
      <PageHeader title={t('connections.title')} description={t('connections.description')} breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.connections') }]} />} />
      <MockBanner meta={connections.data?.meta?.usingMock ? connections.data.meta : cables.data?.meta} />
      <ConnectionWizard cables={cables.data?.data ?? []} equipment={equipment.data?.data ?? []} upsItems={ups.data?.data ?? []} portsMap={portsMap} />
      <DataTable
        columns={[
          { key: 'id', header: t('connections.connection'), render: (row) => `#${row.id}` },
          { key: 'cable', header: t('connections.cable'), render: (row) => cables.data?.data.find((item) => item.id === row.cable_id)?.type ?? row.cable_id },
          { key: 'a', header: t('connections.portA'), render: (row) => row.a_port_id },
          { key: 'b', header: t('connections.portB'), render: (row) => row.b_port_id },
          { key: 'status', header: t('equipment.status'), render: (row) => row.status ?? 'active' }
        ]}
        data={connections.data?.data ?? []}
      />
    </div>
  );
}
