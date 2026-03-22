import axios from 'axios';
import { api } from './http';
import {
  ApiMeta,
  AuthUser,
  ManagedUser,
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
import {
  mockCables,
  mockCabinets,
  mockConnections,
  mockEquipment,
  mockEquipmentStatusReport,
  mockPorts,
  mockRecentActivity,
  mockSwitchCabinetsReport,
  mockUps,
  mockZoneLoadReport,
  mockZones,
  mockZonesReport
} from './mock-data';

export interface ApiResult<T> {
  data: T;
  meta: ApiMeta;
}

const liveMeta = (endpoint: string): ApiMeta => ({ usingMock: false, endpoint });
const mockMeta = (endpoint: string, reason: string): ApiMeta => ({ usingMock: true, endpoint, reason });

async function withFallback<T>(endpoint: string, request: () => Promise<T>, fallback: () => T, reason: string): Promise<ApiResult<T>> {
  try {
    const data = await request();
    return { data, meta: liveMeta(endpoint) };
  } catch (error) {
    if (axios.isAxiosError(error) && [401, 403].includes(error.response?.status ?? 0)) {
      throw error;
    }

    return { data: fallback(), meta: mockMeta(endpoint, reason) };
  }
}

const deriveRecentActivity = (): RecentActivity[] => mockRecentActivity;
const getPortsByEquipment = (equipmentId: number) => mockPorts.filter((port) => port.equipment_id === equipmentId);

const buildManagedUserIdentity = (user: ManagedUser) => {
  const normalizedUsername = user.username.trim().toLowerCase();
  const normalizedEmail = user.email?.trim().toLowerCase();

  return normalizedUsername || normalizedEmail || String(user.id);
};

const dedupeManagedUsers = (users: ManagedUser[]) => {
  const seenIds = new Set<number>();
  const seenIdentities = new Set<string>();
  const seenEmails = new Set<string>();

  return users.filter((user) => {
    const identity = buildManagedUserIdentity(user);
    const normalizedEmail = user.email?.trim().toLowerCase();

    if (seenIds.has(user.id) || seenIdentities.has(identity) || (normalizedEmail ? seenEmails.has(normalizedEmail) : false)) {
      return false;
    }

    seenIds.add(user.id);
    seenIdentities.add(identity);

    if (normalizedEmail) {
      seenEmails.add(normalizedEmail);
    }

    return true;
  });
};

export const authApi = {
  async login(username: string, password: string): Promise<{ token: string; user: AuthUser; meta: ApiMeta }> {
    const { data } = await api.post<{ token: string; user: AuthUser }>('/users/login', { username, password });
    return { token: data.token, user: data.user, meta: liveMeta('/users/login') };
  },
  async me(): Promise<AuthUser> {
    const { data } = await api.get<{ user: AuthUser }>('/users/me');
    return data.user;
  }
};

export const accessManagementApi = {
  list: async () => dedupeManagedUsers((await api.get<ManagedUser[]>('/users')).data),
  create: async (payload: { username: string; password: string; role: 'admin' | 'user' }) => (await api.post<{ user: ManagedUser }>('/users', payload)).data,
  update: async (id: number, payload: { username: string; password?: string; role: 'admin' | 'user' }) => (await api.put<{ user: ManagedUser }>(`/users/${id}`, payload)).data,
  remove: async (id: number) => (await api.delete(`/users/${id}`)).data
};

export const dashboardApi = {
  async getOverview() {
    const [equipment, cabinets, zones, cables, connections] = await Promise.all([
      equipmentApi.list(),
      switchCabinetsApi.list(),
      zonesApi.list(),
      cablesApi.list(),
      connectionsApi.list()
    ]);

    return {
      data: {
        counts: {
          equipment: equipment.data.length,
          switchCabinets: cabinets.data.length,
          zones: zones.data.length,
          ups: equipment.data.filter((item) => item.type === 'ups').length || mockUps.length,
          cables: cables.data.length,
          connections: connections.data.length
        },
        recentActivity: deriveRecentActivity(),
        quickLinks: [
          { label: 'Equipment status report', href: '/reports?tab=equipment' },
          { label: 'Rack utilization report', href: '/reports?tab=cabinets' },
          { label: 'Zone load report', href: '/reports?tab=zones' }
        ]
      },
      meta: equipment.meta.usingMock || cabinets.meta.usingMock || zones.meta.usingMock ? mockMeta('dashboard', 'Dashboard composes data from API endpoints and mock fallbacks when some endpoints are missing.') : liveMeta('dashboard')
    };
  }
};

export const equipmentApi = {
  list: () => withFallback<Equipment[]>('/equipment', async () => (await api.get('/equipment')).data, () => mockEquipment, 'Equipment list fallback uses local fixtures until API is populated.'),
  detail: (id: number) => withFallback<Equipment>('/equipment/:id', async () => (await api.get(`/equipment/${id}`)).data, () => mockEquipment.find((item) => item.id === id) ?? mockEquipment[0], 'Equipment detail fallback uses local fixtures.'),
  ports: (equipmentId: number) => withFallback<Port[]>('/equipment/ports', async () => (await api.get('/equipment/ports', { params: { equipment_id: equipmentId } })).data, () => getPortsByEquipment(equipmentId), 'Ports endpoint fallback uses generated demo ports.'),
  create: async (payload: object) => api.post('/equipment', payload),
  update: async (id: number, payload: object) => api.put(`/equipment/${id}`, payload),
  remove: async (id: number) => api.delete(`/equipment/${id}`),
  placeInCabinet: async (equipment_id: number, switch_cabinet_id: number) => api.put('/equipment/placeInSwitchCabinet', { equipment_id, switch_cabinet_id }),
  removeFromCabinet: async (equipment_id: number) => api.put('/equipment/removeFromSwitchCabinet', { equipment_id })
};

export const upsApi = {
  list: () => withFallback<UpsEntity[]>('/equipment/ups (derived)', async () => {
    const equipment = (await api.get<Equipment[]>('/equipment')).data.filter((item) => item.type === 'ups');
    return Promise.all(equipment.map(async (item) => {
      const detail = (await api.get<UpsEntity>(`/equipment/ups/${item.id}`)).data;
      try {
        const ports = (await api.get<Port[]>(`/equipment/ups/${item.id}/ports`, { params: { equipment_id: item.id } })).data;
        return { ...detail, ports };
      } catch {
        return detail;
      }
    }));
  }, () => mockUps, 'UPS list endpoint is not explicitly available in backend, so UI derives it or falls back to fixtures.'),
  detail: (id: number) => withFallback<UpsEntity>('/equipment/ups/:id', async () => (await api.get(`/equipment/ups/${id}`)).data, () => mockUps.find((item) => item.id === id) ?? mockUps[0], 'UPS detail fallback uses local fixtures.'),
  ports: (equipmentId: number) => withFallback<Port[]>('/equipment/ups/:id/ports', async () => (await api.get(`/equipment/ups/${equipmentId}/ports`, { params: { equipment_id: equipmentId } })).data, () => getPortsByEquipment(equipmentId), 'UPS ports fallback uses local fixtures.'),
  create: async (payload: object) => api.post('/equipment/ups', payload),
  update: async (id: number, payload: object) => api.put(`/equipment/ups/${id}`, payload),
  remove: async (id: number) => api.delete(`/equipment/ups/${id}`)
};

export const switchCabinetsApi = {
  list: () => withFallback<SwitchCabinet[]>('/equipment/switch_cabinets', async () => (await api.get('/equipment/switch_cabinets')).data, () => mockCabinets, 'Switch cabinet list fallback uses local fixtures.'),
  detail: (id: number) => withFallback<SwitchCabinet>('/equipment/switch_cabinets/:id', async () => (await api.get(`/equipment/switch_cabinets/${id}`)).data, () => mockCabinets.find((item) => item.id === id) ?? mockCabinets[0], 'Switch cabinet detail fallback uses local fixtures.'),
  create: async (payload: object) => api.post('/equipment/switch_cabinets', payload),
  update: async (id: number, payload: object) => api.put(`/equipment/switch_cabinets/${id}`, payload),
  remove: async (id: number) => api.delete(`/equipment/switch_cabinets/${id}`)
};

export const zonesApi = {
  list: () => withFallback<Zone[]>('/equipment/zones', async () => (await api.get('/equipment/zones')).data, () => mockZones, 'Zones list fallback uses local fixtures.'),
  detail: (id: number) => withFallback<Zone>('/equipment/zones/:id', async () => (await api.get(`/equipment/zones/${id}`)).data, () => mockZones.find((item) => item.id === id) ?? mockZones[0], 'Zone detail fallback uses local fixtures.'),
  create: async (payload: object) => api.post('/equipment/zones', payload),
  update: async (id: number, payload: object) => api.put(`/equipment/zones/${id}`, payload),
  remove: async (id: number) => api.delete(`/equipment/zones/${id}`)
};

export const cablesApi = {
  list: () => withFallback<Cable[]>('/equipment/cables', async () => (await api.get('/equipment/cables')).data, () => mockCables, 'Cables list fallback uses local fixtures.'),
  detail: (id: number) => withFallback<Cable>('/equipment/cables/:id', async () => (await api.get(`/equipment/cables/${id}`)).data, () => mockCables.find((item) => item.id === id) ?? mockCables[0], 'Cable detail fallback uses local fixtures.'),
  create: async (payload: Partial<Cable>) => api.post('/equipment/cables', payload),
  update: async (id: number, payload: Partial<Cable>) => api.put(`/equipment/cables/${id}`, payload),
  remove: async (id: number) => api.delete(`/equipment/cables/${id}`)
};

export const connectionsApi = {
  list: () => withFallback<Connection[]>('/equipment/connections', async () => (await api.get('/equipment/connections')).data, () => mockConnections, 'Connections list fallback uses local fixtures.'),
  detail: (id: number) => withFallback<Connection>('/equipment/connections/:id', async () => (await api.get(`/equipment/connections/${id}`)).data, () => mockConnections.find((item) => item.id === id) ?? mockConnections[0], 'Connection detail fallback uses local fixtures.'),
  create: async (payload: Partial<Connection>) => api.post('/equipment/connections', payload),
  update: async (id: number, payload: Partial<Connection>) => api.put(`/equipment/connections/${id}`, payload),
  remove: async (id: number) => api.delete(`/equipment/connections/${id}`),
  compatibilityPorts: async (equipmentId: number, isUps = false) => (isUps ? upsApi.ports(equipmentId) : equipmentApi.ports(equipmentId))
};

export const reportsApi = {
  equipmentStatus: () => withFallback<EquipmentStatusReportRow[]>('/equipment/reports/equipment-status', async () => (await api.get('/equipment/reports/equipment-status')).data, () => mockEquipmentStatusReport, 'Equipment report fallback uses local fixtures.'),
  switchCabinets: () => withFallback<SwitchCabinetReportRow[]>('/equipment/reports/switch-cabinets', async () => (await api.get('/equipment/reports/switch-cabinets')).data, () => mockSwitchCabinetsReport, 'Switch cabinet report fallback uses local fixtures.'),
  zones: () => withFallback<ZoneReportRow[]>('/equipment/reports/zones', async () => (await api.get('/equipment/reports/zones')).data, () => mockZonesReport, 'Zone report fallback uses local fixtures.'),
  zonesLoad: () => withFallback<ZoneLoadReportRow[]>('/equipment/reports/zones-load', async () => (await api.get('/equipment/reports/zones-load')).data, () => mockZoneLoadReport, 'Zone load report fallback uses local fixtures.')
};
