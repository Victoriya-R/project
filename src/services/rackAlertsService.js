import db from '../utils/db.js';
import logger from '../utils/logger.js';
import {
  resolveAlertForRule as resolveAutoAlertForRule,
  upsertAlertForRule as upsertAutoAlertForRule
} from './alertDedupService.js';

const get = (query, params = []) => new Promise((resolve, reject) => {
  db.get(query, params, (err, row) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(row ?? null);
  });
});

const all = (query, params = []) => new Promise((resolve, reject) => {
  db.all(query, params, (err, rows) => {
    if (err) {
      reject(err);
      return;
    }

    resolve(rows ?? []);
  });
});

const ALERT_SOURCE_TYPE = 'rack';

const RULES = {
  ENERGY: {
    code: 'rack_energy_limit_exceeded',
    severity: 'warning',
    title: 'Превышение энергопотребления стойки'
  },
  WEIGHT: {
    code: 'rack_weight_limit_exceeded',
    severity: 'warning',
    title: 'Превышение нагрузки на стойку'
  },
  SLOT_CONFLICT: {
    code: 'rack_unit_slot_conflict',
    severity: 'critical',
    title: 'Конфликт размещения оборудования в стойке'
  }
};

const normalizeRackName = (rack) => rack.name || `ID ${rack.id}`;

const hasValidPosition = (equipment) => {
  const startUnit = Number(equipment.rack_start_unit);
  const unitSize = Number(equipment.rack_unit_size ?? 1);

  return Number.isInteger(startUnit) && startUnit > 0 && Number.isInteger(unitSize) && unitSize > 0;
};

const findSlotConflict = (equipmentList) => {
  const slotToEquipment = new Map();
  const conflictingUnits = new Set();
  const conflictingEquipmentNames = new Set();

  for (const equipment of equipmentList) {
    if (!hasValidPosition(equipment)) {
      continue;
    }

    const startUnit = Number(equipment.rack_start_unit);
    const unitSize = Number(equipment.rack_unit_size ?? 1);
    const endUnit = startUnit + unitSize - 1;
    const equipmentLabel = equipment.name || `equipment:${equipment.id}`;

    for (let slot = startUnit; slot <= endUnit; slot += 1) {
      const existing = slotToEquipment.get(slot);

      if (existing) {
        conflictingUnits.add(slot);
        conflictingEquipmentNames.add(existing.name);
        conflictingEquipmentNames.add(equipmentLabel);
      } else {
        slotToEquipment.set(slot, { id: equipment.id, name: equipmentLabel });
      }
    }
  }

  if (!conflictingUnits.size) {
    return null;
  }

  const sortedUnits = [...conflictingUnits].sort((left, right) => left - right);
  const startUnit = sortedUnits[0];
  const endUnit = sortedUnits[sortedUnits.length - 1];

  return {
    startUnit,
    endUnit,
    equipmentNames: [...conflictingEquipmentNames]
  };
};

export const upsertAlertForRule = async ({
  ownerUserId,
  sourceId,
  ruleCode,
  severity,
  title,
  description
}) => upsertAutoAlertForRule({
  ownerUserId,
  sourceType: ALERT_SOURCE_TYPE,
  sourceId,
  ruleCode,
  severity,
  title,
  description
});

export const resolveAlertForRule = async ({ ownerUserId, sourceId, ruleCode }) => resolveAutoAlertForRule({
  ownerUserId,
  sourceType: ALERT_SOURCE_TYPE,
  sourceId,
  ruleCode
});

export const evaluateRackAlerts = async (rackId, ownerUserId) => {
  const normalizedRackId = Number(rackId);
  const normalizedOwnerUserId = Number(ownerUserId);

  if (!Number.isInteger(normalizedRackId) || normalizedRackId <= 0 || !Number.isInteger(normalizedOwnerUserId) || normalizedOwnerUserId <= 0) {
    return;
  }

  const rack = await get(
    `SELECT id, name, weight, energy_limit
     FROM switch_cabinets
     WHERE id = ? AND owner_user_id = ?`,
    [normalizedRackId, normalizedOwnerUserId]
  );

  if (!rack) {
    return;
  }

  const equipment = await all(
    `SELECT id, name, weight, energy_consumption, rack_start_unit, COALESCE(rack_unit_size, 1) AS rack_unit_size
     FROM assets
     WHERE switch_cabinet_id = ? AND owner_user_id = ?`,
    [normalizedRackId, normalizedOwnerUserId]
  );

  const rackName = normalizeRackName(rack);
  const totalEnergy = equipment.reduce((sum, item) => sum + Number(item.energy_consumption ?? 0), 0);
  const totalWeight = equipment.reduce((sum, item) => sum + Number(item.weight ?? 0), 0);

  const energyLimit = Number(rack.energy_limit ?? 0);
  if (energyLimit > 0 && totalEnergy > energyLimit) {
    await upsertAlertForRule({
      ownerUserId: normalizedOwnerUserId,
      sourceId: normalizedRackId,
      ruleCode: RULES.ENERGY.code,
      severity: RULES.ENERGY.severity,
      title: RULES.ENERGY.title,
      description: `Стойка ${rackName} потребляет ${totalEnergy} W при лимите ${energyLimit} W`
    });
  } else {
    await resolveAlertForRule({
      ownerUserId: normalizedOwnerUserId,
      sourceId: normalizedRackId,
      ruleCode: RULES.ENERGY.code
    });
  }

  const weightLimit = Number(rack.weight ?? 0);
  if (weightLimit > 0 && totalWeight > weightLimit) {
    await upsertAlertForRule({
      ownerUserId: normalizedOwnerUserId,
      sourceId: normalizedRackId,
      ruleCode: RULES.WEIGHT.code,
      severity: RULES.WEIGHT.severity,
      title: RULES.WEIGHT.title,
      description: `Стойка ${rackName} имеет нагрузку ${totalWeight} kg при лимите ${weightLimit} kg`
    });
  } else {
    await resolveAlertForRule({
      ownerUserId: normalizedOwnerUserId,
      sourceId: normalizedRackId,
      ruleCode: RULES.WEIGHT.code
    });
  }

  const slotConflict = findSlotConflict(equipment);
  if (slotConflict) {
    const rangeText = slotConflict.startUnit === slotConflict.endUnit
      ? `U${slotConflict.startUnit}`
      : `U${slotConflict.startUnit}-U${slotConflict.endUnit}`;

    const equipmentNamesText = slotConflict.equipmentNames.length
      ? ` Оборудование: ${slotConflict.equipmentNames.join(', ')}.`
      : '';

    await upsertAlertForRule({
      ownerUserId: normalizedOwnerUserId,
      sourceId: normalizedRackId,
      ruleCode: RULES.SLOT_CONFLICT.code,
      severity: RULES.SLOT_CONFLICT.severity,
      title: RULES.SLOT_CONFLICT.title,
      description: `В стойке ${rackName} обнаружен конфликт размещения: ${rangeText} заняты несколькими устройствами.${equipmentNamesText}`
    });
  } else {
    await resolveAlertForRule({
      ownerUserId: normalizedOwnerUserId,
      sourceId: normalizedRackId,
      ruleCode: RULES.SLOT_CONFLICT.code
    });
  }
};

export const evaluateRackAlertsSafe = async (rackId, ownerUserId) => {
  try {
    await evaluateRackAlerts(rackId, ownerUserId);
  } catch (error) {
    logger.error(`Failed to evaluate rack alerts for rack ${rackId}. Error: ${error.message}`);
  }
};
