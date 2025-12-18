import express from "express";
import { checkEmailForReset, updatePasswordDirect, sendResetLink } from "../controllers/authController.js";

const router = express.Router();

// Check if account exists
router.post("/check-email", checkEmailForReset);

// Update password directly
router.post("/update-password", updatePasswordDirect);

// --- NEW: Send password reset link ---
router.post("/send-reset-link", sendResetLink);

export default router;
