const pool = require('./pool');

const ensureSchemaCompatibility = async () => {
    // Compatibility migration for existing databases created before session_version changes.
    await pool.query(`
    ALTER TABLE customer
    ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;
  `);

    await pool.query(`
    ALTER TABLE employee
    ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;
  `);

    await pool.query(`
    ALTER TABLE admin_user
    ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 1;
  `);

    await pool.query(`
    ALTER TABLE customer
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `);

    await pool.query(`
    ALTER TABLE employee
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `);

    await pool.query(`
    ALTER TABLE admin_user
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
  `);
};

module.exports = { ensureSchemaCompatibility };
