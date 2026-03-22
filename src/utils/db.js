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

const ensureColumn = async (tableName, columnName, definition) => {
  const columns = await new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, [], (err, rows) => (err ? reject(err) : resolve(rows)));
  });

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
      weight INTEGER,
      energy_consumption INTEGER,
      owner_user_id INTEGER
    )
  `);
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

  await ensureColumn('users', 'is_superuser', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('assets', 'owner_user_id', 'INTEGER');
  await ensureColumn('zones', 'owner_user_id', 'INTEGER');
  await ensureColumn('switch_cabinets', 'owner_user_id', 'INTEGER');
  await ensureColumn('cables', 'owner_user_id', 'INTEGER');
  await ensureColumn('connections', 'owner_user_id', 'INTEGER');
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
