const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const {
  sendWelcomeEmail,
  sendLoginNotificationEmail
} = require("../services/emailService");

const db = require("../config/db");
const {
  uploadedImagePaths,
  deleteCloudinaryImages
} = require("../middleware/imageUpload");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required.");
}
const JWT_EXPIRES_IN = "6h";
const COOKIE_MAX_AGE = 6 * 60 * 60 * 1000;

function runQuery(sql, params = []) {
  return db.promise().execute(sql, params);
}

function cookieBaseOptions() {
  const sameSite = String(process.env.COOKIE_SAME_SITE || "lax").toLowerCase();
  const options = {
    httpOnly: true,
    sameSite: ["lax", "strict", "none"].includes(sameSite) ? sameSite : "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/"
  };

  if (process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }

  return options;
}

function authCookieOptions() {
  return {
    ...cookieBaseOptions(),
    maxAge: COOKIE_MAX_AGE
  };
}

function clearCookieOptions() {
  return cookieBaseOptions();
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    profileImage: user.profile_image || "",
    role: "user"
  };
}

function sanitizeAdmin(admin) {
  return {
    id: admin.id,
    username: admin.username,
    name: admin.name || admin.username,
    role: "admin"
  };
}

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

function hasValidCustomerFields({ name, email, phone, password }) {
  return String(name || "").trim().length >= 2 && String(name || "").trim().length <= 100 &&
    isValidEmail(normalizeEmail(email)) && String(phone || "").trim().length >= 7 &&
    String(phone || "").trim().length <= 30 && String(password || "").length >= 6 && String(password || "").length <= 128;
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
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

async function sendRegistrationOtpEmail(email, otp) {
  const transporter = createMailTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Haroon Stores Registration OTP",
    text: `Hello,

Your Haroon Stores registration OTP is: ${otp}

This OTP expires in 10 minutes.

If you did not request this account, please ignore this email.

Haroon Stores Team`
  });
}

async function findUserByEmailOrPhone(email, phone) {
  const [rows] = await runQuery(
    "SELECT * FROM users WHERE email = ? OR phone = ? LIMIT 1",
    [email, phone]
  );

  return rows[0];
}

async function ensureDefaultAdmin() {
  const username =
    process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    throw new Error("ADMIN_PASSWORD environment variable is required to create a default admin.");
  }

  const [rows] = await runQuery(
    "SELECT * FROM admins WHERE username = ? LIMIT 1",
    [username]
  );

  if (rows[0]) {
    return rows[0];
  }

  const passwordHash =
    await bcrypt.hash(password, 10);

  const [result] = await runQuery(
    `
      INSERT INTO admins
      (username, password_hash, name)
      VALUES (?, ?, ?)
    `,
    [username, passwordHash, "Haroon Admin"]
  );

  return {
    id: result.insertId,
    username,
    password_hash: passwordHash,
    name: "Haroon Admin"
  };
}

async function register(req, res) {
  try {
    const {
      name,
      email,
      phone,
      password
    } = req.body;

    if (!hasValidCustomerFields({ name, email, phone, password })) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields."
      });
    }

    const normalizedEmail =
      email.trim().toLowerCase();
    const normalizedPhone =
      phone.trim();

    const existingUser =
      await findUserByEmailOrPhone(
        normalizedEmail,
        normalizedPhone
      );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account already exists with this email or phone."
      });
    }

    const passwordHash =
      await bcrypt.hash(password, 10);

    const [result] = await runQuery(
      `
        INSERT INTO users
        (name, email, phone, password_hash, profile_image)
        VALUES (?, ?, ?, ?, ?)
      `,
      [
        name.trim(),
        normalizedEmail,
        normalizedPhone,
        passwordHash,
        ""
      ]
    );

    const user = {
      id: result.insertId,
      name: name.trim(),
      email: normalizedEmail,
      phone: normalizedPhone,
      profile_image: ""
    };

    const token =
      createToken({
        id: user.id,
        role: "user"
      });

    res.cookie(
      "userToken",
      token,
      authCookieOptions()
    );

    await sendWelcomeEmail(user);

    res.status(201).json({
      success: true,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("Register failed:", error);

    res.status(500).json({
      success: false,
      message: "Registration failed"
    });
  }
}

async function login(req, res) {
  try {
    if (process.env.NODE_ENV !== "production") {
      console.log("Customer login request:", {
        origin: req.headers.origin || "(none)",
        host: req.headers.host,
        contentType: req.headers["content-type"],
        hasBody: Boolean(req.body && typeof req.body === "object"),
        identifierType: req.body?.identifier || req.body?.email || req.body?.phone
          ? "provided"
          : "missing"
      });
    }

    const {
      email,
      identifier,
      username,
      password,
      role
    } = req.body;

    if (!password || String(password).length > 128) {
      return res.status(400).json({
        success: false,
        message: "Password is required."
      });
    }

    if (role === "admin") {
      return res.status(404).json({
        success: false,
        message: "Use /api/admin/login for admin authentication"
      });
    }

    const normalizedEmail = (email || identifier || "").trim().toLowerCase();

    if (!isValidEmail(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        message: "A valid email is required."
      });
    }

    const [rows] = await runQuery(
      `
        SELECT *
        FROM users
        WHERE email = ?
        LIMIT 1
      `,
      [
        normalizedEmail
      ]
    );

    const user = rows[0];

    const isValid =
      user &&
      await bcrypt.compare(
        password,
        user.password_hash
      );

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const token =
      createToken({
        id: user.id,
        role: "user"
      });

    res.cookie(
      "userToken",
      token,
      authCookieOptions()
    );

    await sendLoginNotificationEmail(user);

    res.json({
      success: true,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("Login failed:", error);

    res.status(500).json({
      success: false,
      message: process.env.NODE_ENV === "production"
        ? "Login failed"
        : `Login failed: ${error.message || "Unknown server error"}`
    });
  }
}

async function me(req, res) {
  try {
    if (req.auth.role === "admin") {
      const [rows] = await runQuery(
        "SELECT id, username, name FROM admins WHERE id = ? LIMIT 1",
        [req.auth.id]
      );

      if (!rows[0]) {
        return res.status(404).json({
          success: false,
          message: "Admin not found"
        });
      }

      return res.json({
        success: true,
        user: sanitizeAdmin(rows[0])
      });
    }

    const [rows] = await runQuery(
      `
        SELECT id, name, email, phone, profile_image
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [req.auth.id]
    );

    if (!rows[0]) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    res.json({
      success: true,
      user: sanitizeUser(rows[0])
    });
  } catch (error) {
    console.error("Session check failed:", error);

    res.status(500).json({
      success: false,
      message: "Session check failed"
    });
  }
}

async function updateMe(req, res) {
  let uploadedProfileImage = "";

  try {
    if (req.auth.role !== "user") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }

    const {
      name,
      email,
      phone,
      profileImage
    } = req.body;

    const normalizedEmail =
      (email || "").trim().toLowerCase();
    const normalizedPhone =
      (phone || "").trim();

    const [duplicates] = await runQuery(
      `
        SELECT id FROM users
        WHERE (email = ? OR phone = ?)
        AND id <> ?
        LIMIT 1
      `,
      [
        normalizedEmail,
        normalizedPhone,
        req.auth.id
      ]
    );

    if (duplicates[0]) {
      return res.status(409).json({
        success: false,
        message: "Email or phone is already used by another account."
      });
    }

    const [currentRows] = await runQuery(
      "SELECT profile_image FROM users WHERE id = ? LIMIT 1",
      [req.auth.id]
    );

    if (!currentRows[0]) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (req.file) {
      [uploadedProfileImage] = await uploadedImagePaths(req, "user-profiles");
    }

    const params = [
      (name || "").trim(),
      normalizedEmail,
      normalizedPhone,
      uploadedProfileImage || (typeof profileImage === "string" ? profileImage : null)
    ];

    params.push(req.auth.id);

    await runQuery(
      `
        UPDATE users
        SET name = ?,
            email = ?,
            phone = ?,
            profile_image = COALESCE(?, profile_image)
        WHERE id = ?
      `,
      params
    );

    const [rows] = await runQuery(
      `
        SELECT id, name, email, phone, profile_image
        FROM users
        WHERE id = ?
        LIMIT 1
      `,
      [req.auth.id]
    );

    if (uploadedProfileImage) {
      await deleteCloudinaryImages([currentRows[0].profile_image]);
    }

    res.json({
      success: true,
      user: sanitizeUser(rows[0])
    });
  } catch (error) {
    if (uploadedProfileImage) {
      await deleteCloudinaryImages([uploadedProfileImage]);
    }
    console.error("Profile update failed:", error);

    res.status(500).json({
      success: false,
      message: "Profile update failed"
    });
  }
}

function logout(req, res) {
  res.clearCookie(
    "userToken",
    clearCookieOptions()
  );

  res.clearCookie(
    "adminToken",
    clearCookieOptions()
  );

  res.json({
    success: true,
    message: "Logged out"
  });
}

async function requestRegistrationOtp(req, res) {
  try {
    const {
      name,
      email,
      phone,
      password
    } = req.body;

    if (!hasValidCustomerFields({ name, email, phone, password })) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields."
      });
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedPhone = phone.trim();

    const existingUser = await findUserByEmailOrPhone(
      normalizedEmail,
      normalizedPhone
    );

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account already exists with this email or phone."
      });
    }

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);
    const passwordEncrypted = await bcrypt.hash(password, 10);

    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    const resendAvailableAt = new Date(Date.now() + 60 * 1000); // 1 min

    const [existingOtp] = await runQuery(
      "SELECT id FROM registration_otps WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    if (existingOtp[0]) {
      await runQuery(
        `
          UPDATE registration_otps
          SET phone = ?, name = ?, password_encrypted = ?, otp_hash = ?, expires_at = ?, resend_available_at = ?
          WHERE email = ?
        `,
        [normalizedPhone, name.trim(), passwordEncrypted, otpHash, expiresAt, resendAvailableAt, normalizedEmail]
      );
    } else {
      await runQuery(
        `
          INSERT INTO registration_otps
          (email, phone, name, password_encrypted, otp_hash, expires_at, resend_available_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        [normalizedEmail, normalizedPhone, name.trim(), passwordEncrypted, otpHash, expiresAt, resendAvailableAt]
      );
    }

    await sendRegistrationOtpEmail(normalizedEmail, otp);
    res.json({
      success: true,
      message: "OTP sent to your email. Please verify."
    });
  } catch (error) {
    console.error("Request registration OTP failed:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP"
    });
  }
}

async function verifyRegistrationOtp(req, res) {
  try {
    const { email, otp } = req.body;
    const normalizedOtp = String(otp || "").trim();

    if (!email || !/^\d{6}$/.test(normalizedOtp)) {
      return res.status(400).json({ success: false, message: "Email and OTP are required." });
    }

    const normalizedEmail = normalizeEmail(email);

    const [rows] = await runQuery(
      "SELECT * FROM registration_otps WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );

    const otpRecord = rows[0];
    if (!otpRecord) {
      return res.status(404).json({ success: false, message: "No pending registration found for this email." });
    }

    if (new Date() > new Date(otpRecord.expires_at)) {
      return res.status(400).json({ success: false, message: "OTP has expired. Please request a new one." });
    }

    const isValid = await bcrypt.compare(normalizedOtp, otpRecord.otp_hash);
    if (!isValid) {
      return res.status(400).json({ success: false, message: "Invalid OTP." });
    }

    const existingUser = await findUserByEmailOrPhone(normalizedEmail, otpRecord.phone);
    if (existingUser) {
      return res.status(409).json({ success: false, message: "An account already exists with this email or phone." });
    }

    const [result] = await runQuery(
      `
        INSERT INTO users
        (name, email, phone, password_hash, profile_image, is_email_verified)
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [otpRecord.name, normalizedEmail, otpRecord.phone, otpRecord.password_encrypted, "", true]
    );

    const user = {
      id: result.insertId,
      name: otpRecord.name,
      email: normalizedEmail,
      phone: otpRecord.phone,
      profile_image: ""
    };

    const token = createToken({ id: user.id, role: "user" });
    res.cookie("userToken", token, authCookieOptions());

    await runQuery("DELETE FROM registration_otps WHERE email = ?", [normalizedEmail]);

    await sendWelcomeEmail(user);

    res.status(201).json({
      success: true,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("Verify registration OTP failed:", error);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
}

module.exports = {
  register,
  login,
  me,
  updateMe,
  authCookieOptions,
  createToken,
  sanitizeUser,
  logout,
  requestRegistrationOtp,
  verifyRegistrationOtp
};
