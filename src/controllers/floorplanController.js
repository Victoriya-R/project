import db from '../utils/db.js';
import logger from '../utils/logger.js';

const getOwnerUserId = (req) => Number(req.user?.userId);

const run = (query, params = []) => new Promise((resolve, reject) => {
  db.run(query, params, function onRun(err) {
    if (err) {
      reject(err);
      return;
    }

    resolve({ lastID: this.lastID, changes: this.changes });
  });
});

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

    resolve(rows);
  });
});

const parseJsonSafe = (value, fallback) => {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const toNumber = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const normalizeRack = (row) => ({
  id: Number(row.id),
  floorplan_id: Number(row.floorplan_id),
  switch_cabinet_id: row.switch_cabinet_id === null || row.switch_cabinet_id === undefined ? null : Number(row.switch_cabinet_id),
  name: row.name,
  x: Number(row.x),
  y: Number(row.y),
  z: Number(row.z),
  rotation_y: Number(row.rotation_y),
  width: Number(row.width),
  depth: Number(row.depth),
  height: Number(row.height),
  unit_capacity: Number(row.unit_capacity),

  equipment: parseJsonSafe(row.equipment_json, []),
  serial_number: row.serial_number ?? null,
  energy_consumption: row.energy_consumption === undefined || row.energy_consumption === null ? null : Number(row.energy_consumption),
  energy_limit: row.energy_limit === undefined || row.energy_limit === null ? null : Number(row.energy_limit),
  weight: row.weight === undefined || row.weight === null ? null : Number(row.weight),
  zone_name: row.zone_name ?? null,
  equipment_count: row.equipment_count === undefined || row.equipment_count === null ? parseJsonSafe(row.equipment_json, []).length : Number(row.equipment_count)

});

const normalizeFloorPlan = (row) => ({
  id: Number(row.id),
  zone_id: Number(row.zone_id),
  zone_name: row.zone_name ?? null,
  name: row.name,
  description: row.description,
  width: Number(row.width),
  depth: Number(row.depth),
  height: Number(row.height),
  panel_size_x: Number(row.panel_size_x),
  panel_size_y: Number(row.panel_size_y),
  scale: Number(row.scale),
  grid_enabled: Boolean(row.grid_enabled),
  axis_x_label: row.axis_x_label ?? 'X',
  axis_y_label: row.axis_y_label ?? 'Y',
  background_image_url: row.background_image_url ?? null,
  camera: parseJsonSafe(row.camera_json, {}),
  created_at: row.created_at,
  updated_at: row.updated_at,
  grid_cells_x: Math.max(1, Math.round(Number(row.width) / Number(row.panel_size_x || 0.6))),
  grid_cells_y: Math.max(1, Math.round(Number(row.depth) / Number(row.panel_size_y || 0.6)))
});

const ensureZoneExists = async (zoneId, ownerUserId) => get(
  `SELECT id, name FROM zones WHERE id = ? AND owner_user_id = ?`,
  [zoneId, ownerUserId]
);

const ensureFloorPlanZoneUniqueness = async ({ zoneId, ownerUserId, excludeFloorPlanId = null }) => {
  const existing = await get(
    `SELECT id FROM floorplans WHERE zone_id = ? AND owner_user_id = ? ${excludeFloorPlanId ? 'AND id <> ?' : ''}`,
    excludeFloorPlanId ? [zoneId, ownerUserId, excludeFloorPlanId] : [zoneId, ownerUserId]
  );

  return !existing;
};

const getFloorPlanWithRacks = async (id, ownerUserId) => {
  const floorPlanRow = await get(
    `SELECT fp.id, fp.zone_id, z.name AS zone_name, fp.name, fp.description, fp.width, fp.depth, fp.height,
            fp.panel_size_x, fp.panel_size_y, fp.scale, fp.grid_enabled, fp.axis_x_label, fp.axis_y_label,
            fp.background_image_url, fp.camera_json, fp.created_at, fp.updated_at
     FROM floorplans fp
     INNER JOIN zones z ON z.id = fp.zone_id
     WHERE fp.id = ? AND fp.owner_user_id = ? AND z.owner_user_id = ?`,
    [id, ownerUserId, ownerUserId]
  );

  if (!floorPlanRow) {
    return null;
  }

  const rackRows = await all(
    `SELECT fr.id, fr.floorplan_id, fr.switch_cabinet_id, fr.name, fr.x, fr.y, fr.z, fr.rotation_y,
            fr.width, fr.depth, fr.height, fr.unit_capacity, fr.equipment_json,
            sc.serial_number, sc.energy_consumption, sc.energy_limit, sc.weight, z.name AS zone_name,
            (SELECT COUNT(*) FROM assets a WHERE a.switch_cabinet_id = sc.id AND a.owner_user_id = fr.owner_user_id) AS equipment_count
     FROM floorplan_racks fr
     LEFT JOIN switch_cabinets sc ON sc.id = fr.switch_cabinet_id AND sc.owner_user_id = fr.owner_user_id
     LEFT JOIN zones z ON z.id = sc.zone_id AND z.owner_user_id = fr.owner_user_id
     WHERE fr.floorplan_id = ? AND fr.owner_user_id = ?
     ORDER BY fr.id ASC`,
    [id, ownerUserId]
  );

  return {
    ...normalizeFloorPlan(floorPlanRow),
    racks: rackRows.map(normalizeRack)
  };
};

export const createFloorPlan = async (req, res) => {
  const {

    zone_id,
    name,
    description,
    width = 12,
    depth = 8,
    height = 3,
    panel_size_x = 0.6,
    panel_size_y = 0.6,
    scale = 1,
    grid_enabled = true,
    axis_x_label = 'X',
    axis_y_label = 'Y',
    background_image_url = null,
    camera = {}
  } = req.body;

  if (!name || !zone_id) {
    return res.status(400).json({ error: 'Название плана и zone_id обязательны' });
  }

  try {
    const ownerUserId = getOwnerUserId(req);
    const zone = await ensureZoneExists(zone_id, ownerUserId);

    if (!zone) {
      return res.status(404).json({ error: 'Зона не найдена' });
    }

    const canCreate = await ensureFloorPlanZoneUniqueness({ zoneId: zone_id, ownerUserId });
    if (!canCreate) {
      return res.status(409).json({ error: 'Для этой зоны уже существует план помещения' });
    }

    const result = await run(
      `INSERT INTO floorplans
       (zone_id, name, description, width, depth, height, panel_size_x, panel_size_y, scale, grid_enabled,
        axis_x_label, axis_y_label, background_image_url, camera_json, owner_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        zone_id,
        name,
        description ?? null,
        toNumber(width, 12),
        toNumber(depth, 8),
        toNumber(height, 3),
        toNumber(panel_size_x, 0.6),
        toNumber(panel_size_y, 0.6),
        toNumber(scale, 1),
        grid_enabled ? 1 : 0,
        axis_x_label,
        axis_y_label,
        background_image_url,
        JSON.stringify(camera ?? {}),
        ownerUserId
      ]
    );

    const payload = await getFloorPlanWithRacks(result.lastID, ownerUserId);
    logger.info(`Success: Floor plan created with ID: ${result.lastID}`);
    return res.status(201).json(payload);
  } catch (error) {
    logger.error(`Error: Failed to create floor plan. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

export const listFloorPlans = async (req, res) => {
  try {
    const rows = await all(
      `SELECT fp.id, fp.zone_id, z.name AS zone_name, fp.name, fp.description, fp.width, fp.depth, fp.height,
              fp.panel_size_x, fp.panel_size_y, fp.scale, fp.grid_enabled, fp.axis_x_label, fp.axis_y_label,
              fp.background_image_url, fp.camera_json, fp.created_at, fp.updated_at
       FROM floorplans fp
       INNER JOIN zones z ON z.id = fp.zone_id
       WHERE fp.owner_user_id = ? AND z.owner_user_id = ?
       ORDER BY fp.updated_at DESC, fp.id DESC`,
      [getOwnerUserId(req), getOwnerUserId(req)]
    );

    return res.status(200).json(rows.map(normalizeFloorPlan));
  } catch (error) {
    logger.error(`Error: Failed to list floor plans. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

export const updateFloorPlan = async (req, res) => {
  const { id } = req.params;
  const {
    zone_id,
    name,
    description,
    width,
    depth,
    height,
    panel_size_x,
    panel_size_y,
    scale,
    grid_enabled,
    axis_x_label,
    axis_y_label,
    background_image_url,
    camera
  } = req.body;

  const fields = [];
  const values = [];

  const appendField = (fieldName, value, formatter = (source) => source) => {
    if (value !== undefined) {
      fields.push(`${fieldName} = ?`);
      values.push(formatter(value));
    }
  };

  appendField('name', name);
  appendField('description', description);
  appendField('width', width, (value) => toNumber(value, 12));
  appendField('depth', depth, (value) => toNumber(value, 8));
  appendField('height', height, (value) => toNumber(value, 3));
  appendField('panel_size_x', panel_size_x, (value) => toNumber(value, 0.6));
  appendField('panel_size_y', panel_size_y, (value) => toNumber(value, 0.6));
  appendField('scale', scale, (value) => toNumber(value, 1));
  appendField('grid_enabled', grid_enabled, (value) => (value ? 1 : 0));
  appendField('axis_x_label', axis_x_label);
  appendField('axis_y_label', axis_y_label);
  appendField('background_image_url', background_image_url);

  if (camera !== undefined) {
    appendField('camera_json', JSON.stringify(camera ?? {}));
  }

  try {
    const ownerUserId = getOwnerUserId(req);

    if (zone_id !== undefined) {
      const zone = await ensureZoneExists(zone_id, ownerUserId);
      if (!zone) {
        return res.status(404).json({ error: 'Зона не найдена' });
      }

      const canUseZone = await ensureFloorPlanZoneUniqueness({ zoneId: zone_id, ownerUserId, excludeFloorPlanId: id });
      if (!canUseZone) {
        return res.status(409).json({ error: 'Для этой зоны уже существует план помещения' });
      }

      appendField('zone_id', zone_id, Number);
    }

    if (!fields.length) {
      return res.status(400).json({ error: 'Передайте хотя бы одно поле для обновления' });
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    values.push(id, ownerUserId);
    const result = await run(
      `UPDATE floorplans
       SET ${fields.join(', ')}
       WHERE id = ? AND owner_user_id = ?`,
      values
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'План помещения не найден' });
    }

    const payload = await getFloorPlanWithRacks(id, ownerUserId);
    return res.status(200).json(payload);
  } catch (error) {
    logger.error(`Error: Failed to update floor plan ${id}. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

export const deleteFloorPlan = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await run(
      `DELETE FROM floorplans WHERE id = ? AND owner_user_id = ?`,
      [id, getOwnerUserId(req)]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'План помещения не найден' });
    }

    return res.status(200).json({ message: 'План помещения удалён', id: Number(id) });
  } catch (error) {
    logger.error(`Error: Failed to delete floor plan ${id}. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

export const getFloorPlan3DView = async (req, res) => {
  const { id } = req.params;

  try {
    const payload = await getFloorPlanWithRacks(id, getOwnerUserId(req));

    if (!payload) {
      return res.status(404).json({ error: 'План помещения не найден' });
    }

    return res.status(200).json(payload);
  } catch (error) {
    logger.error(`Error: Failed to fetch floor plan 3D view ${id}. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

export const createRack = async (req, res) => {
  const {
    floorplan_id,
    switch_cabinet_id = null,
    name,
    x = 0,
    y = 0,
    z = 0,
    rotation_y = 0,
    width = 0.6,
    depth = 1,
    height = 2,
    unit_capacity = 42,
    equipment = []
  } = req.body;

  if (!floorplan_id || !name) {
    return res.status(400).json({ error: 'floorplan_id и name обязательны' });
  }

  try {
    const ownerUserId = getOwnerUserId(req);
    const floorPlan = await get(
      `SELECT id, zone_id FROM floorplans WHERE id = ? AND owner_user_id = ?`,
      [floorplan_id, ownerUserId]
    );

    if (!floorPlan) {
      return res.status(404).json({ error: 'План помещения не найден' });
    }

    if (switch_cabinet_id !== null) {
      const cabinet = await get(
        `SELECT id, zone_id FROM switch_cabinets WHERE id = ? AND owner_user_id = ?`,
        [switch_cabinet_id, ownerUserId]
      );

      if (!cabinet) {
        return res.status(404).json({ error: 'Стойка switch_cabinet не найдена' });
      }

      if (cabinet.zone_id !== null && Number(cabinet.zone_id) !== Number(floorPlan.zone_id)) {
        return res.status(409).json({ error: 'Нельзя разместить стойку из другой зоны на этом плане' });
      }
    }

    const result = await run(
      `INSERT INTO floorplan_racks
       (floorplan_id, switch_cabinet_id, name, x, y, z, rotation_y, width, depth, height, unit_capacity, equipment_json, owner_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        floorplan_id,
        switch_cabinet_id,
        name,
        toNumber(x, 0),
        toNumber(y, 0),
        toNumber(z, 0),
        toNumber(rotation_y, 0),
        toNumber(width, 0.6),
        toNumber(depth, 1),
        toNumber(height, 2),
        toNumber(unit_capacity, 42),
        JSON.stringify(equipment),
        ownerUserId
      ]
    );

    const rackRow = await get(
      `SELECT fr.id, fr.floorplan_id, fr.switch_cabinet_id, fr.name, fr.x, fr.y, fr.z, fr.rotation_y, fr.width, fr.depth,
              fr.height, fr.unit_capacity, fr.equipment_json,
              sc.serial_number, sc.energy_consumption, sc.energy_limit, sc.weight, z.name AS zone_name,
              (SELECT COUNT(*) FROM assets a WHERE a.switch_cabinet_id = sc.id AND a.owner_user_id = fr.owner_user_id) AS equipment_count
       FROM floorplan_racks fr
       LEFT JOIN switch_cabinets sc ON sc.id = fr.switch_cabinet_id AND sc.owner_user_id = fr.owner_user_id
       LEFT JOIN zones z ON z.id = sc.zone_id AND z.owner_user_id = fr.owner_user_id
       WHERE fr.id = ? AND fr.owner_user_id = ?`,
      [result.lastID, ownerUserId]
    );

    return res.status(201).json(normalizeRack(rackRow));
  } catch (error) {
    logger.error(`Error: Failed to create rack. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

export const updateRack = async (req, res) => {
  const { id } = req.params;
  const { switch_cabinet_id, name, x, y, z, rotation_y, width, depth, height, unit_capacity, equipment } = req.body;

  const fields = [];
  const values = [];
  const appendField = (fieldName, value, formatter = (source) => source) => {
    if (value !== undefined) {
      fields.push(`${fieldName} = ?`);
      values.push(formatter(value));
    }
  };

  appendField('switch_cabinet_id', switch_cabinet_id, (value) => (value === null ? null : Number(value)));
  appendField('name', name);
  appendField('x', x, (value) => toNumber(value, 0));
  appendField('y', y, (value) => toNumber(value, 0));
  appendField('z', z, (value) => toNumber(value, 0));
  appendField('rotation_y', rotation_y, (value) => toNumber(value, 0));
  appendField('width', width, (value) => toNumber(value, 0.6));
  appendField('depth', depth, (value) => toNumber(value, 1));
  appendField('height', height, (value) => toNumber(value, 2));
  appendField('unit_capacity', unit_capacity, (value) => toNumber(value, 42));

  if (equipment !== undefined) {
    appendField('equipment_json', JSON.stringify(equipment));
  }

  if (!fields.length) {
    return res.status(400).json({ error: 'Передайте хотя бы одно поле для обновления' });
  }

  try {
    values.push(id, getOwnerUserId(req));
    const result = await run(
      `UPDATE floorplan_racks
       SET ${fields.join(', ')}
       WHERE id = ? AND owner_user_id = ?`,
      values
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Стойка не найдена' });
    }

    const rackRow = await get(
      `SELECT fr.id, fr.floorplan_id, fr.switch_cabinet_id, fr.name, fr.x, fr.y, fr.z, fr.rotation_y, fr.width, fr.depth,
              fr.height, fr.unit_capacity, fr.equipment_json,
              sc.serial_number, sc.energy_consumption, sc.energy_limit, sc.weight, z.name AS zone_name,
              (SELECT COUNT(*) FROM assets a WHERE a.switch_cabinet_id = sc.id AND a.owner_user_id = fr.owner_user_id) AS equipment_count
       FROM floorplan_racks fr
       LEFT JOIN switch_cabinets sc ON sc.id = fr.switch_cabinet_id AND sc.owner_user_id = fr.owner_user_id
       LEFT JOIN zones z ON z.id = sc.zone_id AND z.owner_user_id = fr.owner_user_id
       WHERE fr.id = ? AND fr.owner_user_id = ?`,
      [id, getOwnerUserId(req)]
    );

    return res.status(200).json(normalizeRack(rackRow));
  } catch (error) {
    logger.error(`Error: Failed to update rack ${id}. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

export const deleteRack = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await run(
      `DELETE FROM floorplan_racks WHERE id = ? AND owner_user_id = ?`,
      [id, getOwnerUserId(req)]
    );

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Стойка не найдена' });
    }

    return res.status(200).json({ message: 'Стойка удалена', id: Number(id) });
  } catch (error) {
    logger.error(`Error: Failed to delete rack ${id}. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

export const getRack2DView = async (req, res) => {
  const { id } = req.params;

  try {
    const rackRow = await get(
      `SELECT fr.id, fr.floorplan_id, fr.switch_cabinet_id, fr.name, fr.x, fr.y, fr.z, fr.rotation_y, fr.width, fr.depth,
              fr.height, fr.unit_capacity, fr.equipment_json,
              sc.serial_number, sc.energy_consumption, sc.energy_limit, sc.weight, z.name AS zone_name,
              (SELECT COUNT(*) FROM assets a WHERE a.switch_cabinet_id = sc.id AND a.owner_user_id = fr.owner_user_id) AS equipment_count
       FROM floorplan_racks fr
       LEFT JOIN switch_cabinets sc ON sc.id = fr.switch_cabinet_id AND sc.owner_user_id = fr.owner_user_id
       LEFT JOIN zones z ON z.id = sc.zone_id AND z.owner_user_id = fr.owner_user_id
       WHERE fr.id = ? AND fr.owner_user_id = ?`,
      [id, getOwnerUserId(req)]
    );

    if (!rackRow) {
      return res.status(404).json({ error: 'Стойка не найдена' });
    }

    return res.status(200).json(normalizeRack(rackRow));
  } catch (error) {
    logger.error(`Error: Failed to fetch rack 2D view ${id}. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};
