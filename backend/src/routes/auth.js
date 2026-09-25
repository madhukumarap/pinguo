const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

router.post("/register", async (req, res, next) => {
  const { name, email, password, companyName } = req.body;

  if (!name || !email || !password || !companyName) {
    return res.status(400).json({
      error: "name, email, password and companyName are required"
    });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const companyResult = await client.query(
      `INSERT INTO companies (name, email)
       VALUES ($1, $2)
       RETURNING id, name, email`,
      [companyName, email.toLowerCase()]
    );

    const company = companyResult.rows[0];
    const passwordHash = await bcrypt.hash(password, 12);

    const userResult = await client.query(
      `INSERT INTO users (company_id, name, email, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, email, role`,
      [company.id, name, email.toLowerCase(), passwordHash]
    );

    const planResult = await client.query(
      "SELECT id FROM plans WHERE name = 'Starter' LIMIT 1"
    );

    await client.query(
      `INSERT INTO subscriptions (company_id, plan_id)
       VALUES ($1, $2)`,
      [company.id, planResult.rows[0].id]
    );

    await client.query(
      `INSERT INTO wallets (company_id, credits)
       VALUES ($1, 5000)`,
      [company.id]
    );

    await client.query(
      `INSERT INTO wallet_transactions
       (company_id, type, credits, reference, description)
       VALUES ($1, 'credit', 5000, 'WELCOME', 'Starter MVP credits')`,
      [company.id]
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Registration successful",
      user: userResult.rows[0],
      company
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const result = await db.query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.company_id,
              c.name AS company_name
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.email = $1`,
      [String(email || "").toLowerCase()]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password || "", user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = jwt.sign(
      {
        userId: user.id,
        companyId: user.company_id,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyName: user.company_name
      }
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
