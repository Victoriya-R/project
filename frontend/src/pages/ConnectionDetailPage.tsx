import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useQueries } from '@tanstack/react-query';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { LoadingState } from '../components/common/LoadingState';
import { MockBanner } from '../components/common/MockBanner';
import { PageHeader } from '../components/common/PageHeader';
import { StatusBadge } from '../components/common/StatusBadge';
import { useApiQuery } from '../hooks/useApiQuery';
import { useI18n } from '../i18n/provider';
import { ConnectionsTopology } from '../modules/connections/ConnectionsTopology';
import { buildDeviceOptions, overlayConnectionStatuses, resolveConnectionRows } from '../modules/connections/utils';
import { cablesApi, connectionsApi, equipmentApi, upsApi } from '../services/api/client';
import { Port } from '../types/entities';

export function ConnectionDetailPage() {
  const { t } = useI18n();
  const { id = '0' } = useParams();
  const cables = useApiQuery({ queryKey: ['cables'], queryFn: cablesApi.list });
  const connections = useApiQuery({ queryKey: ['connections'], queryFn: connectionsApi.list });
  const equipment = useApiQuery({ queryKey: ['equipment'], queryFn: equipmentApi.list });
  const ups = useApiQuery({ queryKey: ['ups'], queryFn: upsApi.list });
  const devices = useMemo(() => buildDeviceOptions(equipment.data?.data ?? [], ups.data?.data ?? []), [equipment.data?.data, ups.data?.data]);

  const portQueries = useQueries({
    queries: devices.map((device) => ({
      queryKey: ['ports', device.type === 'ups' ? 'ups' : 'equipment', device.id],
      queryFn: () => (device.type === 'ups' ? upsApi.ports(device.id) : equipmentApi.ports(device.id))
    }))
  });

  const rawPortsMap = useMemo<Record<number, Port[]>>(
    () =>
      Object.fromEntries(
        devices.map((device, index) => [
          device.id,
          portQueries[index]?.data?.data?.map((port) => ({ ...port, equipment_id: port.equipment_id ?? device.id })) ?? []
        ])
      ) as Record<number, Port[]>,
    [devices, portQueries]
  );

  const portsMap = useMemo(
    () => overlayConnectionStatuses(rawPortsMap, connections.data?.data ?? []),
    [rawPortsMap, connections.data?.data]
  );

  const resolvedConnections = useMemo(
    () => resolveConnectionRows(connections.data?.data ?? [], cables.data?.data ?? [], devices, portsMap),
    [connections.data?.data, cables.data?.data, devices, portsMap]
  );

  const connection = resolvedConnections.find((item) => item.id === Number(id));
  const deviceMap = new Map((equipment.data?.data ?? []).map((item) => [item.id, item]));
  const sourceDevice = connection?.sourcePort ? deviceMap.get(connection.sourcePort.equipment_id) ?? null : null;
  const targetDevice = connection?.targetPort ? deviceMap.get(connection.targetPort.equipment_id) ?? null : null;
  const cable = cables.data?.data.find((item) => item.id === connection?.cable_id);

  if (connections.isLoading || equipment.isLoading || ups.isLoading || cables.isLoading) {
    return <LoadingState />;
  }

  if (!connection || !sourceDevice || !targetDevice) {
    return null;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${t('connections.connection')} #${connection.id}`}
        description={t('connections.detail.description')}
        breadcrumbs={<Breadcrumbs items={[{ label: t('nav.dashboard'), href: '/' }, { label: t('nav.connections'), href: '/connections' }, { label: `#${connection.id}` }]} />}
        actions={
          <div className="flex gap-3">
            <StatusBadge status={connection.status ?? 'active'} />
            <Link className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50" to="/connections">
              <ArrowLeft className="h-4 w-4" />
              {t('connections.backToList')}
            </Link>
          </div>
        }
      />
      <MockBanner meta={connections.data?.meta?.usingMock ? connections.data.meta : cables.data?.meta} />
      <ConnectionsTopology
        connection={connection}
        cable={cable}
        sourceDevice={sourceDevice}
        targetDevice={targetDevice}
        sourcePorts={portsMap[sourceDevice.id] ?? []}
        targetPorts={portsMap[targetDevice.id] ?? []}
      />
    </div>
  );
}
