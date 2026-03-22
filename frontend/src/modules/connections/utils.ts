import { Cable, CableType, Connection, Equipment, Port, UpsEntity } from '../../types/entities';

export interface ConnectionDevice {
  id: number;
  name: string;
  type: Equipment['type'];
  status: Equipment['status'];
}

export interface ConnectionOption {
  value: number;
  label: string;
}

export interface ConnectionResolvedRow extends Connection {
  cableLabel: string;
  cableType: CableType | null;
  cableLengthLabel: string;
  cableStatus: string;
  sourceDeviceName: string;
  targetDeviceName: string;
  sourcePortLabel: string;
  targetPortLabel: string;
  sourcePort?: Port;
  targetPort?: Port;
}

export const getCompatiblePortType = (cableType?: CableType | null) => (cableType === 'powerCable' ? 'power' : cableType === 'patchCord' ? 'patch' : null);

export const buildDeviceOptions = (equipment: Equipment[], upsItems: UpsEntity[]): ConnectionDevice[] => [
  ...equipment
    .filter((item) => item.type !== 'ups')
    .map((item) => ({ id: item.id, name: item.name, type: item.type, status: item.status })),
  ...upsItems.map((item) => ({ id: item.id, name: item.name, type: 'ups' as const, status: item.status }))
];

export const buildPortLookup = (portsMap: Record<number, Port[]>) =>
  Object.values(portsMap)
    .flat()
    .reduce<Record<number, Port>>((accumulator, port) => {
      accumulator[port.id] = port;
      return accumulator;
    }, {});

export const overlayConnectionStatuses = (portsMap: Record<number, Port[]>, connections: Connection[]) => {
  const busyPortIds = new Set(connections.flatMap((connection) => [connection.a_port_id, connection.b_port_id]).map(Number));

  return Object.fromEntries(
    Object.entries(portsMap).map(([deviceId, ports]) => [
      Number(deviceId),
      ports.map((port) => ({
        ...port,
        status: port.status === 'disabled' ? 'disabled' : busyPortIds.has(Number(port.id)) ? 'busy' : 'available'
      }))
    ])
  ) as Record<number, Port[]>;
};

export const resolveConnectionRows = (
  connections: Connection[],
  cables: Cable[],
  devices: ConnectionDevice[],
  portsMap: Record<number, Port[]>
): ConnectionResolvedRow[] => {
  const cableMap = new Map(cables.map((item) => [item.id, item]));
  const deviceMap = new Map(devices.map((item) => [item.id, item]));
  const portLookup = buildPortLookup(portsMap);

  return connections.map((connection) => {
    const cable = cableMap.get(connection.cable_id);
    const sourcePort = portLookup[connection.a_port_id];
    const targetPort = portLookup[connection.b_port_id];
    const sourceDevice = sourcePort ? deviceMap.get(sourcePort.equipment_id) : undefined;
    const targetDevice = targetPort ? deviceMap.get(targetPort.equipment_id) : undefined;

    return {
      ...connection,
      cableLabel: cable ? `${cable.type} · ${cable.length}m` : `#${connection.cable_id}`,
      cableType: cable?.type ?? null,
      cableLengthLabel: cable ? `${cable.length}m` : '—',
      cableStatus: cable?.status ?? connection.status ?? 'active',
      sourceDeviceName: sourceDevice?.name ?? '—',
      targetDeviceName: targetDevice?.name ?? '—',
      sourcePortLabel: sourcePort ? `#${sourcePort.port_number}` : `#${connection.a_port_id}`,
      targetPortLabel: targetPort ? `#${targetPort.port_number}` : `#${connection.b_port_id}`,
      sourcePort,
      targetPort
    };
  });
};
