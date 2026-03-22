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
      weight INTEGER,
      energy_consumption INTEGER,
      owner_user_id INTEGER
    )
  `);
};

const createUniqueIndexIfMissing = async (indexName, tableName, columns) => {
  const existing = await get(`SELECT name FROM sqlite_master WHERE type = 'index' AND name = ?`, [indexName]);

  if (!existing) {
    await run(`CREATE UNIQUE INDEX ${indexName} ON ${tableName} (${columns})`);
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

  await ensureColumn('users', 'is_superuser', 'INTEGER NOT NULL DEFAULT 0');
  await ensureColumn('assets', 'owner_user_id', 'INTEGER');
  await ensureColumn('zones', 'owner_user_id', 'INTEGER');
  await ensureColumn('switch_cabinets', 'owner_user_id', 'INTEGER');
  await ensureColumn('cables', 'owner_user_id', 'INTEGER');
  await ensureColumn('connections', 'owner_user_id', 'INTEGER');

  await normalizeSeedUsers();
  await createUniqueIndexIfMissing('users_username_unique_idx', 'users', 'username');
  await createUniqueIndexIfMissing('users_email_unique_idx', 'users', 'email');
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
