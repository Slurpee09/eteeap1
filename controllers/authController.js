import User from "../models/User.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import nodemailer from "nodemailer";
import db from "../config/db.js"; // your MySQL or DB connection

// -----------------------------
// --- Signup with email/password
// -----------------------------
export const signup = async (req, res) => {
  const { fullname, email, password } = req.body;

  if (!fullname || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const existingUser = await User.findByEmail(email);
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    const newUser = await User.createUser({ fullname, email, password });
    delete newUser.password;

    res.json({
      success: true,
      message: "Signup successful",
      user: {
        id: newUser.id,
        fullname: newUser.fullname,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// -----------------------------
// --- Login with email/password
// -----------------------------
export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password required" });

  try {
    const user = await User.findByEmail(email);
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ message: "Invalid email or password" });

    delete user.password;

    res.json({
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// -----------------------------
// --- Forgot Password (send reset link)
// -----------------------------
export const sendResetLink = async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findByEmail(email);
    if (!user) return res.status(404).json({ message: "Email not found" });

    // Generate a secure token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour expiration

    // Save token to password_resets table
    await db.query(
      "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, token, expiresAt]
    );

    // Send email with reset link
    const transporter = nodemailer.createTransport({
      service: "Gmail", // or your email service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const resetLink = `http://localhost:3000/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"Your App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request",
      html: `
        <p>Hello ${user.fullname},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
      `,
    });

    res.json({ success: true, message: "Password reset link sent to your email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// -----------------------------
// --- Reset Password using token
// -----------------------------
export const resetPasswordWithToken = async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ message: "Token and new password are required" });

  try {
    const [rows] = await db.query(
      "SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()",
      [token]
    );

    if (!rows[0]) return res.status(400).json({ message: "Invalid or expired token" });

    const userId = rows[0].user_id;
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password
    await User.updatePasswordById(userId, hashedPassword);

    // Delete used token
    await db.query("DELETE FROM password_resets WHERE token = ?", [token]);

    res.json({ success: true, message: "Password successfully updated!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// -----------------------------
// --- Google OAuth callback
// -----------------------------
export const googleCallback = (req, res) => {
  const user = req.user;
  if (user) {
    delete user.password;
    res.json({
      success: true,
      message: "Google login successful",
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role || "user",
      },
    });
  } else {
    res.status(500).json({ message: "Google login failed" });
  }
};
