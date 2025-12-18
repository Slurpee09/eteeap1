// config/db.js
import mysql from "mysql2/promise"; // <-- use promise version
import dotenv from "dotenv";
dotenv.config();

const db = mysql.createPool({      // <-- use pool for better handling
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "eteeap_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

db.getConnection()
  .then(() => console.log("✅ MySQL connected"))
  .catch((err) => console.error("DB connection error:", err));

export default db;
