import db from "../config/db.js";

export async function logActivity(user_id, role, action, details) {
  try {
    let uid = user_id;

    // If no user_id provided, try to use an existing admin user as a safe fallback
    if (!uid) {
      const [rows] = await db.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
      if (rows && rows.length > 0) {
        uid = rows[0].id;
      } else {
        // No admin user found — skip logging to avoid FK/NOT NULL DB errors
        console.warn("logActivity: no user_id supplied and no admin user found; skipping activity log");
        return;
      }
    }

    await db.query(
      `INSERT INTO activity_logs (user_id, role, action, details) VALUES (?, ?, ?, ?)`,
      [uid, role, action, details]
    );
  } catch (err) {
    console.error("Activity Log Error:", err);
  }
}
