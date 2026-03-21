import {
  Cable,
  Connection,
  Equipment,
  EquipmentStatusReportRow,
  Port,
  RecentActivity,
  SwitchCabinet,
  SwitchCabinetReportRow,
  UpsEntity,
  Zone,
  ZoneLoadReportRow,
  ZoneReportRow
} from '../../types/entities';

export const mockZones: Zone[] = [
  { id: 1, name: 'Zone A', description: 'Core compute', site: 'DC-1', address: 'Moscow, North wing', employee: 'Ops Team Alpha' },
  { id: 2, name: 'Zone B', description: 'Network edge', site: 'DC-1', address: 'Moscow, South wing', employee: 'Ops Team Beta' },
  { id: 3, name: 'Zone C', description: 'Power redundancy', site: 'DC-2', address: 'Saint Petersburg', employee: 'Facilities Team' }
];

export const mockEquipment: Equipment[] = [
  { id: 1, name: 'APP-SRV-01', type: 'server', model: 'Dell R760', serial: 'SRV-001', status: 'active', weight: 18, energy_consumption: 620, switch_cabinet_id: 1 },
  { id: 2, name: 'APP-SRV-02', type: 'server', model: 'HPE ProLiant', serial: 'SRV-002', status: 'maintenance', weight: 16, energy_consumption: 590, switch_cabinet_id: 1 },
  { id: 3, name: 'PATCH-PP-01', type: 'patchPanel', model: 'Legrand 24', serial: 'PP-001', status: 'active', weight: 7, energy_consumption: 40, switch_cabinet_id: 2 },
  { id: 4, name: 'UPS-EDGE-01', type: 'ups', model: 'UPS', serial: 'UPS-001', status: 'active', weight: 42, energy_consumption: 120, switch_cabinet_id: 3 },
  { id: 5, name: 'DB-SRV-03', type: 'server', model: 'Cisco UCS', serial: 'SRV-003', status: 'inactive', weight: 20, energy_consumption: 710, switch_cabinet_id: 2 },
  { id: 6, name: 'PATCH-PP-02', type: 'patchPanel', model: 'Schneider 24', serial: 'PP-002', status: 'planned', weight: 5, energy_consumption: 20, switch_cabinet_id: null }
];

export const mockPorts: Port[] = [
  ...Array.from({ length: 6 }).map((_, index) => ({ id: index + 1, equipment_id: 1, port_number: index + 1, port_type: 'patch' as const, status: index < 3 ? 'busy' as const : 'available' as const, cable_type: 'patchCord' as const })),
  ...Array.from({ length: 6 }).map((_, index) => ({ id: index + 11, equipment_id: 3, port_number: index + 1, port_type: 'patch' as const, status: index < 2 ? 'busy' as const : 'available' as const, cable_type: 'patchCord' as const })),
  ...Array.from({ length: 6 }).map((_, index) => ({ id: index + 21, equipment_id: 4, port_number: index + 1, port_type: index < 3 ? 'power' as const : 'patch' as const, status: index === 0 ? 'busy' as const : 'available' as const, cable_type: index < 3 ? 'powerCable' as const : 'patchCord' as const })),
  ...Array.from({ length: 6 }).map((_, index) => ({ id: index + 31, equipment_id: 5, port_number: index + 1, port_type: 'patch' as const, status: 'available' as const, cable_type: 'patchCord' as const }))
];

export const mockCables: Cable[] = [
  { id: 1, type: 'patchCord', length: 5, status: 'active', equipment_type_allowed: 'server' },
  { id: 2, type: 'powerCable', length: 3, status: 'active', equipment_type_allowed: 'ups' },
  { id: 3, type: 'patchCord', length: 10, status: 'maintenance', equipment_type_allowed: 'patchPanel' },
  { id: 4, type: 'powerCable', length: 7, status: 'planned', equipment_type_allowed: 'server' }
];

export const mockConnections: Connection[] = [
  { id: 1, cable_id: 1, a_port_id: 1, b_port_id: 11, status: 'active' },
  { id: 2, cable_id: 2, a_port_id: 21, b_port_id: 31, status: 'warning' }
];

export const mockCabinets: SwitchCabinet[] = [
  { id: 1, name: 'Rack-A01', weight: 120, energy_consumption: 1210, energy_limit: 3000, employee: 'Ivan Petrov', zone_id: 1, description: 'Application cluster rack', serial_number: 'RACK-A01', equipment: mockEquipment.filter((item) => item.switch_cabinet_id === 1) },
  { id: 2, name: 'Rack-B14', weight: 100, energy_consumption: 770, energy_limit: 2500, employee: 'Olga Sidorova', zone_id: 2, description: 'Network and patching rack', serial_number: 'RACK-B14', equipment: mockEquipment.filter((item) => item.switch_cabinet_id === 2) },
  { id: 3, name: 'Rack-PWR-02', weight: 140, energy_consumption: 120, energy_limit: 2200, employee: 'Facility Ops', zone_id: 3, description: 'Power backup rack', serial_number: 'RACK-PWR-02', equipment: mockEquipment.filter((item) => item.switch_cabinet_id === 3) }
];

export const mockUps: UpsEntity[] = [
  {
    id: 4,
    name: 'UPS-EDGE-01',
    status: 'active',
    upsData: {
      ups_id: 1,
      capacity: 12000,
      battery_life: 45,
      status: 'active'
    },
    ports: mockPorts.filter((port) => port.equipment_id === 4)
  }
];

export const mockRecentActivity: RecentActivity[] = [
  { id: 1, title: 'APP-SRV-02 переведен в maintenance', entity: 'Equipment', time: '10 minutes ago', status: 'maintenance' },
  { id: 2, title: 'Создано новое соединение CBL-001 → PATCH-PP-01', entity: 'Connection', time: '30 minutes ago', status: 'active' },
  { id: 3, title: 'Rack-B14 nearing power threshold', entity: 'Cabinet', time: '1 hour ago', status: 'warning' }
];

export const mockEquipmentStatusReport: EquipmentStatusReportRow[] = [
  { type: 'server', total_count: 3, active_count: 1, inactive_count: 1, maintenance_count: 1 },
  { type: 'patchPanel', total_count: 2, active_count: 1, inactive_count: 0, maintenance_count: 0 },
  { type: 'ups', total_count: 1, active_count: 1, inactive_count: 0, maintenance_count: 0 }
];

export const mockSwitchCabinetsReport: SwitchCabinetReportRow[] = mockCabinets.map((cabinet) => ({
  id: cabinet.id,
  name: cabinet.name,
  serial_number: cabinet.serial_number,
  zone_id: cabinet.zone_id ?? null,
  zone_name: mockZones.find((zone) => zone.id === cabinet.zone_id)?.name ?? null,
  employee: cabinet.employee ?? null,
  weight_limit: cabinet.weight,
  energy_limit: cabinet.energy_limit,
  equipment_count: cabinet.equipment?.length ?? 0,
  current_weight: cabinet.equipment?.reduce((sum, item) => sum + Number(item.weight ?? 0), 0) ?? 0,
  current_energy_consumption: cabinet.equipment?.reduce((sum, item) => sum + Number(item.energy_consumption ?? 0), 0) ?? 0,
  weight_load_percent: Number((((cabinet.equipment?.reduce((sum, item) => sum + Number(item.weight ?? 0), 0) ?? 0) / cabinet.weight) * 100).toFixed(2)),
  energy_load_percent: Number((((cabinet.equipment?.reduce((sum, item) => sum + Number(item.energy_consumption ?? 0), 0) ?? 0) / cabinet.energy_limit) * 100).toFixed(2)),
  is_weight_overloaded: 0,
  is_energy_overloaded: 0
}));

export const mockZonesReport: ZoneReportRow[] = mockZones.map((zone) => {
  const cabinets = mockCabinets.filter((cabinet) => cabinet.zone_id === zone.id);
  const equipment = cabinets.flatMap((cabinet) => cabinet.equipment ?? []);

  return {
    id: zone.id,
    name: zone.name,
    description: zone.description,
    address: zone.address,
    phone: zone.phone,
    employee: zone.employee,
    site: zone.site,
    switch_cabinet_count: cabinets.length,
    equipment_count: equipment.length,
    total_equipment_weight: equipment.reduce((sum, item) => sum + Number(item.weight ?? 0), 0),
    total_energy_consumption: equipment.reduce((sum, item) => sum + Number(item.energy_consumption ?? 0), 0),
    active_equipment_count: equipment.filter((item) => item.status === 'active').length,
    inactive_equipment_count: equipment.filter((item) => item.status === 'inactive').length,
    maintenance_equipment_count: equipment.filter((item) => item.status === 'maintenance').length
  };
});

export const mockZoneLoadReport: ZoneLoadReportRow[] = mockZones.map((zone) => {
  const cabinets = mockCabinets.filter((cabinet) => cabinet.zone_id === zone.id);
  const equipment = cabinets.flatMap((cabinet) => cabinet.equipment ?? []);
  const totalWeightLimit = cabinets.reduce((sum, item) => sum + item.weight, 0);
  const totalEnergyLimit = cabinets.reduce((sum, item) => sum + item.energy_limit, 0);
  const currentWeight = equipment.reduce((sum, item) => sum + Number(item.weight ?? 0), 0);
  const currentEnergy = equipment.reduce((sum, item) => sum + Number(item.energy_consumption ?? 0), 0);

  return {
    id: zone.id,
    zone_name: zone.name,
    switch_cabinet_count: cabinets.length,
    equipment_count: equipment.length,
    total_weight_limit: totalWeightLimit,
    current_weight: currentWeight,
    total_energy_limit: totalEnergyLimit,
    current_energy_consumption: currentEnergy,
    weight_load_percent: totalWeightLimit ? Number(((currentWeight / totalWeightLimit) * 100).toFixed(2)) : 0,
    energy_load_percent: totalEnergyLimit ? Number(((currentEnergy / totalEnergyLimit) * 100).toFixed(2)) : 0,
    overloaded_by_weight_cabinets: 0,
    overloaded_by_energy_cabinets: 0
  };
});
