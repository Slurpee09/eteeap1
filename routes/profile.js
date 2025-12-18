import express from "express";
import db from "../config/db.js";
import multer from "multer";
import path from "path";
import bcrypt from "bcryptjs";
import { logActivity } from "../utils/activityLogger.js";
import fs from "fs";

const router = express.Router();

// -------------------------------
// PROFILE IMAGE STORAGE
// -------------------------------
const profileDir = "uploads/profile";
if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

// SET large limit here explicitly: 50MB
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPEG, JPG, PNG allowed"));
  },
});

// -------------------------------
// TOKEN VERIFICATION
// -------------------------------
export const verifyToken = (req, res, next) => {
  // Support session-based auth (req.user) or fallback to x-user-id header for compatibility
  const userId = req.user?.id || req.headers["x-user-id"];
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  req.userId = userId;
  next();
};

// -------------------------------
// GET PROFILE
// -------------------------------
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const [rows] = await db.query(
      "SELECT id, fullname, email, profile_picture FROM users WHERE id = ?",
      [userId]
    );
    if (!rows.length) return res.status(404).json({ message: "User not found" });
    res.json(rows[0]);
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------
// GET user's applications list
// -------------------------------
router.get("/applications", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const [rows] = await db.query(
      `SELECT id, program_name, full_name, email, phone, status, created_at, updated_at
       FROM applications WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching user applications:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------------------
// GET single application details (with latest remarks)
// -------------------------------
router.get("/applications/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    const appId = req.params.id;

    const [apps] = await db.query("SELECT * FROM applications WHERE id = ? AND user_id = ?", [appId, userId]);
    if (apps.length === 0) return res.status(404).json({ message: "Application not found" });

    const application = apps[0];

    // Fetch latest remark per document for this application
    const [remarksRows] = await db.query(
      `SELECT document_name, remark, created_at
       FROM document_remarks
       WHERE application_id = ?
       ORDER BY created_at DESC`,
      [appId]
    );

    const latestRemarks = {};
    for (const r of remarksRows) {
      if (!latestRemarks[r.document_name]) latestRemarks[r.document_name] = { remark: r.remark, date: r.created_at };
    }

    // Fetch verified file flags
    const [verifiedRows] = await db.query("SELECT file_key FROM verified_files WHERE application_id = ?", [appId]);
    const verified = {};
    verifiedRows.forEach((v) => (verified[`${v.file_key}_verified`] = true));

    res.json({ application, remarks: latestRemarks, verified });
  } catch (err) {
    console.error("Error fetching application details:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------------------
// UPDATE PROFILE
// -------------------------------
router.put("/update", verifyToken, upload.single("profile_picture"), async (req, res) => {
  try {
    const userId = req.userId;
    const { fullname, email, password } = req.body;

    if (!fullname || !email)
      return res.status(400).json({ message: "Fullname and email required" });

    let query = "UPDATE users SET fullname = ?, email = ?";
    const params = [fullname.trim(), email.trim()];

    if (password && password.trim() !== "") {
      const hashed = await bcrypt.hash(password, 10);
      query += ", password = ?";
      params.push(hashed);
    }

    if (req.file) {
      const filePath = `/uploads/profile/${req.file.filename}`;
      query += ", profile_picture = ?";
      params.push(filePath);
    }

    query += " WHERE id = ?";
    params.push(userId);

    await db.query(query, params);

    const [rows] = await db.query(
      "SELECT id, fullname, email, profile_picture FROM users WHERE id = ?",
      [userId]
    );

    await logActivity(
      userId,
      "user",
      "update_profile",
      `Updated profile info: fullname=${fullname}, email=${email}`
    );

    res.json({ message: "Profile updated!", user: rows[0] });
  } catch (err) {
    console.error("Error updating profile:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------
// UPDATE PROFILE PICTURE ONLY
// -------------------------------
router.put("/picture", verifyToken, upload.single("profile_picture"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const userId = req.userId;
    const filePath = `/uploads/profile/${req.file.filename}`;

    await db.query("UPDATE users SET profile_picture = ? WHERE id = ?", [filePath, userId]);

    const [rows] = await db.query(
      "SELECT id, fullname, email, profile_picture FROM users WHERE id = ?",
      [userId]
    );

    await logActivity(userId, "user", "update_profile_picture", "Updated profile picture");

    res.json({ message: "Profile picture updated!", user: rows[0] });
  } catch (err) {
    console.error("Error updating profile picture:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------------------
// DELETE ACCOUNT
// -------------------------------
router.delete("/delete", verifyToken, async (req, res) => {
  try {
    const userId = req.userId;
    await db.query("DELETE FROM users WHERE id = ?", [userId]);
    await logActivity(userId, "user", "delete_account", "Deleted their account");
    res.json({ message: "Account deleted!" });
  } catch (err) {
    console.error("Error deleting account:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
