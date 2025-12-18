// /backend/routes/auth.js
import express from "express";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import crypto from "crypto";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import { logActivity } from "../utils/activityLogger.js";
import db from "../config/db.js"; // promise-based pool

dotenv.config();
const router = express.Router();

// -----------------------------
// Utilities
// -----------------------------
const generateResetToken = () => crypto.randomBytes(32).toString("hex");

const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// -----------------------------
// CREATE BUILT-IN ADMIN
// -----------------------------
const createAdmin = async () => {
  try {
    const adminEmail = "admin@eteeap.com";
    const adminPassword = "Admin123";
    const adminFullname = "Administrator";
    const adminRole = "admin";

    const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [adminEmail]);
    if (existing.length === 0) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const [result] = await db.query(
        "INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)",
        [adminFullname, adminEmail, hashedPassword, adminRole]
      );
      console.log("Built-in admin account created:", adminEmail);
      await logActivity(result.insertId, "admin", "create_admin", `Admin account created: ${adminEmail}`);
    } else {
      console.log("Admin account already exists:", adminEmail);
    }
  } catch (err) {
    console.error("createAdmin error:", err);
  }
};
createAdmin();

// -----------------------------
// Passport Google OAuth
// -----------------------------
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:5000/auth/google/callback",
      passReqToCallback: true,
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const fullname = profile.displayName;
        const googleId = profile.id;

        if (!email) return done(new Error("No email returned by Google"), null);

        const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

        if (rows.length > 0) {
          await logActivity(rows[0].id, rows[0].role, "google_login", "Logged in with Google");
          return done(null, rows[0]);
        }

        // If signup flow was initiated, create a new user linked to this Google account
        const isSignup = (req.session && req.session.googleSignup) || (req.query && req.query.signup === 'true');
        if (req.session && req.session.googleSignup) delete req.session.googleSignup;
        if (isSignup) {
          const randomPass = crypto.randomBytes(16).toString('hex');
          const hashedPassword = await bcrypt.hash(randomPass, 10);
          const [result] = await db.query(
            "INSERT INTO users (fullname, email, password, role, google_id) VALUES (?, ?, ?, ?, ?)",
            [fullname, email, hashedPassword, 'user', googleId]
          );
          const [newRows] = await db.query("SELECT * FROM users WHERE id = ?", [result.insertId]);
          await logActivity(result.insertId, 'user', 'google_signup', `User signed up with Google: ${email}`);
          return done(null, newRows[0]);
        }

        return done(null, false, { message: "Email not registered" });
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const [rows] = await db.query("SELECT * FROM users WHERE id = ?", [id]);
    done(null, rows[0]);
  } catch (err) {
    done(err, null);
  }
});

// -----------------------------
// SIGNUP
// -----------------------------
router.post("/signup", async (req, res) => {
  const { fullname, email, password } = req.body;
  if (!fullname || !email || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (existing.length > 0)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (fullname, email, password, role) VALUES (?, ?, ?, ?)",
      [fullname, email, hashedPassword, "user"]
    );

    await logActivity(result.insertId, "user", "signup", `User signed up: ${email}`);
    res.json({ success: true, message: "Signup successful!" });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -----------------------------
// LOGIN
// -----------------------------
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Email and password are required" });

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0)
      return res.status(401).json({ message: "Invalid email or password" });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid email or password" });

    delete user.password;

    // Establish session with passport
    req.login(user, async (err) => {
      if (err) {
        console.error("req.login error:", err);
        return res.status(500).json({ message: "Login failed" });
      }

      try {
        await logActivity(user.id, user.role, "login", "User logged in");
      } catch (e) {
        console.error("logActivity error after login:", e);
      }

      // Return user info; session cookie is set via express-session
      res.json({ success: true, message: "Login successful", user });
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -----------------------------
// CHECK EMAIL LOGIN
// -----------------------------
router.post("/check-email", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ exists: false, message: "Email required" });

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length > 0) {
      const user = rows[0];
      delete user.password;
      delete user.google_id;
      delete user.reset_token;
      delete user.reset_token_expires;
      delete user.reset_expires;

      res.json({ exists: true, user });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error("Check-email error:", err);
    res.status(500).json({ exists: false, message: "Server error" });
  }
});

// -----------------------------
// FORGOT PASSWORD
// -----------------------------
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const [rows] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Email not found" });

    const user = rows[0];
    const token = generateResetToken();
    const expiresAt = new Date(Date.now() + 3600000); // 1 hour

    await db.query(
      "INSERT INTO password_resets (user_id, token, expires_at) VALUES (?, ?, ?)",
      [user.id, token, expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    // Custom sender
    const mailOptions = {
      from: `"LCCB ETEEAP Support" <no-reply@lccb-eteeap.com>`,
      to: user.email,
      subject: "Password Reset Request",
      html: `
        <p>Hello ${user.fullname},</p>
        <p>You requested a password reset. Click the link below:</p>
        <a href="${resetUrl}" target="_blank">Reset Password</a>
        <p>This link expires in 1 hour.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    await logActivity(
      user.id,
      user.role,
      "forgot_password_email_sent",
      "Sent password reset email"
    );

    res.json({ success: true, message: "Reset link sent to your email." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -----------------------------
// RESET PASSWORD
// -----------------------------
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ message: "Token and new password required" });

  try {
    const [rows] = await db.query("SELECT * FROM password_resets WHERE token = ?", [token]);
    if (rows.length === 0)
      return res.status(400).json({ message: "Invalid or expired token" });

    const resetRecord = rows[0];
    if (new Date(resetRecord.expires_at) < new Date())
      return res.status(400).json({ message: "Token has expired" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password = ? WHERE id = ?", [hashedPassword, resetRecord.user_id]);
    await db.query("DELETE FROM password_resets WHERE id = ?", [resetRecord.id]);

    await logActivity(resetRecord.user_id, "user", "reset_password", "User reset password via token");

    res.json({ success: true, message: "Password successfully updated!" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -----------------------------
// GOOGLE OAUTH ROUTES
// -----------------------------
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], prompt: "select_account" })
);

// Signup entrypoint: set session flag and start Google OAuth
router.get('/google/signup', (req, res, next) => {
  req.session.googleSignup = true;
  passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'select_account' })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  const isSignup = (req.query && req.query.signup === 'true') || (req.session && req.session.googleSignup);

  passport.authenticate('google', { failureRedirect: '/auth/failure', session: !isSignup }, async (err, user, info) => {
    try {
      if (err) throw err;
      if (!user) {
        res.send(`
          <script>
            window.opener.postMessage({ message: "Email not registered or Google Authentication Failed" }, "*");
            window.close();
          </script>
        `);
        return;
      }

      if (isSignup) {
        // Signup completed: notify opener to ask user to login
        res.send(`
          <script>
            window.opener.postMessage({ message: "Signup successful. Please login." }, "*");
            window.close();
          </script>
        `);
        return;
      }

      // Normal login flow
      await logActivity(user.id, user.role, 'google_login_callback', 'Google login callback');
      res.send(`
        <script>
          window.opener.postMessage(${JSON.stringify(user)}, "*");
          window.close();
        </script>
      `);
    } catch (error) {
      console.error('Google callback error:', error);
      res.send(`
        <script>
          window.opener.postMessage({ message: "Login failed. Try again." }, "*");
          window.close();
        </script>
      `);
    }
  })(req, res, next);
});

router.get("/failure", (req, res) => {
  res.send(`
    <script>
      window.opener.postMessage({ message: "Email not registered or Google Authentication Failed" }, "*");
      window.close();
    </script>
  `);
});

export default router;