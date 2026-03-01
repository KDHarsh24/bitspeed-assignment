const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 5,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

async function initDb() {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    console.log('MySQL connected');

    await conn.query(`
      CREATE TABLE IF NOT EXISTS Contact (
        id             INT AUTO_INCREMENT PRIMARY KEY,
        phoneNumber    VARCHAR(20)  DEFAULT NULL,
        email          VARCHAR(255) DEFAULT NULL,
        linkedId       INT          DEFAULT NULL,
        linkPrecedence ENUM('primary', 'secondary') NOT NULL DEFAULT 'primary',
        createdAt      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deletedAt      DATETIME     DEFAULT NULL,
        FOREIGN KEY (linkedId) REFERENCES Contact(id) ON DELETE SET NULL
      )
    `);
    console.log('Schema ready');
  } finally {
    conn.release();
  }
}

module.exports = { pool, initDb };
