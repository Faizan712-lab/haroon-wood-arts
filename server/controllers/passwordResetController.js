const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const db = require("../config/db");
const { sendEmail } = require("../services/emailService");

const OTP_TTL_MINUTES = 10;
const FORGOT_RESPONSE = {
  success: true,
  message: "If the email exists, an OTP has been sent."
};

function runQuery(sql, params = []) {
  return db.promise().execute(sql, params);
}

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function generateOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function findUserByEmail(email) {
  const [rows] = await runQuery(
    "SELECT id, email FROM users WHERE email = ? LIMIT 1",
    [email]
  );

  return rows[0];
}

async function findUserById(userId) {
  const [rows] = await runQuery(
    "SELECT id, email, password_hash FROM users WHERE id = ? LIMIT 1",
    [userId]
  );

  return rows[0];
}

async function findValidReset(userId, otp) {
  const [rows] = await runQuery(
    `
      SELECT id, user_id, otp, expires_at
      FROM password_resets
      WHERE user_id = ?
        AND otp = ?
        AND expires_at > NOW()
      LIMIT 1
    `,
    [userId, otp]
  );

  return rows[0];
}

async function sendOtpEmail(email, otp) {
  const sent = await sendEmail({
    to: email,
    subject: "Haroon Stores Password Reset OTP",
    html: `<p>Hello,</p><p>Your OTP is: <strong>${otp}</strong></p><p>This OTP expires in 10 minutes.</p><p>If you did not request this password reset, please ignore this email.</p><p>Haroon Stores Team</p>`
  });

  if (!sent) {
    console.error("Customer password OTP email delivery failed");
    throw new Error("Customer password OTP email delivery failed");
  }
}

async function forgotPassword(req, res) {
  const email = normalizeEmail(req.body.email);

  try {
    if (!email) {
      return res.json(FORGOT_RESPONSE);
    }

    const user = await findUserByEmail(email);

    if (user) {
      const otp = generateOtp();

      await runQuery(
        "DELETE FROM password_resets WHERE user_id = ?",
        [user.id]
      );

      await runQuery(
        `
          INSERT INTO password_resets
          (user_id, otp, expires_at)
          VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))
        `,
        [user.id, otp, OTP_TTL_MINUTES]
      );

      await sendOtpEmail(user.email, otp);
    }
  } catch (error) {
    console.error("Forgot password failed:", error);
  }

  res.json(FORGOT_RESPONSE);
}

async function verifyOtp(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP."
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP."
      });
    }

    const reset = await findValidReset(user.id, otp);

    if (!reset) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP."
      });
    }

    res.json({
      success: true
    });
  } catch (error) {
    console.error("OTP verification failed:", error);

    res.status(500).json({
      success: false,
      message: "OTP verification failed"
    });
  }
}

async function resetPassword(req, res) {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || "").trim();
    const password = req.body.password || "";

    if (!email || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP."
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters."
      });
    }

    const user = await findUserByEmail(email);

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP."
      });
    }

    const reset = await findValidReset(user.id, otp);

    if (!reset) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await runQuery(
      "UPDATE users SET password_hash = ? WHERE id = ?",
      [passwordHash, user.id]
    );

    await runQuery(
      "DELETE FROM password_resets WHERE user_id = ?",
      [user.id]
    );

    res.json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.error("Password reset failed:", error);

    res.status(500).json({
      success: false,
      message: "Password reset failed"
    });
  }
}

async function requestAuthenticatedPasswordChange(req, res) {
  try {
    const currentPassword = req.body.currentPassword || "";
    const newPassword = req.body.newPassword || "";
    const user = await findUserById(req.auth.id);

    if (!user || !await bcrypt.compare(currentPassword, user.password_hash)) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
    }

    const otp = generateOtp();
    await runQuery("DELETE FROM password_resets WHERE user_id = ?", [user.id]);
    await runQuery(
      "INSERT INTO password_resets (user_id, otp, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE))",
      [user.id, otp, OTP_TTL_MINUTES]
    );
    await sendOtpEmail(user.email, otp);

    res.json({ success: true, email: user.email, message: "Verification code sent." });
  } catch (error) {
    console.error("Authenticated password-change request failed:", error);
    res.status(500).json({ success: false, message: "Unable to send verification code." });
  }
}

async function confirmAuthenticatedPasswordChange(req, res) {
  try {
    const otp = String(req.body.otp || "").trim();
    const newPassword = req.body.newPassword || "";
    const user = await findUserById(req.auth.id);

    if (!user || !/^\d{6}$/.test(otp) || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    const reset = await findValidReset(user.id, otp);
    if (!reset) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    await runQuery("UPDATE users SET password_hash = ? WHERE id = ?", [await bcrypt.hash(newPassword, 10), user.id]);
    await runQuery("DELETE FROM password_resets WHERE user_id = ?", [user.id]);
    res.json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    console.error("Authenticated password-change confirmation failed:", error);
    res.status(500).json({ success: false, message: "Unable to change password." });
  }
}

module.exports = {
  forgotPassword,
  verifyOtp,
  resetPassword,
  requestAuthenticatedPasswordChange,
  confirmAuthenticatedPasswordChange
};
