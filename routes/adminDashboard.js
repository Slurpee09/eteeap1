// routes/adminDashboard.js
import express from "express";
import { db } from "../server.js";

const router = express.Router();

// GET /admin/dashboard-stats
router.get("/dashboard-stats", async (req, res) => {
  try {
    // 1️⃣ Total applicants
    const [totalRows] = await db.query("SELECT COUNT(*) AS total FROM applications");

    // 2️⃣ Status breakdown (case-insensitive)
    const [statusRows] = await db.query(
      `SELECT LOWER(status) AS status, COUNT(*) AS count
       FROM applications
       GROUP BY LOWER(status)`
    );

    // 3️⃣ Incomplete requirements (any verified field = 0)
    const [incompleteRows] = await db.query(
      `SELECT COUNT(*) AS count
       FROM applications
       WHERE COALESCE(letter_of_intent_verified, 0) = 0
          OR COALESCE(resume_verified, 0) = 0
          OR COALESCE(picture_verified, 0) = 0`
    );

    // 4️⃣ Docs awaiting review (any verified field IS NULL)
    const [docsAwaitingRows] = await db.query(
      `SELECT COUNT(*) AS count
       FROM applications
       WHERE letter_of_intent_verified IS NULL
          OR resume_verified IS NULL
          OR picture_verified IS NULL`
    );

    // 5️⃣ Program distribution
    const [programRows] = await db.query(
      `SELECT program_name, COUNT(*) AS count
       FROM applications
       GROUP BY program_name`
    );

    // 6️⃣ Monthly applicants (last 12 months)
    const [monthlyRows] = await db.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month, COUNT(*) AS count
       FROM applications
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month ASC`
    );

    // Map statuses dynamically
    const statusCounts = {};
    statusRows.forEach(s => {
      statusCounts[s.status] = s.count;
    });

    res.json({
      totalApplicants: totalRows[0]?.total || 0,
      accepted: statusCounts["accepted"] || 0,
      rejected: statusCounts["rejected"] || 0,
      pendingVerifications: statusCounts["pending"] || 0,
      incompleteRequirements: incompleteRows[0]?.count || 0,
      docsAwaiting: docsAwaitingRows[0]?.count || 0,
      programDistribution: programRows.length
        ? programRows.map(p => ({ program: p.program_name || "N/A", count: p.count }))
        : [],
      monthlyApplicants: monthlyRows.length
        ? monthlyRows.map(m => ({ month: m.month, count: m.count }))
        : [],
    });
  } catch (err) {
    console.error("Dashboard stats error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
