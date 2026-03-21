export type EntityStatus = 'active' | 'inactive' | 'maintenance' | 'warning' | 'planned';
export type PortType = 'patch' | 'power';
export type CableType = 'patchCord' | 'powerCable';
export type UserRole = 'admin' | 'user' | 'analyst';

export interface AuthUser {
  username: string;
  role: UserRole;
}

export interface Equipment {
  id: number;
  name: string;
  type: 'server' | 'patchPanel' | 'ups';
  model: string;
  serial: string;
  status: EntityStatus;
  weight?: number;
  energy_consumption?: number;
  switch_cabinet_id?: number | null;
}

export interface EquipmentDetails extends Equipment {
  ports?: Port[];
}

export interface UpsEntity {
  id: number;
  name: string;
  status: EntityStatus;
  upsData: {
    ups_id?: number;
    capacity: number;
    battery_life: number;
    status: EntityStatus;
  };
  ports?: Port[];
}

export interface SwitchCabinet {
  id: number;
  name: string;
  weight: number;
  energy_consumption: number;
  energy_limit: number;
  employee?: string;
  zone_id?: number | null;
  description?: string;
  serial_number: string;
  equipment?: Equipment[];
}

export interface Zone {
  id: number;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  employee?: string;
  site?: string;
}

export interface Cable {
  id: number;
  type: CableType;
  length: number;
  status: EntityStatus;
  equipment_type_allowed: 'server' | 'patchPanel' | 'ups' | 'automaton';
}

export interface Port {
  id: number;
  equipment_id: number;
  port_number: number;
  port_type: PortType;
  status: 'available' | 'busy' | 'disabled';
  cable_type: CableType;
}

export interface Connection {
  id: number;
  cable_id: number;
  a_port_id: number;
  b_port_id: number;
  status?: EntityStatus;
}

export interface RecentActivity {
  id: number;
  title: string;
  entity: string;
  time: string;
  status: EntityStatus;
}

export interface EquipmentStatusReportRow {
  type: string;
  total_count: number;
  active_count: number;
  inactive_count: number;
  maintenance_count: number;
}

export interface SwitchCabinetReportRow {
  id: number;
  name: string;
  serial_number: string;
  zone_id: number | null;
  zone_name: string | null;
  employee: string | null;
  weight_limit: number;
  energy_limit: number;
  equipment_count: number;
  current_weight: number;
  current_energy_consumption: number;
  weight_load_percent: number;
  energy_load_percent: number;
  is_weight_overloaded: number;
  is_energy_overloaded: number;
}

export interface ZoneReportRow {
  id: number;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  employee?: string;
  site?: string;
  switch_cabinet_count: number;
  equipment_count: number;
  total_equipment_weight: number;
  total_energy_consumption: number;
  active_equipment_count: number;
  inactive_equipment_count: number;
  maintenance_equipment_count: number;
}

export interface ZoneLoadReportRow {
  id: number;
  zone_name: string;
  switch_cabinet_count: number;
  equipment_count: number;
  total_weight_limit: number;
  current_weight: number;
  total_energy_limit: number;
  current_energy_consumption: number;
  weight_load_percent: number;
  energy_load_percent: number;
  overloaded_by_weight_cabinets: number;
  overloaded_by_energy_cabinets: number;
}

export interface ApiMeta {
  usingMock: boolean;
  reason?: string;
  endpoint?: string;
}
