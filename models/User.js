// models/User.js
import db from "../config/db.js";
import bcrypt from "bcrypt";

const User = {
  // -----------------------------
  // Find user by email
  // -----------------------------
  findByEmail: (email) =>
    new Promise((resolve, reject) => {
      if (!email) return resolve(null);
      db.query("SELECT * FROM users WHERE email = ?", [email], (err, results) => {
        if (err) return reject(err);
        resolve(results[0] || null);
      });
    }),

  // -----------------------------
  // Find user by ID
  // -----------------------------
  findById: (id) =>
    new Promise((resolve, reject) => {
      if (!id) return resolve(null);
      db.query("SELECT * FROM users WHERE id = ?", [id], (err, results) => {
        if (err) return reject(err);
        resolve(results[0] || null);
      });
    }),

  // -----------------------------
  // Find user by Google ID
  // -----------------------------
  findByGoogleId: (googleId) =>
    new Promise((resolve, reject) => {
      if (!googleId) return resolve(null);
      db.query(
        "SELECT * FROM users WHERE google_id = ?",
        [googleId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results[0] || null);
        }
      );
    }),

  // -----------------------------
  // Create new user
  // -----------------------------
  createUser: async ({ fullname, email, password, role = "user", googleId = null }) => {
    return new Promise(async (resolve, reject) => {
      try {
        const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

        db.query(
          "INSERT INTO users (fullname, email, password, role, google_id) VALUES (?, ?, ?, ?, ?)",
          [fullname, email, hashedPassword, role, googleId],
          (err, result) => {
            if (err) return reject(err);

            db.query("SELECT * FROM users WHERE id = ?", [result.insertId], (err2, users) => {
              if (err2) return reject(err2);
              resolve(users[0] || null);
            });
          }
        );
      } catch (err) {
        reject(err);
      }
    });
  },

  // -----------------------------
  // Update password by email
  // -----------------------------
  updatePassword: (email, newHashedPassword) =>
    new Promise((resolve, reject) => {
      if (!email || !newHashedPassword)
        return reject(new Error("Email and new password required"));

      db.query(
        "UPDATE users SET password = ? WHERE email = ?",
        [newHashedPassword, email],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    }),

  // -----------------------------
  // Update Google ID for existing user by email
  // -----------------------------
  updateGoogleId: (email, googleId) =>
    new Promise((resolve, reject) => {
      if (!email || !googleId)
        return reject(new Error("Email and Google ID are required"));

      db.query(
        "UPDATE users SET google_id = ? WHERE email = ?",
        [googleId, email],
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );
    }),
};

export default User;
