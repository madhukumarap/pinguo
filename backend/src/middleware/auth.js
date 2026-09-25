const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const db = require("../db");

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  if (!header.startsWith("Bearer ")) return null;
  return header.slice(7).trim();
}

function requireJwt(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: "Missing Bearer token" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

async function requireApiKey(req, res, next) {
  try {
    const rawKey = getBearerToken(req);
    if (!rawKey || !rawKey.startsWith("sk_")) {
      return res.status(401).json({ error: "Missing or invalid API key" });
    }

    const hash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const result = await db.query(
      `SELECT ak.id, ak.company_id
       FROM api_keys ak
       JOIN companies c ON c.id = ak.company_id
       WHERE ak.key_hash = $1
         AND ak.status = 'active'
         AND c.status = 'active'`,
      [hash]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: "Invalid API key" });
    }

    req.apiKey = result.rows[0];

    await db.query(
      "UPDATE api_keys SET last_used_at = NOW() WHERE id = $1",
      [req.apiKey.id]
    );

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = { requireJwt, requireApiKey };
