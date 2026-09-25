require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const apiKeyRoutes = require("./routes/apiKeys");
const smsRoutes = require("./routes/sms");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173"
}));

app.use(express.json({ limit: "1mb" }));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "sms-saas-api"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/keys", apiKeyRoutes);
app.use("/v1/sms", smsRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((err, req, res, next) => {
  console.error(err);

  if (err.code === "23505") {
    return res.status(409).json({
      error: "A record with this value already exists"
    });
  }

  res.status(500).json({
    error: "Internal server error"
  });
});

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`SMS SaaS API running on http://localhost:${port}`);
});
