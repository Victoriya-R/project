import { Cable, Connection, Equipment, Port, UpsEntity } from '../../types/entities';
import { useI18n } from '../../i18n/provider';
import { cn } from '../../utils/cn';
import { buildDeviceOptions, resolveConnectionRows } from './utils';

function PortTypeIcon({ type }: { type: Port['port_type'] }) {
  if (type === 'power') {
    return (
      <div className="relative h-8 w-8 rounded-full border-2 border-slate-700 bg-slate-100">
        <span className="absolute left-[9px] top-[9px] h-2.5 w-2.5 rounded-full bg-slate-700" />
        <span className="absolute right-[9px] top-[9px] h-2.5 w-2.5 rounded-full bg-slate-700" />
        <span className="absolute left-1/2 top-[18px] h-2 w-1.5 -translate-x-1/2 rounded-full bg-slate-700" />
      </div>
    );
  }

  return (
    <div className="relative h-8 w-8 rounded-md border-2 border-slate-700 bg-slate-100">
      <span className="absolute inset-x-1 top-1 h-3 rounded-sm bg-slate-700" />
      <span className="absolute bottom-1 left-[6px] h-2 w-1 rounded-full bg-slate-700" />
      <span className="absolute bottom-1 left-[12px] h-2 w-1 rounded-full bg-slate-700" />
      <span className="absolute bottom-1 right-[12px] h-2 w-1 rounded-full bg-slate-700" />
      <span className="absolute bottom-1 right-[6px] h-2 w-1 rounded-full bg-slate-700" />
    </div>
  );
}

function DeviceCard({
  name,
  type,
  ports,
  highlightedPortIds,
  connectionLabels
}: {
  name: string;
  type: Equipment['type'];
  ports: Port[];
  highlightedPortIds: Set<number>;
  connectionLabels: Record<number, string>;
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h4 className="font-semibold text-slate-900">{name}</h4>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{t(`equipment.type.${type}` as const)}</p>
        </div>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
          {ports.length} {t('ups.ports').toLowerCase()}
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {ports.map((port) => {
          const isHighlighted = highlightedPortIds.has(port.id);

          return (
            <div
              key={port.id}
              className={cn(
                'rounded-xl border p-3 transition',
                port.status === 'busy' ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50',
                isHighlighted ? 'ring-2 ring-brand-200 ring-offset-1' : ''
              )}
            >
              <div className="flex items-center gap-3">
                <PortTypeIcon type={port.port_type} />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{t('ports.port', { number: port.port_number })}</p>
                  <p className="text-xs text-slate-500">{t(`ports.${port.status}` as const)}</p>
                </div>
              </div>
              <p className="mt-2 text-xs text-slate-600">{t(`cables.type.${port.cable_type}` as const)}</p>
              {connectionLabels[port.id] ? (
                <p className="mt-2 text-xs font-medium text-brand-700">{connectionLabels[port.id]}</p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">{t('connections.freePortHint')}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ConnectionsTopology({
  cables,
  connections,
  equipment,
  upsItems,
  portsMap
}: {
  cables: Cable[];
  connections: Connection[];
  equipment: Equipment[];
  upsItems: UpsEntity[];
  portsMap: Record<number, Port[]>;
}) {
  const { t } = useI18n();
  const devices = buildDeviceOptions(equipment, upsItems);
  const resolvedConnections = resolveConnectionRows(connections, cables, devices, portsMap);
  const deviceMap = new Map(devices.map((device) => [device.id, device]));
  const unconnectedDevices = devices.filter((device) => !(connections.some((connection) => {
    const devicePorts = portsMap[device.id] ?? [];
    return devicePorts.some((port) => port.id === connection.a_port_id || port.id === connection.b_port_id);
  })));

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{t('connections.topologyTitle')}</h3>
        <p className="mt-1 text-sm text-slate-500">{t('connections.topologyDesc')}</p>
      </div>

      <div className="space-y-4">
        {resolvedConnections.map((connection) => {
          const sourcePort = connection.sourcePort;
          const targetPort = connection.targetPort;
          const sourceDevice = sourcePort ? deviceMap.get(sourcePort.equipment_id) : undefined;
          const targetDevice = targetPort ? deviceMap.get(targetPort.equipment_id) : undefined;

          if (!sourcePort || !targetPort || !sourceDevice || !targetDevice) {
            return null;
          }

          const sourceConnectionLabels = {
            [sourcePort.id]: `${t('connections.connectedVia')} ${connection.cableLabel} → ${targetDevice.name} ${connection.targetPortLabel}`
          };
          const targetConnectionLabels = {
            [targetPort.id]: `${t('connections.connectedVia')} ${connection.cableLabel} → ${sourceDevice.name} ${connection.sourcePortLabel}`
          };

          return (
            <div key={connection.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex flex-wrap items-center gap-3 text-sm text-slate-600">
                <span className="rounded-full bg-white px-3 py-1 font-semibold text-slate-900">#{connection.id}</span>
                <span>{connection.sourceDeviceName} {connection.sourcePortLabel}</span>
                <span>↔</span>
                <span>{connection.targetDeviceName} {connection.targetPortLabel}</span>
                <span className="rounded-full bg-brand-50 px-3 py-1 font-medium text-brand-700">{connection.cableLabel}</span>
              </div>
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_220px_minmax(0,1fr)] xl:items-center">
                <DeviceCard
                  name={sourceDevice.name}
                  type={sourceDevice.type}
                  ports={portsMap[sourceDevice.id] ?? []}
                  highlightedPortIds={new Set([sourcePort.id])}
                  connectionLabels={sourceConnectionLabels}
                />
                <div className="flex flex-col items-center justify-center gap-3 px-2 text-center">
                  <div className="h-1 w-full rounded-full bg-gradient-to-r from-brand-200 via-brand-500 to-brand-200" />
                  <div className="rounded-2xl border border-brand-200 bg-white px-4 py-3 shadow-soft">
                    <p className="text-sm font-semibold text-brand-700">{connection.cableLabel}</p>
                    <p className="mt-1 text-xs text-slate-500">{t('status.active')}</p>
                  </div>
                  <div className="h-1 w-full rounded-full bg-gradient-to-r from-brand-200 via-brand-500 to-brand-200" />
                </div>
                <DeviceCard
                  name={targetDevice.name}
                  type={targetDevice.type}
                  ports={portsMap[targetDevice.id] ?? []}
                  highlightedPortIds={new Set([targetPort.id])}
                  connectionLabels={targetConnectionLabels}
                />
              </div>
            </div>
          );
        })}
      </div>

      {unconnectedDevices.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4">
          <h4 className="font-semibold text-slate-900">{t('connections.unconnectedTitle')}</h4>
          <p className="mt-1 text-sm text-slate-500">{t('connections.unconnectedDesc')}</p>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {unconnectedDevices.map((device) => (
              <DeviceCard
                key={device.id}
                name={device.name}
                type={device.type}
                ports={portsMap[device.id] ?? []}
                highlightedPortIds={new Set()}
                connectionLabels={{}}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}
