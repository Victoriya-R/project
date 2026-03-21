import sqlite3 from 'sqlite3';  // Импортируем sqlite3
const { Database } = sqlite3;   // Деструктурируем Database

// Подключение к базе данных на диске
const db = new Database('database.db', (err) => {
    if (err) {
        console.error('Error opening database', err);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

// Функция для создания таблицы assets
const createAssetsTable = () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS assets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            model TEXT NOT NULL,
            serial TEXT NOT NULL,
            status TEXT NOT NULL
        );
    `;

    db.run(createTableQuery, (err) => {
        if (err) {
            console.error('Error creating assets table', err);
        } else {
            console.log('Assets table created or already exists');
        }
    });
};

// Вызов функции для создания таблицы при запуске приложения
createAssetsTable();

export default db;  // Экспортируем db для использования в других файлах