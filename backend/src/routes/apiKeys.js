const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { requireJwt } = require("../middleware/auth");

const router = express.Router();

router.use(requireJwt);

router.post("/", async (req, res, next) => {
  try {
    const name = req.body.name || "Default";

    const rawKey =
      "sk_live_" + crypto.randomBytes(24).toString("hex");

    const hash = crypto.createHash("sha256").update(rawKey).digest("hex");
    const prefix = rawKey.slice(0, 16);

    const result = await db.query(
      `INSERT INTO api_keys
       (company_id, name, key_prefix, key_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, key_prefix, status, created_at`,
      [req.user.companyId, name, prefix, hash]
    );

    res.status(201).json({
      message: "API key created. Store it now; it will not be shown again.",
      api_key: rawKey,
      data: result.rows[0]
    });
  } catch (error) {
    next(error);
  }
});

router.get("/", async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, name, key_prefix, status, last_used_at, created_at
       FROM api_keys
       WHERE company_id = $1
       ORDER BY created_at DESC`,
      [req.user.companyId]
    );

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
