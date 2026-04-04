export type EntityStatus = 'active' | 'inactive' | 'maintenance' | 'warning' | 'planned';
export type PortType = 'patch' | 'power';
export type CableType = 'patchCord' | 'powerCable';
export type UserRole = 'admin' | 'user' | 'analyst';

export interface AuthUser {
  id?: number;
  username: string;
  role: UserRole;
  isSuperuser?: boolean;
}

export interface ManagedUser {
  id: number;
  username: string;
  role: 'admin' | 'user';
  email?: string;
  isSuperuser: boolean;
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
  unit_size?: number | null;
  startUnit?: number | null;
}

export interface EquipmentDetails extends Equipment {
  ports?: Port[];
}

export interface UpsEntity {
  id: number;
  name: string;
  type?: 'ups';
  model?: string;
  serial?: string;
  status: EntityStatus;
  weight?: number;
  energy_consumption?: number;
  rack_unit_size?: number;
  unit_size?: number;
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
  current_weight?: number;
  current_energy_consumption?: number;
  equipment_count?: number;
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


export interface FloorPlanRackEquipment {
  id: number;
  name: string;
  unit: number;
  startUnit?: number | null;
  type?: string;
  status?: EntityStatus;
}

export interface FloorPlanRack {
  id: number;
  floorplan_id: number;

  switch_cabinet_id?: number | null;

  name: string;
  x: number;
  y: number;
  z: number;
  rotation_y: number;
  width: number;
  depth: number;
  height: number;
  unit_capacity: number;
  equipment: FloorPlanRackEquipment[];

  serial_number?: string | null;
  energy_consumption?: number | null;
  energy_limit?: number | null;
  weight?: number | null;
  zone_name?: string | null;
  equipment_count?: number;

}

export interface FloorPlan {
  id: number;

  zone_id: number;
  zone_name?: string | null;
  name: string;
  description?: string;
  width: number;
  depth: number;
  height: number;
  panel_size_x: number;
  panel_size_y: number;
  scale: number;
  grid_enabled: boolean;
  axis_x_label: string;
  axis_y_label: string;
  background_image_url?: string | null;
  grid_cells_x?: number;
  grid_cells_y?: number;
  camera: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  racks?: FloorPlanRack[];
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


export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'new' | 'acknowledged' | 'resolved' | 'muted';
export type AlertSourceType = 'rack' | 'equipment' | 'cable' | 'connection' | 'ups' | 'zone';

export interface Alert {
  id: number;
  title: string;
  description: string | null;
  severity: AlertSeverity;
  source_type: AlertSourceType;
  source_id: number;
  status: AlertStatus;
  rule_code: string | null;
  owner_user_id: number;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export type IncidentPriority = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface Incident {
  id: number;
  priority: IncidentPriority;
  title: string;
  description: string | null;
  status: IncidentStatus;
  assignee_user_id: number | null;
  alert_id: number | null;
  resolution_comment: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface ApiMeta {
  usingMock: boolean;
  reason?: string;
  endpoint?: string;
}


export type NotificationType = 'alert_created' | 'incident_created' | 'incident_status_changed' | 'incident_assigned';

export interface NotificationItem {
  id: number;
  user_id: number;
  type: NotificationType;
  title: string;
  message: string;
  entity_type: 'alert' | 'incident' | null;
  entity_id: number | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
}

export interface NotificationSettings {
  user_id: number;
  in_app_enabled: boolean;
  alert_created_enabled: boolean;
  incident_created_enabled: boolean;
  incident_status_changed_enabled: boolean;
  incident_assigned_enabled: boolean;
  created_at: string;
  updated_at: string;
}
