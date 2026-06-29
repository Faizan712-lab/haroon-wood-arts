const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required.");
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

function getToken(req, allowedRoles = []) {
  const authHeader = req.headers.authorization || "";

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  if (
    allowedRoles.includes("admin") ||
    req.query.role === "admin"
  ) {
    return getCookie(req, "adminToken");
  }

  if (
    allowedRoles.includes("user") ||
    req.query.role === "user"
  ) {
    return getCookie(req, "userToken");
  }

  return (
    getCookie(req, "userToken") ||
    getCookie(req, "adminToken")
  );
}

function requireAuth(allowedRoles = []) {
  return (req, res, next) => {
    const token =
      getToken(req, allowedRoles);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authenticated"
      });
    }

    try {
      const decoded =
        jwt.verify(token, JWT_SECRET);

      if (
        allowedRoles.length > 0 &&
        !allowedRoles.includes(decoded.role)
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied"
        });
      }

      req.auth = decoded;
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired session"
      });
    }
  };
}

function optionalAuth(allowedRoles = []) {
  return (req, res, next) => {
    const token =
      getToken(req, allowedRoles);

    if (!token) {
      return next();
    }

    try {
      const decoded =
        jwt.verify(token, JWT_SECRET);

      if (
        allowedRoles.length === 0 ||
        allowedRoles.includes(decoded.role)
      ) {
        req.auth = decoded;
      }
    } catch {
      req.auth = null;
    }

    next();
  };
}

module.exports = {
  requireAuth,
  optionalAuth
};
