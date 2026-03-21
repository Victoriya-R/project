import { Equipment, Port, UpsEntity } from '../types/entities';

export function createDefaultPortsForEquipment(item: Equipment | UpsEntity): Port[] {
  if ('upsData' in item) {
    return Array.from({ length: 6 }).map((_, index) => ({
      id: item.id * 100 + index + 1,
      equipment_id: item.id,
      port_number: index + 1,
      port_type: index < 3 ? 'power' : 'patch',
      status: 'available',
      cable_type: index < 3 ? 'powerCable' : 'patchCord'
    }));
  }

  return Array.from({ length: 6 }).map((_, index) => ({
    id: item.id * 100 + index + 1,
    equipment_id: item.id,
    port_number: index + 1,
    port_type: 'patch',
    status: 'available',
    cable_type: 'patchCord'
  }));
}
