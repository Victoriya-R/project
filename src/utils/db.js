import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';

const { Database } = sqlite3;
const db = new Database('database.db', (err) => {
  if (err) {
    console.error('Error opening database', err);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

const run = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function (err) {
    if (err) return reject(err);
    return resolve(this);
  });
});

const get = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row ?? null)));
});

const all = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
});

const ensureColumn = async (tableName, columnName, definition) => {
  const columns = await all(`PRAGMA table_info(${tableName})`);

  if (!columns.some((column) => column.name === columnName)) {
    await run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`);
  }
};

const createAssetsTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      model TEXT NOT NULL,
      serial TEXT NOT NULL,
      status TEXT NOT NULL,
      switch_cabinet_id INTEGER,
      rack_start_unit INTEGER,
      rack_unit_size INTEGER DEFAULT 1,
      weight INTEGER,
      energy_consumption INTEGER,
      owner_user_id INTEGER
    )
  `);
};

const createZonesTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      address TEXT,
      phone TEXT,
      employee TEXT,
      site TEXT,
      owner_user_id INTEGER
    )
  `);
};

const createSwitchCabinetsTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS switch_cabinets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      weight INTEGER NOT NULL,
      energy_consumption INTEGER NOT NULL DEFAULT 0,
      energy_limit INTEGER NOT NULL,
      employee TEXT,
      zone_id INTEGER,
      description TEXT,
      isDataCenterEquipment INTEGER DEFAULT 1,
      serial_number TEXT NOT NULL,
      unit_capacity INTEGER NOT NULL DEFAULT 42,
      owner_user_id INTEGER
    )
  `);
};

const createUpsTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS ups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL UNIQUE,
      capacity INTEGER NOT NULL,
      battery_life INTEGER NOT NULL,
      status TEXT NOT NULL,
      FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);
};

const createPortsTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS ports (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      port_type TEXT NOT NULL,
      port_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      cable_type TEXT NOT NULL,
      FOREIGN KEY(equipment_id) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);
};

const createCablesTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS cables (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      length INTEGER NOT NULL,
      status TEXT NOT NULL,
      equipment_type_allowed TEXT NOT NULL,
      owner_user_id INTEGER
    )
  `);
};


const createFloorPlansTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS floorplans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      zone_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      width REAL NOT NULL DEFAULT 12,
      depth REAL NOT NULL DEFAULT 8,
      height REAL NOT NULL DEFAULT 3,
      panel_size_x REAL NOT NULL DEFAULT 0.6,
      panel_size_y REAL NOT NULL DEFAULT 0.6,
      scale REAL NOT NULL DEFAULT 1,
      grid_enabled INTEGER NOT NULL DEFAULT 1,
      axis_x_label TEXT NOT NULL DEFAULT 'X',
      axis_y_label TEXT NOT NULL DEFAULT 'Y',
      background_image_url TEXT,
      camera_json TEXT,
      owner_user_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(zone_id) REFERENCES zones(id) ON DELETE CASCADE
    )
  `);
};

const createFloorPlanRacksTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS floorplan_racks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      floorplan_id INTEGER NOT NULL,
      switch_cabinet_id INTEGER,
      name TEXT NOT NULL,
      x REAL NOT NULL DEFAULT 0,
      y REAL NOT NULL DEFAULT 0,
      z REAL NOT NULL DEFAULT 0,
      rotation_y REAL NOT NULL DEFAULT 0,
      width REAL NOT NULL DEFAULT 0.6,
      depth REAL NOT NULL DEFAULT 1,
      height REAL NOT NULL DEFAULT 2,
      unit_capacity INTEGER NOT NULL DEFAULT 42,
      equipment_json TEXT,
      owner_user_id INTEGER,
      FOREIGN KEY(floorplan_id) REFERENCES floorplans(id) ON DELETE CASCADE,
      FOREIGN KEY(switch_cabinet_id) REFERENCES switch_cabinets(id) ON DELETE SET NULL
    )
  `);
};

const createConnectionsTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS connections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cable_id INTEGER NOT NULL,
      a_port_id INTEGER NOT NULL,
      b_port_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      owner_user_id INTEGER,
      FOREIGN KEY(cable_id) REFERENCES cables(id) ON DELETE CASCADE,
      FOREIGN KEY(a_port_id) REFERENCES ports(id) ON DELETE CASCADE,
      FOREIGN KEY(b_port_id) REFERENCES ports(id) ON DELETE CASCADE
    )
  `);
};

const createAlertsTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      severity TEXT NOT NULL CHECK(severity IN ('info', 'warning', 'critical')),
      source_type TEXT NOT NULL CHECK(source_type IN ('rack', 'equipment', 'cable', 'connection', 'ups', 'zone')),
      source_id INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new', 'acknowledged', 'resolved', 'muted')),
      rule_code TEXT,
      owner_user_id INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT
    )
  `);
};


const createNotificationsTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      entity_type TEXT CHECK(entity_type IN ('alert', 'incident')),
      entity_id INTEGER,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      read_at TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
};

const createNotificationSettingsTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS notification_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL UNIQUE,
      in_app_enabled INTEGER NOT NULL DEFAULT 1,
      alert_created_enabled INTEGER NOT NULL DEFAULT 1,
      incident_created_enabled INTEGER NOT NULL DEFAULT 1,
      incident_status_changed_enabled INTEGER NOT NULL DEFAULT 1,
      incident_assigned_enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
};

const createIncidentsTable = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high', 'critical')),
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open', 'in_progress', 'resolved', 'closed')),
      alert_id INTEGER,
      assignee_user_id INTEGER,
      owner_user_id INTEGER NOT NULL,
      resolution_comment TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      resolved_at TEXT,
      FOREIGN KEY(alert_id) REFERENCES alerts(id) ON DELETE SET NULL,
      FOREIGN KEY(assignee_user_id) REFERENCES users(id) ON DELETE SET NULL,
      FOREIGN KEY(owner_user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
};

const rebuildPortsTableIfNeeded = async () => {
  const columns = await all(`PRAGMA table_info(ports)`);
  const hasPrimaryKey = columns.some((column) => column.name === 'id' && Number(column.pk) === 1);

  if (hasPrimaryKey) {
    return;
  }

  await run(`
    CREATE TABLE IF NOT EXISTS ports__migration (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      equipment_id INTEGER NOT NULL,
      port_type TEXT NOT NULL,
      port_number INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'available',
      cable_type TEXT NOT NULL,
      FOREIGN KEY(equipment_id) REFERENCES assets(id) ON DELETE CASCADE
    )
  `);

  await run(`
    INSERT INTO ports__migration (id, equipment_id, port_type, port_number, status, cable_type)
    SELECT
      COALESCE(NULLIF(id, ''), rowid),
      equipment_id,
      port_type,
      port_number,
      COALESCE(status, 'available'),
      cable_type
    FROM ports
  `);

  await run(`DROP TABLE ports`);
  await run(`ALTER TABLE ports__migration RENAME TO ports`);
};

const createUniqueIndexIfMissing = async (indexName, tableName, columns) => {
  const existing = await get(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?`, [indexName]);

  if (!existing) {
    await run(`CREATE UNIQUE INDEX ${indexName} ON ${tableName} (${columns})`);
  }
};

const createIndexIfMissing = async (indexName, tableName, columns) => {
  const existing = await get(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?`, [indexName]);

  if (!existing) {
    await run(`CREATE INDEX ${indexName} ON ${tableName} (${columns})`);
  }
};

const pickCanonicalUser = (users) => users
  .slice()
  .sort((left, right) => {
    const superuserDelta = Number(right.is_superuser ?? 0) - Number(left.is_superuser ?? 0);
    if (superuserDelta !== 0) {
      return superuserDelta;
    }

    return Number(left.id) - Number(right.id);
  })[0] ?? null;

const removeDuplicateUsersByField = async (fieldName) => {
  const duplicates = await all(
    `SELECT ${fieldName} AS field_value
     FROM users
     WHERE ${fieldName} IS NOT NULL AND TRIM(${fieldName}) <> ''
     GROUP BY LOWER(TRIM(${fieldName}))
     HAVING COUNT(*) > 1`
  );

  for (const duplicate of duplicates) {
    const users = await all(
      `SELECT id, username, email, COALESCE(is_superuser, 0) AS is_superuser
       FROM users
       WHERE LOWER(TRIM(${fieldName})) = LOWER(TRIM(?))
       ORDER BY COALESCE(is_superuser, 0) DESC, id ASC`,
      [duplicate.field_value]
    );

    const canonicalUser = pickCanonicalUser(users);
    const redundantUsers = users.filter((user) => user.id !== canonicalUser?.id);

    for (const user of redundantUsers) {
      await run('DELETE FROM users WHERE id = ?', [user.id]);
    }
  }
};

const normalizeSeedUsers = async () => {
  await run(
    `UPDATE users
     SET email = username || '@local.dcim'
     WHERE email IS NULL OR TRIM(email) = ''`
  );

  await removeDuplicateUsersByField('username');
  await removeDuplicateUsersByField('email');
};

const ensureBaseSchema = async () => {
  await run(`CREATE TABLE IF NOT EXISTS roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )`);

  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    email TEXT NOT NULL,
    role_id INTEGER NOT NULL,
    is_superuser INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(role_id) REFERENCES roles(id)
  )`);

  await createAssetsTable();
  await createZonesTable();
  await createSwitchCabinetsTable();
  await createUpsTable();
  await createPortsTable();
  await createCablesTable();
  await createConnectionsTable();
  await createFloorPlansTable();
  await createFloorPlanRacksTable();
  await createAlertsTable();
  await createIncidentsTable();
  await createNotificationsTable();
  await createNotificationSettingsTable();
  await rebuildPortsTableIfNeeded();

  await ensureColumn('users', 'is_superuser', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('assets', 'owner_user_id', 'INTEGER');
  await ensureColumn('assets', 'rack_start_unit', 'INTEGER');
  await ensureColumn('assets', 'rack_unit_size', 'INTEGER DEFAULT 1');
  await ensureColumn('zones', 'owner_user_id', 'INTEGER');
  await ensureColumn('switch_cabinets', 'owner_user_id', 'INTEGER');
  await ensureColumn('switch_cabinets', 'unit_capacity', 'INTEGER NOT NULL DEFAULT 42');
  await ensureColumn('cables', 'owner_user_id', 'INTEGER');
  await ensureColumn('connections', 'owner_user_id', 'INTEGER');
  await ensureColumn('connections', 'status', `TEXT NOT NULL DEFAULT 'active'`);
  await ensureColumn('floorplans', 'owner_user_id', 'INTEGER');
  await ensureColumn('floorplans', 'camera_json', 'TEXT');
  await ensureColumn('floorplans', 'created_at', `TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  await ensureColumn('floorplans', 'updated_at', `TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP`);
  await ensureColumn('floorplan_racks', 'owner_user_id', 'INTEGER');
  await ensureColumn('floorplan_racks', 'equipment_json', 'TEXT');

  await normalizeSeedUsers();
  await createUniqueIndexIfMissing('users_username_unique_idx', 'users', 'username');
  await createUniqueIndexIfMissing('users_email_unique_idx', 'users', 'email');
  await createUniqueIndexIfMissing('floorplans_zone_owner_unique_idx', 'floorplans', 'zone_id, owner_user_id');
  await createIndexIfMissing('alerts_owner_user_id_idx', 'alerts', 'owner_user_id');
  await createIndexIfMissing('alerts_status_idx', 'alerts', 'status');
  await createIndexIfMissing('alerts_severity_idx', 'alerts', 'severity');
  await createIndexIfMissing('alerts_source_type_idx', 'alerts', 'source_type');
  await createIndexIfMissing('alerts_source_id_idx', 'alerts', 'source_id');
  await createIndexIfMissing('alerts_owner_source_rule_status_idx', 'alerts', 'owner_user_id, source_type, source_id, rule_code, status');
  await createIndexIfMissing('incidents_owner_user_id_idx', 'incidents', 'owner_user_id');
  await createIndexIfMissing('incidents_status_idx', 'incidents', 'status');
  await createIndexIfMissing('incidents_priority_idx', 'incidents', 'priority');
  await createIndexIfMissing('incidents_alert_id_idx', 'incidents', 'alert_id');
  await createIndexIfMissing('incidents_assignee_user_id_idx', 'incidents', 'assignee_user_id');
  await createIndexIfMissing('notifications_user_id_idx', 'notifications', 'user_id');
  await createIndexIfMissing('notifications_is_read_idx', 'notifications', 'is_read');
  await createIndexIfMissing('notifications_type_idx', 'notifications', 'type');
  await createIndexIfMissing('notifications_created_at_idx', 'notifications', 'created_at');
  await createUniqueIndexIfMissing('notification_settings_user_id_unique_idx', 'notification_settings', 'user_id');
};

const ensureSeedData = async () => {
  await run(`INSERT OR IGNORE INTO roles (name) VALUES ('admin')`);
  await run(`INSERT OR IGNORE INTO roles (name) VALUES ('user')`);

  const adminRole = await get(`SELECT id FROM roles WHERE name = 'admin'`);
  const userRole = await get(`SELECT id FROM roles WHERE name = 'user'`);
  const adminPassword = await bcrypt.hash('12345', 10);
  const userPassword = await bcrypt.hash('12345', 10);

  await run(
    `INSERT OR IGNORE INTO users (username, password, email, role_id, is_superuser)
     VALUES (?, ?, ?, ?, 1)`,
    ['admin_1', adminPassword, 'admin_1@local.dcim', adminRole.id]
  );

  await run(
    `INSERT OR IGNORE INTO users (username, password, email, role_id, is_superuser)
     VALUES (?, ?, ?, ?, 0)`,
    ['user_1', userPassword, 'user_1@local.dcim', userRole.id]
  );

  await run(
    `UPDATE users
     SET role_id = ?, is_superuser = 1, email = ?
     WHERE username = ?`,
    [adminRole.id, 'admin_1@local.dcim', 'admin_1']
  );

  await run(
    `UPDATE users
     SET role_id = COALESCE(role_id, ?), is_superuser = 0, email = COALESCE(NULLIF(email, ''), ?)
     WHERE username = ?`,
    [userRole.id, 'user_1@local.dcim', 'user_1']
  );
};

(async () => {
  try {
    await ensureBaseSchema();
    await ensureSeedData();
  } catch (error) {
    console.error('Database bootstrap failed', error);
  }
})();

export default db;
