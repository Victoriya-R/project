import db from '../utils/db.js';  // Подключение к базе данных
import logger from '../utils/logger.js';  // Логирование

const getOwnerUserId = (req) => Number(req.user?.userId);

// Создание новой зоны с дополнительными полями
export const createZone = async (req, res) => {
    const { name, description, address, phone, employee, site } = req.body;

    // Валидация обязательных полей
    if (!name) {
        return res.status(400).json({ error: 'Название зоны обязательно' });
    }

    try {
        const query = `INSERT INTO zones (name, description, address, phone, employee, site, owner_user_id) 
                       VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const ownerUserId = getOwnerUserId(req);
        const result = await new Promise((resolve, reject) => {
            db.run(query, [name, description, address, phone, employee, site, ownerUserId], function (err) {
                if (err) {
                    return reject(err);
                }
                resolve(this.lastID);
            });
        });

        // Логируем создание зоны
        logger.info(`Success: Zone created with ID: ${result}, Name: ${name}`);

        res.status(201).json({ message: 'Зона успешно создана', id: result });
    } catch (error) {
        logger.error(`Error: Failed to create zone. Error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
};
export const getZones = async (req, res) => {
  const ownerUserId = getOwnerUserId(req);
  const query = `SELECT * FROM zones WHERE owner_user_id = ?`;

  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(query, [ownerUserId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    logger.info(`Success: Fetched ${rows.length} zones`);
    return res.status(200).json(rows);
  } catch (error) {
    logger.error(`Error: Failed to fetch zones. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};
export const getZoneById = async (req, res) => {
  const { id } = req.params;
  const ownerUserId = getOwnerUserId(req);
  const query = `SELECT * FROM zones WHERE id = ? AND owner_user_id = ?`;

  try {
    const row = await new Promise((resolve, reject) => {
      db.get(query, [id, ownerUserId], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!row) {
      return res.status(404).json({ error: 'Зона не найдена' });
    }

    return res.status(200).json(row);
  } catch (error) {
    logger.error(`Error: Failed to fetch zone by id. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

export const updateZone = async (req, res) => {
  const { id } = req.params;
  const { name, description, address, phone, employee, site } = req.body;

  if (
    name === undefined &&
    description === undefined &&
    address === undefined &&
    phone === undefined &&
    employee === undefined &&
    site === undefined
  ) {
    return res.status(400).json({ error: 'Нужно передать хотя бы одно поле для обновления' });
  }

  const fields = [];
  const values = [];

  const addField = (fieldName, value) => {
    if (value !== undefined) {
      fields.push(`${fieldName} = ?`);
      values.push(value);
    }
  };

  addField('name', name);
  addField('description', description);
  addField('address', address);
  addField('phone', phone);
  addField('employee', employee);
  addField('site', site);

  values.push(getOwnerUserId(req), id);

  const query = `UPDATE zones SET ${fields.join(', ')} WHERE owner_user_id = ? AND id = ?`;

  try {
    const changes = await new Promise((resolve, reject) => {
      db.run(query, values, function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });

    if (changes === 0) {
      return res.status(404).json({ error: 'Зона не найдена' });
    }

    logger.info(`Success: Zone with ID: ${id} updated`);
    return res.status(200).json({ message: 'Зона успешно обновлена', id: Number(id) });
  } catch (error) {
    logger.error(`Error: Failed to update zone. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

export const deleteZone = async (req, res) => {
  const { id } = req.params;

  try {
    const zone = await new Promise((resolve, reject) => {
      db.get(`SELECT id FROM zones WHERE id = ? AND owner_user_id = ?`, [id, getOwnerUserId(req)], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!zone) {
      return res.status(404).json({ error: 'Зона не найдена' });
    }

    const linkedCabinetsCount = await new Promise((resolve, reject) => {
      db.get(
        `SELECT COUNT(*) AS count FROM switch_cabinets WHERE zone_id = ? AND owner_user_id = ?`,
        [id, getOwnerUserId(req)],
        (err, row) => {
          if (err) return reject(err);
          resolve(row?.count ?? 0);
        }
      );
    });

    if (linkedCabinetsCount > 0) {
      return res.status(409).json({
        error: 'Нельзя удалить зону, в которой размещены стойки',
        linked_switch_cabinets_count: linkedCabinetsCount
      });
    }

    const changes = await new Promise((resolve, reject) => {
      db.run(`DELETE FROM zones WHERE id = ? AND owner_user_id = ?`, [id, getOwnerUserId(req)], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });

    if (changes === 0) {
      return res.status(404).json({ error: 'Зона не найдена' });
    }

    logger.info(`Success: Zone with ID: ${id} deleted`);
    return res.status(200).json({ message: `Зона с ID ${id} удалена`, id: Number(id) });
  } catch (error) {
    logger.error(`Error: Failed to delete zone with ID: ${id}. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};



export const getPortsForEquipment = async (req, res) => {
  const { equipment_id } = req.query;  // Получаем equipment_id из query параметров

  if (!equipment_id) {
    return res.status(400).json({ error: 'Не указан equipment_id' });
  }

  try {
    const query = `
      SELECT id, equipment_id, port_type, port_number, status, cable_type
      FROM ports
      WHERE equipment_id = ?
    `;

    const equipment = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM assets WHERE id = ? AND owner_user_id = ?', [equipment_id, getOwnerUserId(req)], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!equipment) {
      return res.status(404).json({ error: 'Оборудование не найдено' });
    }

    const ports = await new Promise((resolve, reject) => {
      db.all(query, [equipment_id], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    if (!ports.length) {
      return res.status(404).json({ error: 'Порты для указанного оборудования не найдены' });
    }

    return res.status(200).json(ports);
  } catch (error) {
    logger.error(`Error: Failed to fetch ports for equipment ID: ${equipment_id}. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

const getConnectionByIdForOwner = async (connectionId, ownerUserId) => new Promise((resolve, reject) => {
  db.get(
    `SELECT * FROM connections WHERE id = ? AND owner_user_id = ?`,
    [connectionId, ownerUserId],
    (err, row) => (err ? reject(err) : resolve(row ?? null))
  );
});

const updatePortStatuses = async (portIds, status) => {
  if (!portIds.length) {
    return;
  }

  for (const portId of [...new Set(portIds.map(Number))]) {
    await new Promise((resolve, reject) => {
      db.run(`UPDATE ports SET status = ? WHERE id = ?`, [status, portId], (err) => (err ? reject(err) : resolve()));
    });
  }
};

const normalizeConnectionRow = (row) => ({
  ...row,
  id: Number(row.id),
  cable_id: Number(row.cable_id),
  a_port_id: Number(row.a_port_id),
  b_port_id: Number(row.b_port_id)
});

//валидация портов
export const validatePortsForConnection = async (a_port_id, b_port_id, ownerUserId, cable_id, excludedConnectionId = null) => {
  const ports = await new Promise((resolve, reject) => {
    db.all(
      `
        SELECT
          p.id,
          p.equipment_id,
          p.port_type,
          p.port_number,
          p.status,
          p.cable_type,
          a.name AS equipment_name,
          a.type AS equipment_type,
          a.owner_user_id
        FROM ports p
        JOIN assets a ON a.id = p.equipment_id
        WHERE p.id IN (?, ?)
      `,
      [a_port_id, b_port_id],
      (err, rows) => (err ? reject(new Error('Ошибка при получении данных портов')) : resolve(rows))
    );
  });

  if (ports.length !== 2 || ports.some((port) => Number(port.owner_user_id) !== ownerUserId)) {
    throw new Error('Не найдены порты с таким ID');
  }

  const [portA, portB] = [ports.find((item) => Number(item.id) === Number(a_port_id)), ports.find((item) => Number(item.id) === Number(b_port_id))];

  if (!portA || !portB) {
    throw new Error('Не найдены порты с таким ID');
  }

  if (Number(portA.equipment_id) === Number(portB.equipment_id)) {
    throw new Error('Нельзя соединять два порта одного и того же устройства');
  }

  if (portA.port_type !== portB.port_type) {
    throw new Error('Порты несовместимы для соединения');
  }

  if (portA.cable_type !== portB.cable_type) {
    throw new Error('Порты несовместимы по типу кабеля');
  }

  const cable = await new Promise((resolve, reject) => {
    db.get(
      `SELECT id, type, equipment_type_allowed FROM cables WHERE id = ? AND owner_user_id = ?`,
      [cable_id, ownerUserId],
      (err, row) => (err ? reject(new Error('Ошибка при получении данных кабеля')) : resolve(row ?? null))
    );
  });

  if (!cable) {
    throw new Error('Кабель не найден');
  }

  if (cable.type !== portA.cable_type || cable.type !== portB.cable_type) {
    throw new Error(`Кабель типа ${cable.type} несовместим с выбранными портами`);
  }

  const occupiedConnections = await new Promise((resolve, reject) => {
    db.all(
      `
        SELECT id, cable_id, a_port_id, b_port_id
        FROM connections
        WHERE owner_user_id = ?
          AND (? IS NULL OR id != ?)
          AND (
            cable_id = ?
            OR a_port_id IN (?, ?)
            OR b_port_id IN (?, ?)
          )
      `,
      [ownerUserId, excludedConnectionId, excludedConnectionId, cable_id, a_port_id, b_port_id, a_port_id, b_port_id],
      (err, rows) => (err ? reject(new Error('Ошибка при проверке существующих соединений')) : resolve(rows))
    );
  });

  if (occupiedConnections.length > 0) {
    throw new Error('Выбранный кабель или один из портов уже участвует в другом соединении');
  }

  if (portA.status === 'disabled' || portB.status === 'disabled') {
    throw new Error('Один из выбранных портов отключен');
  }

  if ((portA.status === 'busy' || portB.status === 'busy') && excludedConnectionId === null) {
    throw new Error('Один из выбранных портов уже занят');
  }

  return { cable, portA, portB };
};

export const createConnection = async (req, res) => {
  const { cable_id, a_port_id, b_port_id, status = 'active' } = req.body;

  // Проверка обязательных полей
  if (!cable_id || !a_port_id || !b_port_id) {
    return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
  }

  if (Number(a_port_id) === Number(b_port_id)) {
    return res.status(400).json({ error: 'a_port_id и b_port_id не могут быть одинаковыми' });
  }

  try {
    const ownerUserId = getOwnerUserId(req);
    await validatePortsForConnection(a_port_id, b_port_id, ownerUserId, cable_id);

    await new Promise((resolve, reject) => db.run('BEGIN TRANSACTION', (err) => (err ? reject(err) : resolve())));

    const queryInsert = `
      INSERT INTO connections (cable_id, a_port_id, b_port_id, status, owner_user_id)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    const result = await new Promise((resolve, reject) => {
      db.run(queryInsert, [cable_id, a_port_id, b_port_id, status, ownerUserId], function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      });
    });

    await updatePortStatuses([a_port_id, b_port_id], 'busy');
    await new Promise((resolve, reject) => db.run('COMMIT', (err) => (err ? reject(err) : resolve())));

    logger.info(
      `Success: Connection created with ID: ${result}, Cable ID: ${cable_id}, A Port ID: ${a_port_id}, B Port ID: ${b_port_id}`
    );

    const createdConnection = await getConnectionByIdForOwner(result, ownerUserId);
    return res.status(201).json({ message: 'Соединение успешно создано', id: result, connection: normalizeConnectionRow(createdConnection) });
  } catch (error) {
    try {
      await new Promise((resolve) => db.run('ROLLBACK', () => resolve()));
    } catch (_) {}
    logger.error(`Error: Failed to create connection. Error: ${error.message}`);
    return res.status(400).json({ error: error.message });
  }
};

// Получение всех соединений
export const getConnections = async (req, res) => {
    const ownerUserId = getOwnerUserId(req);
    const query = `SELECT * FROM connections WHERE owner_user_id = ?`;  // Запрос для получения соединений

    try {
        const rows = await new Promise((resolve, reject) => {
            db.all(query, [ownerUserId], (err, rows) => {
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });

        logger.info(`Success: Fetched ${rows.length} connections`);
        res.json(rows.map(normalizeConnectionRow));  // Отправка данных в ответ
    } catch (error) {
        logger.error(`Error: Failed to fetch connections. Error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
};

export const getConnectionById = async (req, res) => {
  try {
    const connection = await getConnectionByIdForOwner(req.params.id, getOwnerUserId(req));

    if (!connection) {
      return res.status(404).json({ error: 'Соединение не найдено' });
    }

    return res.status(200).json(normalizeConnectionRow(connection));
  } catch (error) {
    logger.error(`Error: Failed to fetch connection by id. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

// Обновление соединения
export const updateConnection = async (req, res) => {
  const { id } = req.params;
  const { cable_id, a_port_id, b_port_id, status = 'active' } = req.body;

  // Валидация
  if (!cable_id || !a_port_id || !b_port_id) {
    return res.status(400).json({ error: 'Необходимо указать cable_id, a_port_id и b_port_id' });
  }
  if (Number(a_port_id) === Number(b_port_id)) {
    return res.status(400).json({ error: 'a_port_id и b_port_id не могут быть одинаковыми' });
  }

  try {
    const ownerUserId = getOwnerUserId(req);
    const existingConnection = await getConnectionByIdForOwner(id, ownerUserId);

    if (!existingConnection) {
      return res.status(404).json({ error: 'Соединение не найдено' });
    }

    await validatePortsForConnection(a_port_id, b_port_id, ownerUserId, cable_id, Number(id));

    await new Promise((resolve, reject) => db.run('BEGIN TRANSACTION', (err) => (err ? reject(err) : resolve())));
    const query = `UPDATE connections SET cable_id = ?, a_port_id = ?, b_port_id = ?, status = ? WHERE id = ? AND owner_user_id = ?`;

    const changes = await new Promise((resolve, reject) => {
      db.run(query, [cable_id, a_port_id, b_port_id, status, id, ownerUserId], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });

    if (changes === 0) {
      return res.status(404).json({ error: 'Соединение не найдено' });
    }

    await updatePortStatuses([existingConnection.a_port_id, existingConnection.b_port_id], 'available');
    await updatePortStatuses([a_port_id, b_port_id], 'busy');
    await new Promise((resolve, reject) => db.run('COMMIT', (err) => (err ? reject(err) : resolve())));

    logger.info(`Success: Connection updated. ID: ${id}`);
    const updatedConnection = await getConnectionByIdForOwner(id, ownerUserId);
    return res.status(200).json({ message: 'Соединение успешно обновлено', id: Number(id), connection: normalizeConnectionRow(updatedConnection) });

  } catch (error) {
    try {
      await new Promise((resolve) => db.run('ROLLBACK', () => resolve()));
    } catch (_) {}
    logger.error(`Error: Failed to update connection. Error: ${error.message}`);
    return res.status(400).json({ error: error.message });
  }
};

// Удаление соединения
export const deleteConnection = async (req, res) => {
  const { id } = req.params;

  try {
    const existingConnection = await getConnectionByIdForOwner(id, getOwnerUserId(req));

    if (!existingConnection) {
      return res.status(404).json({ error: 'Соединение не найдено' });
    }

    await new Promise((resolve, reject) => db.run('BEGIN TRANSACTION', (err) => (err ? reject(err) : resolve())));
    const query = `DELETE FROM connections WHERE id = ? AND owner_user_id = ?`;

    const changes = await new Promise((resolve, reject) => {
      db.run(query, [id, getOwnerUserId(req)], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });

    if (changes === 0) {
      return res.status(404).json({ error: 'Соединение не найдено' });
    }

    await updatePortStatuses([existingConnection.a_port_id, existingConnection.b_port_id], 'available');
    await new Promise((resolve, reject) => db.run('COMMIT', (err) => (err ? reject(err) : resolve())));

    logger.info(`Success: Connection deleted. ID: ${id}`);
    return res.status(200).json({ message: 'Соединение успешно удалено', id: Number(id) });

  } catch (error) {
    try {
      await new Promise((resolve) => db.run('ROLLBACK', () => resolve()));
    } catch (_) {}
    logger.error(`Error: Failed to delete connection. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};
//Создание кабеля
export const createCable = async (req, res) => {
  const { type, length, status, equipment_type_allowed } = req.body;

  if (!type || length === undefined || !status || !equipment_type_allowed) {
    return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
  }

  const allowedTypes = ['patchCord', 'powerCable'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Тип кабеля должен быть "patchCord" или "powerCable"' });
  }

  const allowedEquipmentTypes = {
    powerCable: ['automaton', 'server', 'ups'],
    patchCord: ['patchPanel', 'server'],
  };

  if (!allowedEquipmentTypes[type].includes(equipment_type_allowed)) {
    return res.status(400).json({
      error: `Кабель типа "${type}" не может быть использован с таким оборудованием`
    });
  }

  if (Number(length) <= 0) {
    return res.status(400).json({ error: 'length должен быть больше 0' });
  }

  try {
    const query = `INSERT INTO cables (type, length, status, equipment_type_allowed, owner_user_id) VALUES (?, ?, ?, ?, ?)`;
    const ownerUserId = getOwnerUserId(req);
    const result = await new Promise((resolve, reject) => {
      db.run(query, [type, length, status, equipment_type_allowed, ownerUserId], function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      });
    });

    logger.info(
      `Success: Cable created with ID: ${result}, Type: ${type}, Length: ${length}, Status: ${status}`
    );

    return res.status(201).json({ message: 'Кабель успешно создан', id: result });
  } catch (error) {
    logger.error(`Error: Failed to create cable. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};
export const getCables = async (req, res) => {
  db.all('SELECT * FROM cables WHERE owner_user_id = ?', [getOwnerUserId(req)], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.status(200).json(rows);
  });
};

export const getCableById = async (req, res) => {
  const { id } = req.params;

  db.get('SELECT * FROM cables WHERE id = ? AND owner_user_id = ?', [id, getOwnerUserId(req)], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'Cable not found' });
    return res.status(200).json(row);
  });
};

export const updateCable = async (req, res) => {
  const { id } = req.params;
  const { type, length, status, equipment_type_allowed } = req.body;

  if (!type || length === undefined || !status || !equipment_type_allowed) {
    return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
  }

  const allowedTypes = ['patchCord', 'powerCable'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: 'Тип кабеля должен быть "patchCord" или "powerCable"' });
  }

  const allowedEquipmentTypes = {
    powerCable: ['automaton', 'server', 'ups'],
    patchCord: ['patchPanel', 'server'],
  };

  if (!allowedEquipmentTypes[type].includes(equipment_type_allowed)) {
    return res.status(400).json({ error: `Кабель типа "${type}" не может быть использован с таким оборудованием` });
  }

  if (Number(length) <= 0) {
    return res.status(400).json({ error: 'length должен быть больше 0' });
  }

  db.run(
    `UPDATE cables SET type = ?, length = ?, status = ?, equipment_type_allowed = ? WHERE id = ? AND owner_user_id = ?`,
    [type, length, status, equipment_type_allowed, id, getOwnerUserId(req)],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Cable not found' });
      return res.status(200).json({ message: 'Кабель обновлён', id: Number(id) });
    }
  );
};

export const deleteCable = async (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM cables WHERE id = ? AND owner_user_id = ?', [id, getOwnerUserId(req)], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    if (this.changes === 0) return res.status(404).json({ error: 'Cable not found' });
    return res.status(200).json({ message: 'Кабель удалён', id: Number(id) });
  });
};

// Создание стойки
export const createSwitchCabinet = async (req, res) => {
  const {
    name,
    weight,
    energy_consumption,
    energy_limit,
    employee,
    zone_id,
    description,
    isDataCenterEquipment,
    serial_number
  } = req.body;

  const missing_fields = [];
  if (name === undefined || String(name).trim() === '') missing_fields.push('name');
  if (weight === undefined) missing_fields.push('weight');
  if (energy_consumption === undefined) missing_fields.push('energy_consumption');
  if (energy_limit === undefined) missing_fields.push('energy_limit');
  if (serial_number === undefined || String(serial_number).trim() === '') missing_fields.push('serial_number');

  if (missing_fields.length) {
    return res.status(400).json({ error: 'Не заполнены обязательные поля', missing_fields });
  }

  // Числовые проверки (по желанию, но полезно)
  if (!Number.isFinite(Number(weight)) || Number(weight) <= 0) {
    return res.status(400).json({ error: 'weight должно быть числом > 0' });
  }
  if (!Number.isFinite(Number(energy_limit)) || Number(energy_limit) <= 0) {
    return res.status(400).json({ error: 'energy_limit должно быть числом > 0' });
  }
  if (!Number.isFinite(Number(energy_consumption)) || Number(energy_consumption) < 0) {
    return res.status(400).json({ error: 'energy_consumption должно быть числом >= 0' });
  }

  try {
    const query = `
      INSERT INTO switch_cabinets
      (name, weight, energy_consumption, energy_limit, employee, zone_id, description, isDataCenterEquipment, serial_number, owner_user_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await new Promise((resolve, reject) => {
      db.run(
        query,
        [String(name).trim(), weight, energy_consumption, energy_limit, employee, zone_id, description, isDataCenterEquipment, String(serial_number).trim(), getOwnerUserId(req)],
        function (err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });

    logger.info(`Success: SwitchCabinet created with ID: ${result}, Name: ${name}`);
    return res.status(201).json({ message: 'Стойка успешно создана', id: result });

  } catch (error) {
    logger.error(`Error: Failed to create SwitchCabinet. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

// Получение всех стоек
export const getAllSwitchCabinets = async (req, res) => {
  const ownerUserId = getOwnerUserId(req);
  const query = `SELECT * FROM switch_cabinets WHERE owner_user_id = ?`;

  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(query, [ownerUserId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    logger.info(`Success: Fetched ${rows.length} switch cabinets`);
    res.status(200).json(rows);  // Отправка данных в ответ
  } catch (error) {
    logger.error(`Error: Failed to fetch switch cabinets. Error: ${error.message}`);
    res.status(500).json({ error: error.message });
  }
};

export const updateSwitchCabinet = async (req, res) => {
  const id = Number(req.params.id ?? req.body.id);
  const {
    name,
    weight,
    energy_consumption,
    energy_limit,
    employee,
    zone_id,
    description,
    isDataCenterEquipment,
    serial_number
  } = req.body;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Некорректный id (должно быть число > 0)' });
  }

  const required = { name, weight, energy_consumption, energy_limit, serial_number };
  const missing_fields = Object.entries(required)
    .filter(([_, value]) => value === undefined || value === null || value === '')
    .map(([key]) => key);

  if (missing_fields.length) {
    return res.status(400).json({ error: 'Не заполнены обязательные поля', missing_fields });
  }

  try {
    const query = `
      UPDATE switch_cabinets
      SET name = ?,
          weight = ?,
          energy_consumption = ?,
          energy_limit = ?,
          employee = ?,
          zone_id = ?,
          description = ?,
          isDataCenterEquipment = ?,
          serial_number = ?
      WHERE id = ? AND owner_user_id = ?
    `;

    const changes = await new Promise((resolve, reject) => {
      db.run(
        query,
        [name, weight, energy_consumption, energy_limit, employee, zone_id, description, isDataCenterEquipment, serial_number, id, getOwnerUserId(req)],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    });

    if (changes === 0) {
      return res.status(404).json({ error: 'Стойка не найдена' });
    }

    logger.info(`Success: SwitchCabinet with ID: ${id} updated`);
    return res.status(200).json({ message: `Стойка с ID ${id} успешно обновлена` });
  } catch (error) {
    logger.error(`Error: Failed to update SwitchCabinet. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

// Частичное обновление стойки по ID
export const partialUpdateSwitchCabinet = async (req, res) => {
  const id = Number(req.params.id);
  const { weight, energy_consumption, energy_limit, employee, zone_id, description } = req.body;

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Некорректный id (должно быть число > 0)' });
  }

  try {
    const fields = [];
    const values = [];

    if (weight !== undefined) {
      fields.push('weight = ?');
      values.push(weight);
    }
    if (energy_consumption !== undefined) {
      fields.push('energy_consumption = ?');
      values.push(energy_consumption);
    }
    if (energy_limit !== undefined) {
      fields.push('energy_limit = ?');
      values.push(energy_limit);
    }
    if (employee !== undefined) {
      fields.push('employee = ?');
      values.push(employee);
    }
    if (zone_id !== undefined) {
      fields.push('zone_id = ?');
      values.push(zone_id);
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description);
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    values.push(id, getOwnerUserId(req));
    const query = `UPDATE switch_cabinets SET ${fields.join(', ')} WHERE id = ? AND owner_user_id = ?`;

    const changes = await new Promise((resolve, reject) => {
      db.run(query, values, function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });

    if (changes === 0) {
      return res.status(404).json({ error: 'Стойка не найдена' });
    }

    logger.info(`Success: Partial update of SwitchCabinet with ID: ${id}`);
    return res.status(200).json({ message: `Стойка с ID ${id} успешно обновлена` });
  } catch (error) {
    logger.error(`Error: Failed to partial update SwitchCabinet. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};


export const getSwitchCabinet = async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Некорректный id' });
  }

  try {
    // 1) стойка
    const cabinet = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM switch_cabinets WHERE id = ? AND owner_user_id = ?', [id, getOwnerUserId(req)], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!cabinet) {
      return res.status(404).json({ error: 'Стойка не найдена' });
    }

    // 2) оборудование в стойке (берём из assets)
    const equipment = await new Promise((resolve, reject) => {
      db.all(
        `SELECT id, name, type, model, serial, status, weight, energy_consumption,
                COALESCE(rack_unit_size, 1) AS unit_size,
                rack_start_unit AS startUnit
         FROM assets
         WHERE switch_cabinet_id = ? AND owner_user_id = ?`,
        [id, getOwnerUserId(req)],
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows);
        }
      );
    });

    // 3) ответ
    return res.status(200).json({
      ...cabinet,
      equipment: equipment ?? [] // лучше [] чем null
    });

  } catch (error) {
    logger.error(`Error: Failed to fetch switch cabinet. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

// Удаление стойки
export const deleteSwitchCabinet = async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'Некорректный id (должно быть число > 0)' });
  }

  try {
    // (рекомендовано) не удаляем стойку, если в ней есть оборудование
    const cntRow = await new Promise((resolve, reject) => {
      db.get(
        'SELECT COUNT(*) AS cnt FROM assets WHERE switch_cabinet_id = ? AND owner_user_id = ?',
        [id, getOwnerUserId(req)],
        (err, row) => (err ? reject(err) : resolve(row))
      );
    });

    if ((cntRow?.cnt ?? 0) > 0) {
      return res.status(409).json({
        error: 'Нельзя удалить стойку: в ней размещено оборудование',
        equipment_count: cntRow.cnt
      });
    }

    const changes = await new Promise((resolve, reject) => {
      db.run('DELETE FROM switch_cabinets WHERE id = ? AND owner_user_id = ?', [id, getOwnerUserId(req)], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });

    if (changes === 0) {
      return res.status(404).json({ error: 'Стойка не найдена' });
    }

    logger.info(`Success: SwitchCabinet with ID: ${id} deleted`);
    return res.status(200).json({ message: `Стойка с ID ${id} успешно удалена` });

  } catch (error) {
    logger.error(`Error: Failed to delete SwitchCabinet. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};


export const placeInSwitchCabinet = async (req, res) => {
  const equipment_id = Number(req.body.equipment_id);
  const switch_cabinet_id = Number(req.body.switch_cabinet_id);
  const start_unit = Number(req.body.start_unit);
  const unit_size = Number(req.body.unit_size);

  if (!Number.isInteger(equipment_id) || equipment_id <= 0) {
    return res.status(400).json({ error: 'equipment_id должен быть числом > 0' });
  }
  if (!Number.isInteger(switch_cabinet_id) || switch_cabinet_id <= 0) {
    return res.status(400).json({ error: 'switch_cabinet_id должен быть числом > 0' });
  }
  if (!Number.isInteger(start_unit) || start_unit <= 0) {
    return res.status(400).json({ error: 'start_unit должен быть числом > 0' });
  }
  if (!Number.isInteger(unit_size) || unit_size <= 0) {
    return res.status(400).json({ error: 'unit_size должен быть числом > 0' });
  }

  try {
    const ownerUserId = getOwnerUserId(req);
    const switchCabinet = await getSwitchCabinetById(switch_cabinet_id, ownerUserId);
    if (!switchCabinet) return res.status(404).json({ error: 'Стойка не найдена' });

    const equipment = await getEquipmentRowById(equipment_id, ownerUserId);
    if (!equipment) return res.status(404).json({ error: 'Оборудование не найдено' });

    const endUnit = start_unit + unit_size - 1;
    const rackCapacity = Number(switchCabinet.unit_capacity ?? 42);
    if (endUnit > rackCapacity) {
      return res.status(400).json({ error: 'Оборудование выходит за пределы стойки' });
    }

    const conflict = await findPlacementConflict({
      switch_cabinet_id,
      ownerUserId,
      equipment_id,
      start_unit,
      endUnit
    });
    if (conflict) {
      return res.status(409).json({ error: 'Выбранные U-слоты уже заняты' });
    }

    // текущие суммы в стойке (из helper: массив оборудования)
    const currentEnergy = (switchCabinet.equipment ?? []).reduce(
      (sum, item) => (Number(item.id) === equipment_id ? sum : sum + Number(item.energy_consumption ?? 0)),
      0
    );
    const currentWeight = (switchCabinet.equipment ?? []).reduce(
      (sum, item) => (Number(item.id) === equipment_id ? sum : sum + Number(item.weight ?? 0)),
      0
    );

    const eqEnergy = Number(equipment.energy_consumption ?? 0);
    const eqWeight = Number(equipment.weight ?? 0);

    const warnings = [];

    // лимит энергии
    if (switchCabinet.energy_limit !== undefined && Number(switchCabinet.energy_limit) > 0) {
      if (currentEnergy + eqEnergy > Number(switchCabinet.energy_limit)) {
        warnings.push('Энергопотребление стойки превышено');
      }
    }

    // лимит веса: в БД поле weight — это лимит стойки
    if (switchCabinet.weight !== undefined && Number(switchCabinet.weight) > 0) {
      if (currentWeight + eqWeight > Number(switchCabinet.weight)) {
        warnings.push('Нагрузка на стойку превышена');
      }
    }

    // размещаем
    const changes = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE assets
         SET switch_cabinet_id = ?, rack_start_unit = ?, rack_unit_size = ?
         WHERE id = ? AND owner_user_id = ?`,
        [switch_cabinet_id, start_unit, unit_size, equipment_id, ownerUserId],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    });

    if (changes === 0) {
      return res.status(404).json({ error: 'Оборудование не найдено' });
    }

    logger.info(`Equipment ID: ${equipment_id} placed in Switch Cabinet ID: ${switch_cabinet_id}`);

    return res.status(200).json({
      message: warnings.length ? 'Оборудование размещено, но есть предупреждения' : 'Оборудование успешно размещено в стойке',
      equipment_id,
      switch_cabinet_id,
      start_unit,
      unit_size,
      warnings
    });

  } catch (error) {
    logger.error(`Error: Failed to place equipment in Switch Cabinet. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

const getEquipmentRowById = async (equipment_id, ownerUserId) => {
  const equipment = await new Promise((resolve, reject) => {
    db.get(
      `SELECT id, name, type, model, serial, status, weight, energy_consumption, switch_cabinet_id,
              rack_start_unit, COALESCE(rack_unit_size, 1) AS rack_unit_size
       FROM assets
       WHERE id = ? AND owner_user_id = ?`,
      [equipment_id, ownerUserId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });

  return equipment || null;
};

const createPortsForAsset = async (equipmentId, numberOfPorts, portType) => {
  const normalizedPortType = portType === 'power' ? 'power' : 'patch';
  const cableType = normalizedPortType === 'power' ? 'powerCable' : 'patchCord';
  const portsToCreate = Number(numberOfPorts);

  for (let index = 0; index < portsToCreate; index += 1) {
    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO ports (equipment_id, port_type, port_number, status, cable_type) VALUES (?, ?, ?, ?, ?)`,
        [equipmentId, normalizedPortType, index + 1, 'available', cableType],
        (err) => (err ? reject(err) : resolve())
      );
    });
  }
};

// Получаем данные стойки по ID (с оборудованием)
const getSwitchCabinetById = async (switch_cabinet_id, ownerUserId) => {
  const cabinet = await new Promise((resolve, reject) => {
    db.get(`SELECT * FROM switch_cabinets WHERE id = ? AND owner_user_id = ?`, [switch_cabinet_id, ownerUserId], (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });

  if (!cabinet) return null;

  const equipment = await new Promise((resolve, reject) => {
    db.all(
      `SELECT id, name, type, model, serial, status, weight, energy_consumption,
              COALESCE(rack_unit_size, 1) AS unit_size,
              rack_start_unit AS startUnit
       FROM assets
       WHERE switch_cabinet_id = ? AND owner_user_id = ?`,
      [switch_cabinet_id, ownerUserId],
      (err, rows) => (err ? reject(err) : resolve(rows))
    );
  });

  return { ...cabinet, equipment: equipment ?? [] };
};



export const removeFromSwitchCabinet = async (req, res) => {
  const equipment_id = Number(req.body.equipment_id);

  if (!Number.isInteger(equipment_id) || equipment_id <= 0) {
    return res.status(400).json({ error: 'equipment_id должен быть числом > 0' });
  }

  try {
    // Проверяем, что оборудование существует и размещено
    const row = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id, switch_cabinet_id FROM assets WHERE id = ? AND owner_user_id = ?`,
        [equipment_id, getOwnerUserId(req)],
        (err, row) => (err ? reject(err) : resolve(row))
      );
    });

    if (!row) {
      return res.status(404).json({ error: 'Оборудование не найдено' });
    }

    if (row.switch_cabinet_id === null || row.switch_cabinet_id === undefined) {
      return res.status(409).json({ error: 'Оборудование не размещено в стойке' });
    }

    const changes = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE assets
         SET switch_cabinet_id = NULL,
             rack_start_unit = NULL,
             rack_unit_size = NULL
         WHERE id = ? AND owner_user_id = ?`,
        [equipment_id, getOwnerUserId(req)],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    });

    if (changes === 0) {
      return res.status(404).json({ error: 'Оборудование не найдено' });
    }

    logger.info(`Equipment ID: ${equipment_id} removed from Switch Cabinet`);
    return res.status(200).json({ message: 'Оборудование убрано из стойки', equipment_id });

  } catch (error) {
    logger.error(`Error: Failed to remove equipment from Switch Cabinet. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

const findPlacementConflict = async ({ switch_cabinet_id, ownerUserId, equipment_id, start_unit, endUnit }) => {
  const conflict = await new Promise((resolve, reject) => {
    db.get(
      `SELECT id
       FROM assets
       WHERE switch_cabinet_id = ?
         AND owner_user_id = ?
         AND id <> ?
         AND rack_start_unit IS NOT NULL
         AND rack_start_unit <= ?
         AND (rack_start_unit + COALESCE(rack_unit_size, 1) - 1) >= ?
       LIMIT 1`,
      [switch_cabinet_id, ownerUserId, equipment_id, endUnit, start_unit],
      (err, row) => (err ? reject(err) : resolve(row ?? null))
    );
  });

  return conflict;
};

// Создание оборудования (assets + типовые таблицы) с транзакцией
export const createEquipment = async (req, res) => {
  const { name, type, model, serial, status, serverData, patchPanelData } = req.body;

  // Базовые обязательные поля
  const missingBaseFields = [];
  if (!name) missingBaseFields.push('name');
  if (!type) missingBaseFields.push('type');
  if (!model) missingBaseFields.push('model');
  if (!serial) missingBaseFields.push('serial');
  if (!status) missingBaseFields.push('status');

  if (missingBaseFields.length) {
    return res.status(400).json({
      error: 'Не заполнены обязательные поля',
      missing_fields: missingBaseFields
    });
  }

  // Валидация типовых данных ДО вставки в assets
  if (type === 'server') {
    if (!serverData) {
      return res.status(400).json({
        error: 'Для type=server необходимо передать serverData',
        expected_fields: ['ip_address', 'memory_slots', 'cpu', 'os', 'number_of_ports', 'port_type']
      });
    }

    const { ip_address, memory_slots, cpu, os, number_of_ports, port_type } = serverData;
    const missingServerFields = [];
    if (!ip_address) missingServerFields.push('ip_address');
    if (memory_slots === undefined) missingServerFields.push('memory_slots');
    if (!cpu) missingServerFields.push('cpu');
    if (!os) missingServerFields.push('os');
    if (number_of_ports === undefined) missingServerFields.push('number_of_ports');
    if (!port_type) missingServerFields.push('port_type');

    if (missingServerFields.length) {
      return res.status(400).json({
        error: 'serverData заполнен не полностью',
        missing_fields: missingServerFields
      });
    }

    if (!Number.isFinite(Number(number_of_ports)) || Number(number_of_ports) <= 0) {
      return res.status(400).json({ error: 'serverData.number_of_ports должен быть числом больше 0' });
    }

    if (!['patch', 'power'].includes(port_type)) {
      return res.status(400).json({ error: 'serverData.port_type должен быть patch или power' });
    }
  } else if (type === 'patchPanel') {
    if (!patchPanelData) {
      return res.status(400).json({
        error: 'Для type=patchPanel необходимо передать patchPanelData',
        expected_fields: ['number_of_ports', 'port_type']
      });
    }

    const { number_of_ports, port_type } = patchPanelData;
    const missingPatchPanelFields = [];
    if (number_of_ports === undefined) missingPatchPanelFields.push('number_of_ports');
    if (!port_type) missingPatchPanelFields.push('port_type');

    if (missingPatchPanelFields.length) {
      return res.status(400).json({
        error: 'patchPanelData заполнен не полностью',
        missing_fields: missingPatchPanelFields
      });
    }

    if (!Number.isFinite(Number(number_of_ports)) || Number(number_of_ports) <= 0) {
      return res.status(400).json({ error: 'patchPanelData.number_of_ports должен быть числом больше 0' });
    }

    if (!['patch', 'power'].includes(port_type)) {
      return res.status(400).json({ error: 'patchPanelData.port_type должен быть patch или power' });
    }
  } else {
    return res.status(400).json({
      error: 'Неизвестный тип оборудования',
      allowed_types: ['server', 'patchPanel']
    });
  }

  try {
    await new Promise((resolve, reject) =>
      db.run('BEGIN TRANSACTION', (e) => (e ? reject(e) : resolve()))
    );

    const assetId = await new Promise((resolve, reject) => {
      const q = `INSERT INTO assets (name, type, model, serial, status, owner_user_id) VALUES (?, ?, ?, ?, ?, ?)`;
      const ownerUserId = getOwnerUserId(req);
      db.run(q, [name, type, model, serial, status, ownerUserId], function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      });
    });

    logger.info(`Success: Equipment created with ID: ${assetId}, Name: ${name}, Type: ${type}`);

    if (type === 'server') {
      const { ip_address, memory_slots, cpu, os, number_of_ports, port_type } = serverData;
      await new Promise((resolve, reject) => {
        const q = `INSERT INTO servers (asset_id, ip_address, memory_slots, cpu, os) VALUES (?, ?, ?, ?, ?)`;
        db.run(q, [assetId, ip_address, memory_slots, cpu, os], (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      await createPortsForAsset(assetId, number_of_ports, port_type);
      logger.info(`Server data created for Equipment ID: ${assetId}`);
    }

    if (type === 'patchPanel') {
      const { number_of_ports, port_type } = patchPanelData;
      await new Promise((resolve, reject) => {
        const q = `INSERT INTO patch_panels (asset_id, number_of_ports, port_type) VALUES (?, ?, ?)`;
        db.run(q, [assetId, number_of_ports, port_type], (err) => {
          if (err) return reject(err);
          resolve();
        });
      });
      await createPortsForAsset(assetId, number_of_ports, port_type);
      logger.info(`Patch panel data created for Equipment ID: ${assetId}`);
    }

    await new Promise((resolve, reject) =>
      db.run('COMMIT', (e) => (e ? reject(e) : resolve()))
    );

    return res.status(201).json({
      message: 'Оборудование успешно создано',
      id: assetId
    });

  } catch (error) {
    try {
      await new Promise((resolve) => db.run('ROLLBACK', () => resolve()));
    } catch (_) {}

    logger.error(`Error: Failed to create equipment. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};


export const getEquipmentById = async (req, res) => {
  const { id } = req.params;

  const ownerUserId = getOwnerUserId(req);
  const query = `SELECT * FROM assets WHERE id = ? AND owner_user_id = ?`;
  try {
    const row = await new Promise((resolve, reject) => {
      db.get(query, [id, ownerUserId], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!row) {
      return res.status(404).json({ error: 'Оборудование не найдено' });
    }

    return res.status(200).json(row);
  } catch (error) {
    logger.error(`Error: Failed to fetch equipment by ID. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};


// Получение списка оборудования с использованием async/await
export const getEquipment = async (req, res) => {
    const ownerUserId = getOwnerUserId(req);
    const query = 'SELECT * FROM assets WHERE owner_user_id = ?';

    try {
        const rows = await new Promise((resolve, reject) => {
            db.all(query, [ownerUserId], (err, rows) => {
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });

        logger.info(`Success: Fetched ${rows.length} equipment`);
        res.json(rows);
    } catch (error) {
        logger.error(`Error: Failed to fetch equipment. Error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
};

// Получение оборудования по статусу
export const getEquipmentByStatus = async (req, res) => {
    const { status } = req.params;
    const ownerUserId = getOwnerUserId(req);
    const query = 'SELECT * FROM assets WHERE status = ? AND owner_user_id = ?';
    
    try {
        const rows = await new Promise((resolve, reject) => {
            db.all(query, [status, ownerUserId], (err, rows) => {
                if (err) {
                    return reject(err);
                }
                resolve(rows);
            });
        });

        logger.info(`Success: Fetched ${rows.length} equipment with status: ${status}`);
        res.json(rows);
    } catch (error) {
        logger.error(`Error: Failed to fetch equipment by status. Error: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
};


export const updateEquipment = async (req, res) => {
  const { id } = req.params;
  const { name, status } = req.body;

  if (!name || !status) {
    return res.status(400).json({ error: 'name и status обязательны' });
  }

  try {
    const query = `UPDATE assets SET name = ?, status = ? WHERE id = ? AND owner_user_id = ?`;
    const result = await new Promise((resolve, reject) => {
      db.run(query, [name, status, id, getOwnerUserId(req)], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });

    if (result === 0) {
      return res.status(404).json({ error: 'Оборудование не найдено' });
    }

    logger.info(`Success: Equipment with ID: ${id} updated`);
    return res.status(200).json({ message: 'Оборудование успешно обновлено' });
  } catch (error) {
    logger.error(`Error: Failed to update equipment. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};


// Удаление оборудования
export const deleteEquipment = (req, res) => {
    const { id } = req.params;

    const query = `DELETE FROM assets WHERE id = ? AND owner_user_id = ?`;
    db.run(query, [id, getOwnerUserId(req)], function (err) {
        if (err) {
            logger.error(`Error: Failed to delete equipment with ID: ${id}. Error: ${err.message}`);
            return res.status(500).json({ error: 'Database error' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Оборудование не найдено' });
        }

        logger.info(`Success: Equipment with ID: ${id} deleted`);
        res.status(200).json({ message: `Оборудование с ID ${id} удалено` });
    });
};



//Создание UPS
export const createUps = async (req, res) => {
  const { name, status, upsData } = req.body;

  if (!name || !status || !upsData) {
    return res.status(400).json({ error: 'Все обязательные поля должны быть заполнены' });
  }

  const { capacity, battery_life } = upsData;
  if (capacity === undefined || battery_life === undefined) {
    return res.status(400).json({ error: 'upsData.capacity и upsData.battery_life обязательны' });
  }

  try {
    const model = 'UPS';
    const serial = `UPS-${Date.now()}`; // уникальный серийный номер

    // Начинаем транзакцию
    await new Promise((resolve, reject) => db.run('BEGIN TRANSACTION', (e) => e ? reject(e) : resolve()));

    // Добавляем ИБП в таблицу assets
    const query = `INSERT INTO assets (name, type, model, serial, status, owner_user_id) VALUES (?, ?, ?, ?, ?, ?)`;
    const ownerUserId = getOwnerUserId(req);
    const result = await new Promise((resolve, reject) => {
      db.run(query, [name, 'ups', model, serial, status, ownerUserId], function (err) {
        if (err) return reject(err);
        resolve(this.lastID);
      });
    });

    logger.info(`Success: UPS created with ID: ${result}, Name: ${name}, Status: ${status}`);

    // Добавляем данные ИБП в таблицу ups
    const upsQuery = `INSERT INTO ups (asset_id, capacity, battery_life, status) VALUES (?, ?, ?, ?)`;
    await new Promise((resolve, reject) => {
      db.run(upsQuery, [result, capacity, battery_life, status], (err) => {
        if (err) return reject(err);
        resolve();
      });
    });

    // Создаём порты для ИБП (3 порта питания и 3 порта для патч кабелей)
    await createPortsForUps(result);

    // Завершаем транзакцию
    await new Promise((resolve, reject) => db.run('COMMIT', (e) => e ? reject(e) : resolve()));

    logger.info(`UPS data created for Equipment ID: ${result}`);
    return res.status(201).json({ message: 'ИБП успешно создано', id: result });

  } catch (error) {
    // Если транзакция стартовала, откатываем изменения
    try { await new Promise((resolve) => db.run('ROLLBACK', () => resolve())); } catch (_) {}
    logger.error(`Error: Failed to create UPS. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

//Получение портов ИБП
export const getPortsForUps = async (req, res) => {
  const { equipment_id } = req.query;

  if (!equipment_id) {
    return res.status(400).json({ error: 'Не указан equipment_id' });
  }

  try {
    const equipment = await new Promise((resolve, reject) => {
      db.get(`SELECT id FROM assets WHERE id = ? AND type = 'ups' AND owner_user_id = ?`, [equipment_id, getOwnerUserId(req)], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    if (!equipment) {
      return res.status(404).json({ error: 'ИБП не найдено' });
    }

    const query = `
      SELECT id, equipment_id, port_type, port_number, status, cable_type
      FROM ports
      WHERE equipment_id = ?
    `;

    const ports = await new Promise((resolve, reject) => {
      db.all(query, [equipment_id], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    if (!ports.length) {
      return res.status(404).json({ error: 'Порты для указанного ИБП не найдены' });
    }

    return res.status(200).json(ports);
  } catch (error) {
    logger.error(`Error: Failed to fetch ports for UPS with equipment_id: ${equipment_id}. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

//Созданеи портов UPS
const createPortsForUps = async (ups_id) => {
  const portData = [];

  // Добавляем 3 порта для питания (power) для ИБП
  for (let i = 1; i <= 3; i++) {
    portData.push([ups_id, 'power', i, 'available', 'powerCable']);  // Порты питания
    portData.push([ups_id, 'patch', i, 'available', 'patchCord']);   // Порты патч-кордов
  }

  const query = `
    INSERT INTO ports (equipment_id, port_type, port_number, status, cable_type)
    VALUES (?, ?, ?, ?, ?)
  `;

  for (let port of portData) {
    await new Promise((resolve, reject) => {
      db.run(query, port, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }
};


export const getUpsById = async (req, res) => {
  const { id } = req.params;
  const ownerUserId = getOwnerUserId(req);

  const query = `
    SELECT 
      a.id as asset_id, a.name, a.type, a.model, a.serial, a.status as asset_status,
      u.id as ups_id, u.capacity, u.battery_life, u.status as ups_status
    FROM assets a
    JOIN ups u ON u.asset_id = a.id
    WHERE a.id = ? AND a.type = 'ups' AND a.owner_user_id = ?
  `;

  db.get(query, [id, ownerUserId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: 'UPS not found' });

    return res.status(200).json({
      id: row.asset_id,
      name: row.name,
      status: row.asset_status,
      upsData: {
        ups_id: row.ups_id,
        capacity: row.capacity,
        battery_life: row.battery_life,
        status: row.ups_status
      }
    });
  });
};

export const updateUps = async (req, res) => {
  const { id } = req.params; // asset_id
  const { name, status, upsData } = req.body;

  if (!name || !status || !upsData) {
    return res.status(400).json({ error: 'name, status и upsData обязательны' });
  }
  const { capacity, battery_life } = upsData;
  if (capacity === undefined || battery_life === undefined) {
    return res.status(400).json({ error: 'upsData.capacity и upsData.battery_life обязательны' });
  }

  try {
    await new Promise((resolve, reject) => db.run('BEGIN TRANSACTION', (e) => e ? reject(e) : resolve()));

    const aChanges = await new Promise((resolve, reject) => {
      db.run(
        `UPDATE assets SET name = ?, status = ? WHERE id = ? AND type = 'ups' AND owner_user_id = ?`,
        [name, status, id, getOwnerUserId(req)],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    });

    if (aChanges === 0) {
      await new Promise((resolve) => db.run('ROLLBACK', () => resolve()));
      return res.status(404).json({ error: 'UPS not found' });
    }

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE ups SET capacity = ?, battery_life = ?, status = ? WHERE asset_id = ?`,
        [capacity, battery_life, status, id],
        function (err) {
          if (err) return reject(err);
          resolve(this.changes);
        }
      );
    });

    await new Promise((resolve, reject) => db.run('COMMIT', (e) => e ? reject(e) : resolve()));

    return res.status(200).json({ message: 'UPS updated', id: Number(id) });

  } catch (error) {
    try { await new Promise((resolve) => db.run('ROLLBACK', () => resolve())); } catch (_) {}
    return res.status(500).json({ error: error.message });
  }
};

export const deleteUps = async (req, res) => {
  const { id } = req.params; // asset_id

  try {
    await new Promise((resolve, reject) => db.run('BEGIN TRANSACTION', (e) => e ? reject(e) : resolve()));

    const uChanges = await new Promise((resolve, reject) => {
      db.run(`DELETE FROM ups WHERE asset_id = ?`, [id], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });

    if (uChanges === 0) {
      await new Promise((resolve) => db.run('ROLLBACK', () => resolve()));
      return res.status(404).json({ error: 'UPS not found' });
    }

    await new Promise((resolve, reject) => {
      db.run(`DELETE FROM assets WHERE id = ? AND type = 'ups' AND owner_user_id = ?`, [id, getOwnerUserId(req)], function (err) {
        if (err) return reject(err);
        resolve(this.changes);
      });
    });

    await new Promise((resolve, reject) => db.run('COMMIT', (e) => e ? reject(e) : resolve()));

    return res.status(200).json({ message: 'UPS deleted', id: Number(id) });

  } catch (error) {
    try { await new Promise((resolve) => db.run('ROLLBACK', () => resolve())); } catch (_) {}
    return res.status(500).json({ error: error.message });
  }
};

export const getEquipmentStatusReport = async (req, res) => {
  try {
    const ownerUserId = getOwnerUserId(req);
    const query = `
      SELECT 
        type, 
        COUNT(*) AS total_count, 
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active_count,
        SUM(CASE WHEN status = 'inactive' THEN 1 ELSE 0 END) AS inactive_count,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance_count
      FROM assets
      WHERE owner_user_id = ?
      GROUP BY type;
    `;
    const rows = await new Promise((resolve, reject) => {
      db.all(query, [ownerUserId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    res.status(200).json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
export const getSwitchCabinetsReport = async (req, res) => {
  try {
    const ownerUserId = getOwnerUserId(req);
    const query = `
      SELECT
        sc.id,
        sc.name,
        sc.serial_number,
        sc.zone_id,
        z.name AS zone_name,
        sc.employee,
        sc.weight AS weight_limit,
        sc.energy_limit,
        COUNT(a.id) AS equipment_count,
        COALESCE(SUM(COALESCE(a.weight, 0)), 0) AS current_weight,
        COALESCE(SUM(COALESCE(a.energy_consumption, 0)), 0) AS current_energy_consumption,
        CASE
          WHEN sc.weight IS NOT NULL AND sc.weight > 0
            THEN ROUND(COALESCE(SUM(COALESCE(a.weight, 0)), 0) * 100.0 / sc.weight, 2)
          ELSE 0
        END AS weight_load_percent,
        CASE
          WHEN sc.energy_limit IS NOT NULL AND sc.energy_limit > 0
            THEN ROUND(COALESCE(SUM(COALESCE(a.energy_consumption, 0)), 0) * 100.0 / sc.energy_limit, 2)
          ELSE 0
        END AS energy_load_percent,
        CASE
          WHEN sc.weight IS NOT NULL
               AND sc.weight > 0
               AND COALESCE(SUM(COALESCE(a.weight, 0)), 0) > sc.weight
            THEN 1
          ELSE 0
        END AS is_weight_overloaded,
        CASE
          WHEN sc.energy_limit IS NOT NULL
               AND sc.energy_limit > 0
               AND COALESCE(SUM(COALESCE(a.energy_consumption, 0)), 0) > sc.energy_limit
            THEN 1
          ELSE 0
        END AS is_energy_overloaded
      FROM switch_cabinets sc
      LEFT JOIN assets a ON a.switch_cabinet_id = sc.id AND a.owner_user_id = sc.owner_user_id
      LEFT JOIN zones z ON z.id = sc.zone_id AND z.owner_user_id = sc.owner_user_id
      WHERE sc.owner_user_id = ?
      GROUP BY sc.id, sc.name, sc.serial_number, sc.zone_id, z.name, sc.employee, sc.weight, sc.energy_limit
      ORDER BY sc.id;
    `;

    const rows = await new Promise((resolve, reject) => {
      db.all(query, [ownerUserId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    return res.status(200).json(rows);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
export const getZonesReport = async (req, res) => {
  try {
    const ownerUserId = getOwnerUserId(req);
    const query = `
      SELECT
        z.id,
        z.name,
        z.description,
        z.address,
        z.phone,
        z.employee,
        z.site,
        COUNT(DISTINCT sc.id) AS switch_cabinet_count,
        COUNT(a.id) AS equipment_count,
        COALESCE(SUM(COALESCE(a.weight, 0)), 0) AS total_equipment_weight,
        COALESCE(SUM(COALESCE(a.energy_consumption, 0)), 0) AS total_energy_consumption,
        SUM(CASE WHEN a.status = 'active' THEN 1 ELSE 0 END) AS active_equipment_count,
        SUM(CASE WHEN a.status = 'inactive' THEN 1 ELSE 0 END) AS inactive_equipment_count,
        SUM(CASE WHEN a.status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance_equipment_count
      FROM zones z
      LEFT JOIN switch_cabinets sc ON sc.zone_id = z.id AND sc.owner_user_id = z.owner_user_id
      LEFT JOIN assets a ON a.switch_cabinet_id = sc.id AND a.owner_user_id = z.owner_user_id
      WHERE z.owner_user_id = ?
      GROUP BY z.id, z.name, z.description, z.address, z.phone, z.employee, z.site
      ORDER BY z.id;
    `;

    const rows = await new Promise((resolve, reject) => {
      db.all(query, [ownerUserId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    return res.status(200).json(rows);
  } catch (error) {
    logger.error(`Error: Failed to fetch zones report. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};

export const getZoneLoadReport = async (req, res) => {
  try {
    const ownerUserId = getOwnerUserId(req);
    const query = `
      SELECT
        z.id,
        z.name AS zone_name,
        COUNT(DISTINCT sc.id) AS switch_cabinet_count,
        COUNT(a.id) AS equipment_count,
        COALESCE(SUM(COALESCE(sc.weight, 0)), 0) AS total_weight_limit,
        COALESCE(SUM(COALESCE(a.weight, 0)), 0) AS current_weight,
        COALESCE(SUM(COALESCE(sc.energy_limit, 0)), 0) AS total_energy_limit,
        COALESCE(SUM(COALESCE(a.energy_consumption, 0)), 0) AS current_energy_consumption,
        CASE
          WHEN COALESCE(SUM(COALESCE(sc.weight, 0)), 0) > 0
            THEN ROUND(COALESCE(SUM(COALESCE(a.weight, 0)), 0) * 100.0 / COALESCE(SUM(COALESCE(sc.weight, 0)), 0), 2)
          ELSE 0
        END AS weight_load_percent,
        CASE
          WHEN COALESCE(SUM(COALESCE(sc.energy_limit, 0)), 0) > 0
            THEN ROUND(COALESCE(SUM(COALESCE(a.energy_consumption, 0)), 0) * 100.0 / COALESCE(SUM(COALESCE(sc.energy_limit, 0)), 0), 2)
          ELSE 0
        END AS energy_load_percent,
        COUNT(DISTINCT CASE
          WHEN sc.weight IS NOT NULL
               AND sc.weight > 0
               AND (
                 SELECT COALESCE(SUM(COALESCE(a2.weight, 0)), 0)
                 FROM assets a2
                 WHERE a2.switch_cabinet_id = sc.id AND a2.owner_user_id = z.owner_user_id
               ) > sc.weight
          THEN sc.id
        END) AS overloaded_by_weight_cabinets,
        COUNT(DISTINCT CASE
          WHEN sc.energy_limit IS NOT NULL
               AND sc.energy_limit > 0
               AND (
                 SELECT COALESCE(SUM(COALESCE(a3.energy_consumption, 0)), 0)
                 FROM assets a3
                 WHERE a3.switch_cabinet_id = sc.id AND a3.owner_user_id = z.owner_user_id
               ) > sc.energy_limit
          THEN sc.id
        END) AS overloaded_by_energy_cabinets
      FROM zones z
      LEFT JOIN switch_cabinets sc ON sc.zone_id = z.id AND sc.owner_user_id = z.owner_user_id
      LEFT JOIN assets a ON a.switch_cabinet_id = sc.id AND a.owner_user_id = z.owner_user_id
      WHERE z.owner_user_id = ?
      GROUP BY z.id, z.name
      ORDER BY z.id;
    `;

    const rows = await new Promise((resolve, reject) => {
      db.all(query, [ownerUserId], (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
    });

    return res.status(200).json(rows);
  } catch (error) {
    logger.error(`Error: Failed to fetch zone load report. Error: ${error.message}`);
    return res.status(500).json({ error: error.message });
  }
};
