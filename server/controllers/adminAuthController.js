const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const db = require("../config/db");
const {
  uploadedImagePaths,
  deleteCloudinaryImages
} = require("../middleware/imageUpload");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required.");
}
const ADMIN_TOKEN_EXPIRES_IN = "6h";
const ADMIN_COOKIE_MAX_AGE = 6 * 60 * 60 * 1000;
const OTP_TTL_MS = 10 * 60 * 1000;

function runQuery(sql, params = []) {
  return db.promise().execute(sql, params);
}

function adminCookieBaseOptions() {
  const sameSite = String(process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: ["lax", "strict", "none"].includes(sameSite) ? sameSite : "lax",
    path: "/"
  };

  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
}

function adminCookieOptions(maxAge = ADMIN_COOKIE_MAX_AGE) {
  return {
    ...adminCookieBaseOptions(),
    maxAge
  };
}

function adminClearCookieOptions() {
  return adminCookieBaseOptions();
}

function maxAdmins() {
  const parsed = Number(process.env.ADMIN_MAX_COUNT || 3);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 3;
}

function adminDeviceCookieDays() {
  const parsed = Number(process.env.ADMIN_DEVICE_COOKIE_DAYS || 30);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 30;
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function getCookie(req, name) {
  const cookieHeader = req.headers.cookie || "";

  return cookieHeader
    .split(";")
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function hashToken(token) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

function createAdminToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      role: "admin"
    },
    JWT_SECRET,
    {
      expiresIn: ADMIN_TOKEN_EXPIRES_IN
    }
  );
}

function createDeviceToken(admin) {
  return jwt.sign(
    {
      id: admin.id,
      email: admin.email,
      type: "adminDevice"
    },
    JWT_SECRET,
    {
      expiresIn: `${adminDeviceCookieDays()}d`
    }
  );
}

function sanitizeAdmin(admin) {
  return {
    id: admin.id,
    name: admin.name,
    email: admin.email,
    designation: admin.designation || "Administrator",
    profileImage: admin.profile_image || null,
    lastLogin: admin.last_login || admin.last_login_at || null,
    isEmailVerified: Boolean(admin.is_email_verified),
    isActive: Boolean(admin.is_active),
    role: "admin"
  };
}

function createMailTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
}

async function sendAdminOtpEmail(email, otp, label) {
  const transporter = createMailTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: `Haroon Stores Admin ${label} OTP`,
    text: `Hello,

Your Haroon Stores admin OTP is: ${otp}

This OTP expires in 10 minutes.

If you did not request this, please secure your account.

Haroon Stores Team`
  });
}

async function countActiveAdmins() {
  const [rows] = await runQuery(
    "SELECT COUNT(*) AS total FROM admins WHERE is_active = 1"
  );

  return Number(rows[0]?.total || 0);
}

async function findActiveAdminByEmail(email) {
  const [rows] = await runQuery(
    "SELECT * FROM admins WHERE email = ? AND is_active = 1 LIMIT 1",
    [email]
  );

  return rows[0];
}

function isTrustedDevice(req, admin) {
  const token = getCookie(req, "adminDevice");

  if (!token) {
    return false;
  }

  try {
    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    return (
      decoded.type === "adminDevice" &&
      decoded.id === admin.id &&
      decoded.email === admin.email &&
      admin.device_token_hash === hashToken(token)
    );
  } catch {
    return false;
  }
}

async function createAdminOtp(admin, label) {
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);

  await runQuery(
    "DELETE FROM admin_otps WHERE admin_id = ? AND purpose = ?",
    [admin.id, label === "Reset Password" ? "reset_password" : "login"]
  );
  await runQuery(
    `
      INSERT INTO admin_otps
      (admin_id, purpose, email, otp_hash, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      admin.id,
      label === "Reset Password" ? "reset_password" : "login",
      admin.email,
      otpHash,
      expiresAt
    ]
  );

  await sendAdminOtpEmail(admin.email, otp, label);
}

async function createPendingRegistrationOtp(payload) {
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);

  await runQuery(
    "DELETE FROM admin_otps WHERE email = ? AND purpose = 'register'",
    [payload.email]
  );
  await runQuery(
    `
      INSERT INTO admin_otps
      (admin_id, purpose, email, name, password_hash, otp_hash, expires_at)
      VALUES (NULL, 'register', ?, ?, ?, ?, ?)
    `,
    [
      payload.email,
      payload.name,
      payload.passwordHash,
      otpHash,
      new Date(Date.now() + OTP_TTL_MS)
    ]
  );

  await sendAdminOtpEmail(payload.email, otp, "Registration");
}

async function getStatus(req, res) {
  try {
    const total = await countActiveAdmins();

    res.json({
      success: true,
      activeAdmins: total,
      maxAdmins: maxAdmins(),
      registrationOpen: total < maxAdmins()
    });
  } catch (error) {
    console.error("Admin status failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load admin status"
    });
  }
}

async function requireAdminAuth(req, res, next) {
  const token = getCookie(req, "adminToken");

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authenticated"
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const [rows] = await runQuery(
      `
        SELECT *
        FROM admins
        WHERE id = ?
          AND is_active = 1
          AND is_email_verified = 1
        LIMIT 1
      `,
      [decoded.id]
    );

    if (!rows[0]) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session"
      });
    }

    req.auth = decoded;
    req.admin = rows[0];
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired session"
    });
  }
}

async function me(req, res) {
  res.json({
    success: true,
    user: sanitizeAdmin(req.admin)
  });
}

async function updateAccount(req, res) {
  let uploadedProfileImage = "";

  try {
    const { name, designation, currentPassword, newPassword, profileImage } = req.body;
    const updates = [];
    const values = [];

    if (typeof name === "string" && name.trim()) {
      updates.push("name = ?");
      values.push(name.trim());
    }

    if (typeof designation === "string") {
      updates.push("designation = ?");
      values.push(designation.trim() || "Administrator");
    }

    if (req.file) {
      [uploadedProfileImage] = await uploadedImagePaths(req, "admin-profiles");
      updates.push("profile_image = ?");
      values.push(uploadedProfileImage);
    } else if (typeof profileImage === "string") {
      updates.push("profile_image = ?");
      values.push(profileImage || null);
    }

    if (currentPassword || newPassword) {
      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Current password and new password are required"
        });
      }

      if (String(newPassword).length < 6) {
        return res.status(400).json({
          success: false,
          message: "Password must be at least 6 characters."
        });
      }

      const validPassword = await bcrypt.compare(
        String(currentPassword),
        req.admin.password_hash
      );

      if (!validPassword) {
        return res.status(401).json({
          success: false,
          message: "Invalid credentials"
        });
      }

      updates.push("password_hash = ?");
      values.push(await bcrypt.hash(String(newPassword), 10));
      updates.push("device_token_hash = NULL");
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No changes submitted"
      });
    }

    values.push(req.admin.id);

    await runQuery(
      `UPDATE admins SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    const [rows] = await runQuery(
      "SELECT * FROM admins WHERE id = ? LIMIT 1",
      [req.admin.id]
    );

    if (uploadedProfileImage) {
      await deleteCloudinaryImages([req.admin.profile_image]);
    }

    res.json({
      success: true,
      user: sanitizeAdmin(rows[0])
    });
  } catch (error) {
    if (uploadedProfileImage) {
      await deleteCloudinaryImages([uploadedProfileImage]);
    }
    console.error("Admin update account failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update admin account"
    });
  }
}

async function sendRegistrationOtp(req, res) {
  try {
    const { name, email, password, confirmPassword, secretKey } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password || !confirmPassword || !secretKey) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields."
      });
    }

    if (await countActiveAdmins() >= maxAdmins()) {
      return res.status(403).json({
        success: false,
        message: "Maximum number of admins reached"
      });
    }

    if (secretKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters."
      });
    }

    const [existing] = await runQuery(
      "SELECT id FROM admins WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existing[0]) {
      return res.status(409).json({
        success: false,
        message: "Email is already used"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await createPendingRegistrationOtp({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash
    });

    res.json({
      success: true,
      message: "OTP sent to your email. Please verify."
    });
  } catch (error) {
    console.error("Admin register failed:", error);
    res.status(500).json({
      success: false,
      message: "Admin registration failed"
    });
  }
}

async function verifyRegistration(req, res) {
  try {
    const normalizedEmail = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();
    const [pendingRows] = await runQuery(
      `
        SELECT *
        FROM admin_otps
        WHERE email = ?
          AND purpose = 'register'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [normalizedEmail]
    );
    const pending = pendingRows[0];

    if (!pending || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    if (new Date() > new Date(pending.expires_at)) {
      await runQuery(
        "DELETE FROM admin_otps WHERE id = ?",
        [pending.id]
      );
      return res.status(400).json({
        success: false,
        message: "OTP has expired"
      });
    }

    if (await countActiveAdmins() >= maxAdmins()) {
      await runQuery(
        "DELETE FROM admin_otps WHERE id = ?",
        [pending.id]
      );
      return res.status(403).json({
        success: false,
        message: "Maximum number of admins reached"
      });
    }

    const isValid = await bcrypt.compare(otp, pending.otp_hash);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    const [existing] = await runQuery(
      "SELECT id FROM admins WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existing[0]) {
      await runQuery(
        "DELETE FROM admin_otps WHERE id = ?",
        [pending.id]
      );
      return res.status(409).json({
        success: false,
        message: "Email is already used"
      });
    }

    const [result] = await runQuery(
      `
        INSERT INTO admins
        (username, email, password_hash, name, is_active, is_email_verified)
        VALUES (?, ?, ?, ?, 1, 1)
      `,
      [normalizedEmail, normalizedEmail, pending.password_hash, pending.name]
    );

    await runQuery(
      "DELETE FROM admin_otps WHERE id = ?",
      [pending.id]
    );

    res.status(201).json({
      success: true,
      message: "Admin account created successfully.",
      user: sanitizeAdmin({
        id: result.insertId,
        name: pending.name,
        email: normalizedEmail
      })
    });
  } catch (error) {
    console.error("Admin register verify failed:", error);
    res.status(500).json({
      success: false,
      message: "Admin verification failed"
    });
  }
}

async function login(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const { password, secretKey } = req.body;

    if (!email || !password || !secretKey) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    const admin = await findActiveAdminByEmail(email);
    const validPassword =
      admin && await bcrypt.compare(password, admin.password_hash);
    const validSecret = secretKey === process.env.ADMIN_SECRET_KEY;

    if (!admin || !validPassword || !validSecret || !admin.is_email_verified) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    if (isTrustedDevice(req, admin)) {
      await runQuery(
        "UPDATE admins SET last_login_at = NOW(), last_login = NOW() WHERE id = ?",
        [admin.id]
      );
      res.cookie("adminToken", createAdminToken(admin), adminCookieOptions());
      return res.json({
        success: true,
        otpRequired: false,
        user: sanitizeAdmin(admin)
      });
    }

    await createAdminOtp(admin, "Login");

    res.json({
      success: true,
      otpRequired: true,
      message: "OTP sent to your email."
    });
  } catch (error) {
    console.error("Admin login failed:", error);
    res.status(500).json({
      success: false,
      message: "Login failed"
    });
  }
}

async function verifyLoginOtp(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();
    const admin = await findActiveAdminByEmail(email);

    if (!admin || !/^\d{6}$/.test(otp) || !admin.is_email_verified) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    const [rows] = await runQuery(
      `
        SELECT *
        FROM admin_otps
        WHERE admin_id = ?
          AND purpose = 'login'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [admin.id]
    );
    const record = rows[0];

    if (!record || new Date() > new Date(record.expires_at)) {
      if (record) {
        await runQuery("DELETE FROM admin_otps WHERE id = ?", [record.id]);
      }
      return res.status(400).json({
        success: false,
        message: "OTP has expired"
      });
    }

    const isValid = await bcrypt.compare(otp, record.otp_hash);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    await runQuery("DELETE FROM admin_otps WHERE id = ?", [record.id]);

    const deviceToken = createDeviceToken(admin);
    const adminToken = createAdminToken(admin);

    await runQuery(
      "UPDATE admins SET device_token_hash = ?, last_login_at = NOW(), last_login = NOW() WHERE id = ?",
      [hashToken(deviceToken), admin.id]
    );

    res.cookie("adminToken", adminToken, adminCookieOptions());
    res.cookie(
      "adminDevice",
      deviceToken,
      adminCookieOptions(adminDeviceCookieDays() * 24 * 60 * 60 * 1000)
    );

    res.json({
      success: true,
      user: sanitizeAdmin(admin)
    });
  } catch (error) {
    console.error("Admin verify login OTP failed:", error);
    res.status(500).json({
      success: false,
      message: "OTP verification failed"
    });
  }
}

async function sendForgotPasswordOtp(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const admin = await findActiveAdminByEmail(email);

    if (!admin || !admin.is_email_verified) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found"
      });
    }

    await createAdminOtp(admin, "Reset Password");

    res.json({
      success: true,
      message: "OTP sent to your email."
    });
  } catch (error) {
    console.error("Admin forgot password OTP failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP"
    });
  }
}

async function verifyForgotPasswordOtp(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");
    const admin = await findActiveAdminByEmail(email);

    if (!admin || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    const [rows] = await runQuery(
      `
        SELECT *
        FROM admin_otps
        WHERE admin_id = ?
          AND purpose = 'reset_password'
        ORDER BY created_at DESC
        LIMIT 1
      `,
      [admin.id]
    );
    const record = rows[0];

    if (!record || new Date() > new Date(record.expires_at)) {
      if (record) {
        await runQuery("DELETE FROM admin_otps WHERE id = ?", [record.id]);
      }
      return res.status(400).json({
        success: false,
        message: "OTP has expired"
      });
    }

    const isValid = await bcrypt.compare(otp, record.otp_hash);

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    if (!password && !confirmPassword) {
      return res.json({
        success: true,
        message: "OTP verified successfully."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters."
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await runQuery(
      "UPDATE admins SET password_hash = ?, device_token_hash = NULL WHERE id = ?",
      [passwordHash, admin.id]
    );
    await runQuery("DELETE FROM admin_otps WHERE id = ?", [record.id]);

    res.clearCookie("adminToken", adminClearCookieOptions());
    res.clearCookie("adminDevice", adminClearCookieOptions());

    res.json({
      success: true,
      message: "Password reset successfully."
    });
  } catch (error) {
    console.error("Admin forgot password verify failed:", error);
    res.status(500).json({
      success: false,
      message: "Password reset failed"
    });
  }
}

async function deactivateMe(req, res) {
  try {
    const { password } = req.body;
    const total = await countActiveAdmins();

    if (total <= 1) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate the last admin account."
      });
    }

    const [rows] = await runQuery(
      "SELECT * FROM admins WHERE id = ? AND is_active = 1 LIMIT 1",
      [req.auth.id]
    );
    const admin = rows[0];
    const validPassword =
      admin && await bcrypt.compare(password || "", admin.password_hash);

    if (!admin || !validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    await runQuery(
      "UPDATE admins SET is_active = 0, device_token_hash = NULL WHERE id = ?",
      [admin.id]
    );

    res.clearCookie("adminToken", adminClearCookieOptions());
    res.clearCookie("adminDevice", adminClearCookieOptions());

    res.json({
      success: true,
      message: "Admin account deactivated."
    });
  } catch (error) {
    console.error("Admin deactivate failed:", error);
    res.status(500).json({
      success: false,
      message: "Admin deactivation failed"
    });
  }
}

async function logout(req, res) {
  res.clearCookie("adminToken", adminClearCookieOptions());
  res.clearCookie("adminDevice", adminClearCookieOptions());

  res.json({
    success: true,
    message: "Logged out successfully."
  });
}

module.exports = {
  sanitizeAdmin,
  adminCookieOptions,
  adminClearCookieOptions,
  requireAdminAuth,
  getStatus,
  me,
  updateAccount,
  sendRegistrationOtp,
  verifyRegistration,
  login,
  verifyLoginOtp,
  sendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  logout,
  deactivateMe
};
