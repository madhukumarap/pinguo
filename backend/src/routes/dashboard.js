const express = require("express");
const db = require("../db");
const { requireJwt } = require("../middleware/auth");

const router = express.Router();

router.use(requireJwt);

router.get("/summary", async (req, res, next) => {
  try {
    const wallet = await db.query(
      "SELECT credits FROM wallets WHERE company_id = $1",
      [req.user.companyId]
    );

    const sms = await db.query(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = 'delivered')::int AS delivered,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed
       FROM sms_messages
       WHERE company_id = $1`,
      [req.user.companyId]
    );

    const plan = await db.query(
      `SELECT p.name, p.monthly_sms, p.monthly_price_paise,
              s.status, s.renews_at
       FROM subscriptions s
       JOIN plans p ON p.id = s.plan_id
       WHERE s.company_id = $1`,
      [req.user.companyId]
    );

    res.json({
      credits: wallet.rows[0]?.credits || 0,
      sms: sms.rows[0],
      subscription: plan.rows[0] || null
    });
  } catch (error) {
    next(error);
  }
});

router.get("/messages", async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, to_number, message, status, segments,
              cost_credits, created_at, delivered_at
       FROM sms_messages
       WHERE company_id = $1
       ORDER BY created_at DESC
       LIMIT 100`,
      [req.user.companyId]
    );

    res.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
