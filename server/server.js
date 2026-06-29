const express = require("express");
const cors = require("cors");
require("dotenv").config();

require("./config/db");
const productRoutes = require("./routes/productRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const authRoutes = require("./routes/authRoutes");
const adminAuthRoutes = require("./routes/adminAuthRoutes");
const {
  ensureAdminSchema
} = require("./controllers/adminAuthController");
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

const app = express();

ensureAdminSchema().catch(error => {
  console.error("Admin schema guard failed:", error);
});

const allowedOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:5173")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));
app.use(express.json({ limit: "10mb" }));

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
