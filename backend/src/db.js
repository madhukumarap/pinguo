const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initializeDatabase() {
  try {
    // Test PostgreSQL connection
    await pool.query("SELECT 1");

    console.log("✅ PostgreSQL connected successfully");

    // schema.sql is in the same folder as this file
    const schemaPath = path.join(__dirname, "schema.sql");

    console.log("📄 Loading schema:", schemaPath);

    // Check whether schema.sql exists
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`schema.sql not found at: ${schemaPath}`);
    }

    // Read schema.sql
    const schema = fs.readFileSync(schemaPath, "utf8");

    // Execute SQL
    await pool.query(schema);

    console.log("✅ Database tables initialized successfully");
  } catch (error) {
    console.error("❌ Database initialization failed:");
    console.error(error.message);

    process.exit(1);
  }
}

initializeDatabase();

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};