import express from "express";
import { forgotPassword, resetPassword } from "../controllers/authController.js";

const router = express.Router();

// Route for requesting a reset link
router.post("/forgot-password", forgotPassword);

// Route for resetting the password
router.post("/reset-password", resetPassword);

export default router;
