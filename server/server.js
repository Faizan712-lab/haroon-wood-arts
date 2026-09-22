const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
require("dotenv").config();

require("./config/db");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const authRoutes = require("./routes/authRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const googleAuthRoutes = require("./routes/googleAuthRoutes");
const orderRoutes = require("./routes/orderRoutes");
const addressRoutes = require("./routes/addressRoutes");
const passwordResetRoutes = require("./routes/passwordResetRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const {
  getMyOrders
} = require("./controllers/orderController");
const {
  requireAuth
} = require("./middleware/authMiddleware");
const {
  cookieMutationProtection,
  requestShapeLimit
} = require("./middleware/securityMiddleware");

const app = express();

// Do not trust forwarded client IP headers unless the deployment explicitly
// configures a trusted reverse proxy. This keeps rate-limit keys non-spoofable.
const trustProxyHops = Number(process.env.TRUST_PROXY_HOPS || 0);
app.set("trust proxy", Number.isInteger(trustProxyHops) && trustProxyHops > 0 ? trustProxyHops : false);

const isProduction = process.env.NODE_ENV === "production";
const configuredOrigins = process.env.CLIENT_ORIGIN || (
  isProduction ? "" : "http://localhost:5173,http://192.168.1.16:5173"
);
const allowedOrigins = configuredOrigins
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

if (isProduction && allowedOrigins.length === 0) {
  throw new Error("CLIENT_ORIGIN must list the production frontend origin(s).");
}

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: isProduction ? { maxAge: 15552000, includeSubDomains: true } : false,
  referrerPolicy: { policy: "no-referrer" },
  frameguard: { action: "deny" },
  permissionsPolicy: {
    features: {
      camera: [], microphone: [], geolocation: [], payment: []
    }
  }
}));
app.use(express.json({ limit: "1mb" }));
app.use(requestShapeLimit());
app.use(cookieMutationProtection(allowedOrigins));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api", (req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});

app.get("/", (req, res) => {
  res.send("Haroon Wood Arts API is running");
});

app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "Backend is working successfully"
  });
});

app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminAuthRoutes);
app.use("/api/auth", googleAuthRoutes);
app.use("/api/password", passwordResetRoutes);
app.use("/api/addresses", addressRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.get(
  "/api/users/me/orders",
  requireAuth(["user"]),
  getMyOrders
);

app.use((error, req, res, next) => {
  if (
    error &&
    (
      error.code === "LIMIT_FILE_SIZE" ||
      error.code === "LIMIT_FILE_COUNT" ||
      error.message?.includes("images are allowed") ||
      error.message?.includes("JPG, PNG, and WEBP")
    )
  ) {
    return res.status(400).json({
      success: false,
      message: error.code === "LIMIT_FILE_SIZE"
        ? "Each image must be 5MB or smaller."
        : "Upload up to 8 JPG, PNG, or WEBP images."
    });
  }

  if (error?.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Invalid JSON request body." });
  }

  if (error?.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Request body is too large." });
  }

  console.error("Unhandled request error:", {
    route: req.method + " " + req.originalUrl,
    message: error?.message || "Unknown error"
  });

  return res.status(500).json({ success: false, message: "Internal server error." });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found"
  });
});

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Server listening on ${HOST}:${PORT}`);
});
