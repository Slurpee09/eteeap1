// routes/notifications.js
import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import { db } from "../server.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Ensure notification_reads table exists
const ensureNotificationReadsTable = async () => {
  try {
    await db.query(
      `CREATE TABLE IF NOT EXISTS notification_reads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        notification_key VARCHAR(255) NOT NULL,
        read_at DATETIME NOT NULL,
        UNIQUE KEY uq_user_notification (user_id, notification_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  } catch (err) {
    console.error('Could not ensure notification_reads table:', err);
  }
};

// GET /notifications
router.get("/", async (req, res) => {
  const userId = req.user?.id || req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    await ensureNotificationReadsTable();

    // 1) Get applications for user
    const [apps] = await db.query(`SELECT id FROM applications WHERE user_id = ?`, [userId]);
    const appIds = apps.map((a) => a.id);
    if (appIds.length === 0) return res.json([]);

    // 2) Fetch document remarks with application id
    const [remarks] = await db.query(
      `SELECT dr.id AS id, dr.application_id AS application_id, dr.document_name AS document_name,
              dr.remark AS message, dr.document_name AS title, dr.created_at AS date, UNIX_TIMESTAMP(dr.created_at) AS ts
       FROM document_remarks dr
       WHERE dr.application_id IN (?)
       ORDER BY dr.created_at DESC
       LIMIT 50`,
      [appIds]
    );

    // 3) Fetch application statuses (include timestamp)
    const [statuses] = await db.query(
      `SELECT id AS id, id AS application_id, CONCAT('Application Status: ', status) AS title,
              status AS message, updated_at AS date, UNIX_TIMESTAMP(updated_at) AS ts
       FROM applications
       WHERE id IN (?)
       ORDER BY updated_at DESC
       LIMIT 50`,
      [appIds]
    );

    // 4) Normalize type flags and add notification_key
    const normalizedRemarks = remarks.map((r) => ({ ...r, type: "remark", notification_key: `remark:${r.id}` }));
    const normalizedStatuses = statuses.map((s) => ({ ...s, type: "status", notification_key: `status:${s.application_id}:${s.ts}` }));

    const allNotifications = [...normalizedRemarks, ...normalizedStatuses].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    // 5) Fetch read flags for these notification keys
    const keys = allNotifications.map((n) => n.notification_key);
    let readRows = [];
    if (keys.length > 0) {
      const [rr] = await db.query(
        `SELECT notification_key FROM notification_reads WHERE user_id = ? AND notification_key IN (?)`,
        [String(userId), keys]
      );
      readRows = rr.map((r) => r.notification_key);
    }

    const final = allNotifications.map((n) => ({ ...n, read: readRows.includes(n.notification_key) }));

    res.json(final);
  } catch (err) {
    console.error("Fetch notifications error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /notifications/resubmit
// Allows a user to resubmit a single document for an existing application
router.post("/resubmit", upload.single("file"), async (req, res) => {
  const userId = req.user?.id || req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { application_id, document_name } = req.body;
  if (!application_id || !document_name) return res.status(400).json({ message: "application_id and document_name required" });
  if (!req.file) return res.status(400).json({ message: "File is required" });

  try {
    // Save path and update applications table column
    const filePath = req.file.path.replace(/\\/g, "/");

    // Ensure document_name is a valid column (basic whitelist)
    const allowed = [
      "letter_of_intent",
      "resume",
      "picture",
      "application_form",
      "recommendation_letter",
      "school_credentials",
      "high_school_diploma",
      "transcript",
      "birth_certificate",
      "employment_certificate",
      "nbi_clearance",
      "marriage_certificate",
      "business_registration",
      "certificates",
    ];
    if (!allowed.includes(document_name)) return res.status(400).json({ message: "Invalid document_name" });

    // Update the applications table
    const [result] = await db.query(
      `UPDATE applications SET ${document_name} = ? WHERE id = ?`,
      [filePath, application_id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "Application not found" });

    // Log remark that user resubmitted (optional)
    await db.query(
      `INSERT INTO document_remarks (application_id, document_name, remark, created_at) VALUES (?, ?, ?, NOW())`,
      [application_id, document_name, `User resubmitted ${document_name}`]
    );

    res.json({ message: "Resubmitted successfully" });
  } catch (err) {
    console.error("Resubmit error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// POST /notifications/mark-read
router.post("/mark-read", async (req, res) => {
  const userId = req.user?.id || req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const { notification_key } = req.body;
  if (!notification_key) return res.status(400).json({ message: "notification_key required" });

  try {
    await ensureNotificationReadsTable();
    await db.query(
      `INSERT INTO notification_reads (user_id, notification_key, read_at) VALUES (?, ?, NOW())
       ON DUPLICATE KEY UPDATE read_at = VALUES(read_at)`,
      [String(userId), notification_key]
    );
    res.json({ message: "Marked read" });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
