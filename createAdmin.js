import mysql from "mysql2/promise";
import bcrypt from "bcrypt";

const db = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "eteeap_db",
});

const email = "admin@eteeap.com";
const password = "Admin123!";
const fullname = "ETEEAP Admin";
const role = "admin";

const [existing] = await db.execute("SELECT * FROM users WHERE email = ?", [email]);
if (existing.length > 0) {
  console.log("Admin already exists.");
} else {
  const hashedPassword = await bcrypt.hash(password, 10);
  await db.execute(
    "INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)",
    [fullname, email, hashedPassword, role]
  );
  console.log("Admin account created!");
}

await db.end();
