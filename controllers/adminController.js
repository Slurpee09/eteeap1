import db from "../config/db.js";
import { logActivity } from "../utils/activityLogger.js";
import bcrypt from "bcryptjs";

// ---------------------------
// --- APPLICATIONS ---
// ---------------------------
export const getAllApplications = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, program_name, full_name, email, phone, marital_status, is_business_owner,
      business_name, letter_of_intent, resume, picture, application_form, recommendation_letter,
      school_credentials, high_school_diploma, transcript, birth_certificate, employment_certificate,
      nbi_clearance, marriage_certificate, business_registration, certificates, created_at,
      resume_status, resume_remark, status
      FROM applications
      ORDER BY created_at DESC`
    );

    // Get verified files and normalize to explicit 0/1 flags for all known file keys
    const [verified] = await db.query("SELECT * FROM verified_files");

    const fileKeys = [
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

    const applicationsWithVerified = rows.map(app => {
      const verifiedFiles = verified.filter(v => v.application_id === app.id);
      const verifiedObj = {};
      // default all to 0
      fileKeys.forEach(k => { verifiedObj[`${k}_verified`] = 0; });
      // set ones present to 1
      verifiedFiles.forEach(v => {
        verifiedObj[`${v.file_key}_verified`] = 1;
      });
      return { ...app, ...verifiedObj };
    });

    res.json(applicationsWithVerified);
  } catch (err) {
    console.error("Error fetching applications:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateApplicationStatus = async (req, res) => {
  const applicationId = req.params.id;
  const { status } = req.body;

  if (!status) return res.status(400).json({ message: "Status is required" });

  try {
    // allow case-insensitive pending/accepted/rejected and normalize value
    const lc = String(status).toLowerCase().trim();
    const allowed = ["pending", "accepted", "rejected"];
    if (!allowed.includes(lc)) {
      return res.status(400).json({ message: "Invalid status value" });
    }
    const normalized = lc === "pending" ? "Pending" : lc === "accepted" ? "Accepted" : "Rejected";

    const [result] = await db.query(
      `UPDATE applications SET status = ? WHERE id = ?`,
      [normalized, applicationId]
    );

    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Application not found" });

    const [rows] = await db.query(`SELECT * FROM applications WHERE id = ?`, [applicationId]);

    // Log the admin action
    await logActivity(req.user?.id || req.headers["x-user-id"], "admin", "update_application_status", `Set application ${applicationId} status to ${normalized}`);

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error updating status" });
  }
};

// ---------------------------
// --- UPDATE DOCUMENT STATUS ---
// ---------------------------
export const updateDocumentStatus = async (req, res) => {
  const { id } = req.params;
  const { documentName, status, remark } = req.body;

  if (!documentName || !status) {
    return res.status(400).json({ message: "Document name and status are required" });
  }

  try {
    const allowedStatuses = ["pending", "approved", "rejected"];
    if (!allowedStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ message: "Invalid status value" });
    }

    // Whitelist document names to avoid SQL injection and unknown column errors
    const allowedDocs = new Set([
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
    ]);

    if (!allowedDocs.has(documentName)) {
      return res.status(400).json({ message: "Invalid document name" });
    }

    const statusColumn = `${documentName}_status`;
    const remarkColumn = `${documentName}_remark`;

    // Ensure the applications table actually has the status column before attempting UPDATE
    const [[colInfo]] = await db.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications' AND COLUMN_NAME = ?`,
      [statusColumn]
    );

    if (!colInfo || Number(colInfo.cnt) === 0) {
      // Column does not exist - treat as no-op and return current application row
      const [rows] = await db.query(`SELECT * FROM applications WHERE id = ?`, [id]);
      if (!rows.length) return res.status(404).json({ message: "Application not found" });
      return res.json(rows[0]);
    }

    const [result] = await db.query(
      `UPDATE applications SET ${statusColumn} = ?, ${remarkColumn} = ? WHERE id = ?`,
      [status, remark || null, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Application not found" });
    }

    const [rows] = await db.query(`SELECT * FROM applications WHERE id = ?`, [id]);
    const updatedDoc = rows[0];

    await logActivity(
      req.user?.id || req.headers["x-user-id"],
      "admin",
      "update_document_status",
      `Updated document '${documentName}' status to '${status}' on application ${id}`
    );

    res.json(updatedDoc);
  } catch (err) {
    console.error("Error updating document status:", err);
    // If database reports unknown column (bad field), return 400 with a helpful message
    if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054)) {
      return res.status(400).json({ message: "Document does not support status updates" });
    }
    res.status(500).json({ message: "Server error updating document status" });
  }
};

// ---------------------------
// --- DELETE APPLICATION ---
// ---------------------------
export const deleteApplication = async (req, res) => {
  try {
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM applications WHERE id = ?",
      [id]
    );

    if (!rows.length) return res.status(404).json({ message: "Application not found" });

    await db.query("DELETE FROM applications WHERE id = ?", [id]);

    res.json({ message: "Application deleted", deleted: rows[0] });
  } catch (err) {
    console.error("Error deleting application:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------
// --- VERIFY FILE ---
// ---------------------------
export const verifyFile = async (req, res) => {
  const applicationId = req.params.id;
  const fileKey = req.params.fileKey;
  const adminId = req.user?.id || req.headers["x-user-id"] || null;
  const { verified } = req.body || {};

  try {
    // If client provided a verified flag, respect it (1 = verify, 0 = unverify)
    if (typeof verified !== "undefined") {
      if (Number(verified) === 1) {
        const [exists] = await db.query(
          "SELECT id FROM verified_files WHERE application_id = ? AND file_key = ?",
          [applicationId, fileKey]
        );
        if (exists.length === 0) {
          await db.query(
            "INSERT INTO verified_files (application_id, file_key, verified_by) VALUES (?, ?, ?)",
            [applicationId, fileKey, adminId]
          );
          await logActivity(adminId, "admin", "verify_file", `Verified file '${fileKey}' for application ${applicationId}`);
        }
      } else {
        // remove verified record
        await db.query(
          "DELETE FROM verified_files WHERE application_id = ? AND file_key = ?",
          [applicationId, fileKey]
        );
        await logActivity(adminId, "admin", "unverify_file", `Un-verified file '${fileKey}' for application ${applicationId}`);
      }
    } else {
      // Backwards compatible behavior: if no payload, toggle/insert if not exists
      const [exists] = await db.query(
        "SELECT id FROM verified_files WHERE application_id = ? AND file_key = ?",
        [applicationId, fileKey]
      );
      if (exists.length > 0) return res.status(200).json({ message: "Already verified" });
      await db.query(
        "INSERT INTO verified_files (application_id, file_key, verified_by) VALUES (?, ?, ?)",
        [applicationId, fileKey, adminId]
      );
      await logActivity(adminId, "admin", "verify_file", `Verified file '${fileKey}' for application ${applicationId}`);
    }

    const [rows] = await db.query(`SELECT * FROM applications WHERE id = ?`, [applicationId]);

    // build explicit verified flags for all known file keys
    const [verifiedRows] = await db.query("SELECT file_key FROM verified_files WHERE application_id = ?", [applicationId]);
    const fileKeys = [
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
    const verifiedObj = {};
    fileKeys.forEach(k => { verifiedObj[`${k}_verified`] = 0; });
    verifiedRows.forEach(v => { verifiedObj[`${v.file_key}_verified`] = 1; });

    const response = { ...rows[0], ...verifiedObj };
    res.json(response);
  } catch (err) {
    console.error("Error verifying file:", err);
    res.status(500).json({ message: "Verification failed" });
  }
};

// ---------------------------
// --- DOCUMENT REMARKS ---
// ---------------------------
export const getDocumentRemark = async (req, res) => {
  try {
    const { applicationId, documentName } = req.params;
    const [rows] = await db.query(
      "SELECT remark, created_at FROM document_remarks WHERE application_id = ? AND document_name = ? ORDER BY created_at DESC LIMIT 1",
      [applicationId, documentName]
    );

    res.json(rows.length > 0 ? rows[0] : { remark: "", created_at: null });
  } catch (err) {
    console.error("Error fetching document remark:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const addDocumentRemark = async (req, res) => {
  try {
    const { applicationId, documentName } = req.params;
    const { remark } = req.body;

    await db.query(
      "INSERT INTO document_remarks (application_id, document_name, remark, created_at) VALUES (?, ?, ?, NOW())",
      [applicationId, documentName, remark]
    );

    const [rows] = await db.query(
      "SELECT remark, created_at FROM document_remarks WHERE application_id = ? AND document_name = ? ORDER BY created_at DESC LIMIT 1",
      [applicationId, documentName]
    );

    await logActivity(
      req.user?.id || req.headers["x-user-id"],
      "admin",
      "add_document_remark",
      `Added remark for document '${documentName}' on application ${applicationId}: ${remark}`
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Error adding document remark:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------
// --- ADMIN PROFILE ---
// ---------------------------
export const getAdminProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const [rows] = await db.query(
      "SELECT id, fullname, email, profile_picture FROM users WHERE id = ?",
      [userId]
    );

    if (!rows.length) return res.status(404).json({ message: "Admin not found" });

    const user = rows[0];
    user.profile_picture = user.profile_picture
      ? `${req.protocol}://${req.get("host")}/${user.profile_picture}`
      : `${req.protocol}://${req.get("host")}/uploads/profile/default.png`;

    res.json(user);
  } catch (err) {
    console.error("Error fetching admin profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateAdminProfile = async (req, res) => {
  try {
    const userId = req.user?.id || req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const { fullname, email, password } = req.body;
    if (!fullname || !email) return res.status(400).json({ message: "Fullname and email required" });

    const fields = ["fullname = ?", "email = ?"];
    const values = [fullname, email];

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      fields.push("password = ?");
      values.push(hashedPassword);
    }

    if (req.file) {
      const profile_picture = `uploads/profile/${req.file.filename}`;
      fields.push("profile_picture = ?");
      values.push(profile_picture);
    }

    values.push(userId);

    await db.query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);

    const [rows] = await db.query(
      "SELECT id, fullname, email, profile_picture FROM users WHERE id = ?",
      [userId]
    );

    const user = rows[0];
    user.profile_picture = user.profile_picture
      ? `${req.protocol}://${req.get("host")}/${user.profile_picture}`
      : `${req.protocol}://${req.get("host")}/uploads/profile/default.png`;

    await logActivity(userId, "admin", "update_profile", "Admin updated profile settings");

    res.json({ message: "Profile updated successfully!", user });
  } catch (err) {
    console.error("Error updating admin profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// ---------------------------
// --- SUPPORTED DOC STATUS KEYS ---
// Returns which document base keys have a corresponding *_status column in applications
// ---------------------------
export const getSupportedDocumentStatusKeys = async (req, res) => {
  try {
    const fileKeys = [
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

    const checks = await Promise.all(fileKeys.map(async (k) => {
      const col = `${k}_status`;
      const [[row]] = await db.query(
        `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications' AND COLUMN_NAME = ?`,
        [col]
      );
      return { key: k, has: Number(row.cnt) > 0 };
    }));

    const supported = checks.filter(c => c.has).map(c => c.key);
    res.json({ supported });
  } catch (err) {
    console.error("Error checking supported document status keys:", err);
    res.status(500).json({ message: "Server error" });
  }
};
