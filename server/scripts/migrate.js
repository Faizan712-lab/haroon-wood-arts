const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
require("dotenv").config();

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB
    `);

    const migrationsDir = path.join(__dirname, "..", "migrations");
    const migrations = fs.readdirSync(migrationsDir)
      .filter(name => /^\d+_.+\.sql$/i.test(name))
      .sort();
    const [appliedRows] = await connection.execute("SELECT version FROM schema_migrations");
    const applied = new Set(appliedRows.map(row => row.version));

    for (const migration of migrations) {
      if (applied.has(migration)) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, migration), "utf8");
      await connection.beginTransaction();
      try {
        await connection.query(sql);
        await connection.execute("INSERT INTO schema_migrations (version) VALUES (?)", [migration]);
        await connection.commit();
        console.log(`Applied migration: ${migration}`);
      } catch (error) {
        await connection.rollback();
        throw new Error(`Migration ${migration} failed: ${error.message}`);
      }
    }
  } finally {
    await connection.end();
  }
}

run().catch(error => {
  console.error(error.message);
  process.exit(1);
});
