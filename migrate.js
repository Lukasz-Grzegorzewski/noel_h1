require('dotenv').config();
const mysql = require('mysql2/promise');

const createDatabaseAndTables = async () => {

  // Replace with your MySQL credentials
  const connectionConfig = {
    host: process.env.HOST_URL,
    user: process.env.USER_NAME,
    password: process.env.DB_PASSWORD,
  };

  const pool = mysql.createPool({
    database: process.env.DB_NAME,
    // waitForConnections: true,
    // connectionLimit: 10,
    // queueLimit: 0,
  });
  

  const connection = await mysql.createConnection(connectionConfig);

  try {
    // Create the database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME}`);
    await connection.query(`USE ${process.env.DB_NAME}`);

    // Create the users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) DEFAULT 'Secret Santa',
        email VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL
      )
    `);

    // Create the recordings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS recordings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        file_path VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    console.log('Database schema and tables created successfully!');
  } catch (error) {
    console.error('Error creating database schema:', error);
  } finally {
    await connection.end();
  }
};

createDatabaseAndTables();