const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");

const db = require("../config/db");
const {
  authCookieOptions,
  createToken,
  sanitizeUser
} = require("./authController");

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function runQuery(sql, params = []) {
  return db.promise().execute(sql, params);
}

async function ensureGoogleColumns() {
  const [columns] = await runQuery("SHOW COLUMNS FROM users");
  const existingColumns = new Set(
    columns.map((column) => column.Field)
  );

  if (!existingColumns.has("google_id")) {
    await runQuery(
      "ALTER TABLE users ADD COLUMN google_id VARCHAR(255) NULL"
    );
  }

  if (!existingColumns.has("profile_image")) {
    await runQuery(
      "ALTER TABLE users ADD COLUMN profile_image LONGTEXT NULL"
    );
  }

  if (!existingColumns.has("is_email_verified")) {
    await runQuery(
      "ALTER TABLE users ADD COLUMN is_email_verified BOOLEAN DEFAULT TRUE"
    );
  } else {
    await runQuery(
      "ALTER TABLE users MODIFY COLUMN is_email_verified BOOLEAN DEFAULT TRUE"
    );
  }
}

async function verifyGoogleCredential(credential) {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error("Google Client ID is not configured.");
  }

  const ticket = await googleClient.verifyIdToken({
    idToken: credential,
    audience: GOOGLE_CLIENT_ID
  });

  const payload = ticket.getPayload();

  if (!payload?.sub || !payload?.email) {
    throw new Error("Invalid Google token payload.");
  }

  if (payload.email_verified === false) {
    throw new Error("Google email is not verified.");
  }

  return {
    googleId: payload.sub,
    name: payload.name || payload.email.split("@")[0],
    email: payload.email.trim().toLowerCase(),
    profileImage: payload.picture || ""
  };
}

async function findUserByGoogleIdOrEmail(googleId, email) {
  const [rows] = await runQuery(
    `
      SELECT *
      FROM users
      WHERE google_id = ?
         OR email = ?
      LIMIT 1
    `,
    [googleId, email]
  );

  return rows[0];
}

async function createGoogleUser(profile) {
  const passwordHash =
    await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

  const fallbackPhone = `google:${profile.googleId}`.slice(0, 30);

  const [result] = await runQuery(
    `
      INSERT INTO users
      (name, email, phone, password_hash, google_id, profile_image, is_email_verified)
      VALUES (?, ?, ?, ?, ?, ?, TRUE)
    `,
    [
      profile.name.trim(),
      profile.email,
      fallbackPhone,
      passwordHash,
      profile.googleId,
      profile.profileImage
    ]
  );

  return {
    id: result.insertId,
    name: profile.name.trim(),
    email: profile.email,
    phone: fallbackPhone,
    profile_image: profile.profileImage
  };
}

async function updateExistingGoogleUser(user, profile) {
  await runQuery(
    `
      UPDATE users
      SET google_id = COALESCE(google_id, ?),
          profile_image = COALESCE(NULLIF(profile_image, ''), ?),
          is_email_verified = TRUE
      WHERE id = ?
    `,
    [
      profile.googleId,
      profile.profileImage,
      user.id
    ]
  );

  const [rows] = await runQuery(
    `
      SELECT id, name, email, phone, profile_image
      FROM users
      WHERE id = ?
      LIMIT 1
    `,
    [user.id]
  );

  return rows[0];
}

async function googleAuth(req, res) {
  try {
    const credential = req.body.credential;

    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential is required."
      });
    }

    await ensureGoogleColumns();

    const profile =
      await verifyGoogleCredential(credential);

    const existingUser =
      await findUserByGoogleIdOrEmail(
        profile.googleId,
        profile.email
      );

    const user = existingUser
      ? await updateExistingGoogleUser(existingUser, profile)
      : await createGoogleUser(profile);

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

    res.json({
      success: true,
      user: sanitizeUser(user)
    });
  } catch (error) {
    console.error("Google authentication failed:", error);

    res.status(401).json({
      success: false,
      message: error.message || "Google authentication failed"
    });
  }
}

module.exports = {
  googleAuth,
  ensureGoogleColumns
};
