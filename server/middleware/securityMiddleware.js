const rateLimit = require("express-rate-limit");

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function sensitiveRateLimiter(name, fallbackLimit) {
  const limit = positiveInteger(process.env[`RATE_LIMIT_${name}_MAX`], fallbackLimit);
  const windowMinutes = positiveInteger(process.env.RATE_LIMIT_WINDOW_MINUTES, 15);

  return rateLimit({
    windowMs: windowMinutes * 60 * 1000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler(req, res) {
      console.warn("Rate limit exceeded", { route: req.baseUrl + req.path, ip: req.ip });
      res.status(429).json({ success: false, message: "Too many attempts. Please try again later." });
    }
  });
}

function cookieMutationProtection(allowedOrigins) {
  return (req, res, next) => {
    if (!/^(POST|PUT|PATCH|DELETE)$/i.test(req.method)) return next();

    const hasSessionCookie = /(?:^|;\s*)(?:userToken|adminToken)=/.test(req.headers.cookie || "");
    if (!hasSessionCookie) return next();

    const origin = req.headers.origin;
    if (origin && !allowedOrigins.includes(origin)) {
      console.warn("Blocked cross-origin cookie mutation", { route: req.originalUrl, origin, ip: req.ip });
      return res.status(403).json({ success: false, message: "Request origin is not allowed." });
    }

    const fetchSite = req.headers["sec-fetch-site"];
    if (fetchSite === "cross-site") {
      return res.status(403).json({ success: false, message: "Cross-site request blocked." });
    }

    return next();
  };
}

function requestShapeLimit(maxDepth = 12, maxKeys = 250) {
  function inspect(value, depth = 0) {
    if (depth > maxDepth) return false;
    if (!value || typeof value !== "object") return true;
    const entries = Object.values(value);
    if (entries.length > maxKeys) return false;
    return entries.every(entry => inspect(entry, depth + 1));
  }

  return (req, res, next) => {
    if (!inspect(req.body)) {
      return res.status(400).json({ success: false, message: "Request payload is too complex." });
    }
    return next();
  };
}

module.exports = { sensitiveRateLimiter, cookieMutationProtection, requestShapeLimit };
