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

const normalizeRack = (row) => ({
  id: Number(row.id),
  floorplan_id: Number(row.floorplan_id),
  name: row.name,
  x: Number(row.x),
  y: Number(row.y),
  z: Number(row.z),
  rotation_y: Number(row.rotation_y),
  width: Number(row.width),
  depth: Number(row.depth),
  height: Number(row.height),
  unit_capacity: Number(row.unit_capacity),
  equipment: parseJsonSafe(row.equipment_json, [])
});

const normalizeFloorPlan = (row) => ({
  id: Number(row.id),
  name: row.name,
  description: row.description,
  width: Number(row.width),
  depth: Number(row.depth),
  height: Number(row.height),
  camera: parseJsonSafe(row.camera_json, {}),
  created_at: row.created_at,
  updated_at: row.updated_at
});

const getFloorPlanWithRacks = async (id, ownerUserId) => {
  const floorPlanRow = await get(
    `SELECT id, name, description, width, depth, height, camera_json, created_at, updated_at
     FROM floorplans
     WHERE id = ? AND owner_user_id = ?`,
    [id, ownerUserId]
  );

  if (!floorPlanRow) {
    return null;
  }

  const rackRows = await all(
    `SELECT id, floorplan_id, name, x, y, z, rotation_y, width, depth, height, unit_capacity, equipment_json
     FROM floorplan_racks
     WHERE floorplan_id = ? AND owner_user_id = ?
     ORDER BY id ASC`,
    [id, ownerUserId]
  );

  return {
    ...normalizeFloorPlan(floorPlanRow),
    racks: rackRows.map(normalizeRack)
  };
};

export const createFloorPlan = async (req, res) => {
  const {
    name,
    description,
    width = 12,
    depth = 8,
    height = 3,
    camera = {}
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Название плана обязательно' });
  }

  try {
    const ownerUserId = getOwnerUserId(req);
    const result = await run(
      `INSERT INTO floorplans (name, description, width, depth, height, camera_json, owner_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description ?? null, width, depth, height, JSON.stringify(camera ?? {}), ownerUserId]
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
      `SELECT id, name, description, width, depth, height, camera_json, created_at, updated_at
       FROM floorplans
       WHERE owner_user_id = ?
       ORDER BY updated_at DESC, id DESC`,
      [getOwnerUserId(req)]
    );

    return res.status(200).json(rows.map(normalizeFloorPlan));
  } catch (error) {
    logger.error(`Error: Failed to list floor plans. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

export const updateFloorPlan = async (req, res) => {
  const { id } = req.params;
  const { name, description, width, depth, height, camera } = req.body;

  const fields = [];
  const values = [];

  if (name !== undefined) {
    fields.push('name = ?');
    values.push(name);
  }

  if (description !== undefined) {
    fields.push('description = ?');
    values.push(description);
  }

  if (width !== undefined) {
    fields.push('width = ?');
    values.push(width);
  }

  if (depth !== undefined) {
    fields.push('depth = ?');
    values.push(depth);
  }

  if (height !== undefined) {
    fields.push('height = ?');
    values.push(height);
  }

  if (camera !== undefined) {
    fields.push('camera_json = ?');
    values.push(JSON.stringify(camera ?? {}));
  }

  if (!fields.length) {
    return res.status(400).json({ error: 'Передайте хотя бы одно поле для обновления' });
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');

  try {
    const ownerUserId = getOwnerUserId(req);
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
      `SELECT id FROM floorplans WHERE id = ? AND owner_user_id = ?`,
      [floorplan_id, ownerUserId]
    );

    if (!floorPlan) {
      return res.status(404).json({ error: 'План помещения не найден' });
    }

    const result = await run(
      `INSERT INTO floorplan_racks
       (floorplan_id, name, x, y, z, rotation_y, width, depth, height, unit_capacity, equipment_json, owner_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [floorplan_id, name, x, y, z, rotation_y, width, depth, height, unit_capacity, JSON.stringify(equipment), ownerUserId]
    );

    const rackRow = await get(
      `SELECT id, floorplan_id, name, x, y, z, rotation_y, width, depth, height, unit_capacity, equipment_json
       FROM floorplan_racks WHERE id = ? AND owner_user_id = ?`,
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
  const { name, x, y, z, rotation_y, width, depth, height, unit_capacity, equipment } = req.body;

  const fields = [];
  const values = [];

  const appendField = (fieldName, value) => {
    if (value !== undefined) {
      fields.push(`${fieldName} = ?`);
      values.push(value);
    }
  };

  appendField('name', name);
  appendField('x', x);
  appendField('y', y);
  appendField('z', z);
  appendField('rotation_y', rotation_y);
  appendField('width', width);
  appendField('depth', depth);
  appendField('height', height);
  appendField('unit_capacity', unit_capacity);

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
      `SELECT id, floorplan_id, name, x, y, z, rotation_y, width, depth, height, unit_capacity, equipment_json
       FROM floorplan_racks WHERE id = ? AND owner_user_id = ?`,
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
      `SELECT id, floorplan_id, name, x, y, z, rotation_y, width, depth, height, unit_capacity, equipment_json
       FROM floorplan_racks
       WHERE id = ? AND owner_user_id = ?`,
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
