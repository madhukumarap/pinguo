const express = require("express");
const crypto = require("crypto");
const db = require("../db");
const { requireApiKey } = require("../middleware/auth");

const router = express.Router();

function validateIndianMobile(to) {
  return /^91[6-9]\d{9}$/.test(to);
}

function countSegments(message) {
  // Simple MVP approximation:
  // GSM-like messages <= 160 chars = 1 segment.
  // Unicode/long messages are treated conservatively.
  return message.length <= 160 ? 1 : Math.ceil(message.length / 153);
}

router.post("/send", requireApiKey, async (req, res, next) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({
      error: "to and message are required"
    });
  }

  if (!validateIndianMobile(to)) {
    return res.status(400).json({
      error: "Use Indian number format such as 919876543210"
    });
  }

  if (message.length > 5000) {
    return res.status(400).json({ error: "Message is too long" });
  }

  const segments = countSegments(message);
  const costCredits = segments;

  const client = await db.pool.connect();

  try {
    await client.query("BEGIN");

    const walletResult = await client.query(
      "SELECT credits FROM wallets WHERE company_id = $1 FOR UPDATE",
      [req.apiKey.company_id]
    );

    if (!walletResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(400).json({ error: "Wallet not found" });
    }

    const credits = walletResult.rows[0].credits;

    if (credits < costCredits) {
      await client.query("ROLLBACK");
      return res.status(402).json({
        error: "Insufficient SMS credits",
        required: costCredits,
        available: credits
      });
    }

    const providerMessageId =
      "MOCK_" + crypto.randomBytes(10).toString("hex");

    const smsResult = await client.query(
      `INSERT INTO sms_messages
       (company_id, api_key_id, to_number, message, message_type,
        segments, cost_credits, status, provider_message_id, submitted_at)
       VALUES ($1, $2, $3, $4, 'transactional', $5, $6,
               'submitted', $7, NOW())
       RETURNING id, to_number, message, status, segments,
                 cost_credits, provider_message_id, created_at`,
      [
        req.apiKey.company_id,
        req.apiKey.id,
        to,
        message,
        segments,
        costCredits,
        providerMessageId
      ]
    );

    await client.query(
      `UPDATE wallets
       SET credits = credits - $1, updated_at = NOW()
       WHERE company_id = $2`,
      [costCredits, req.apiKey.company_id]
    );

    await client.query(
      `INSERT INTO wallet_transactions
       (company_id, type, credits, reference, description)
       VALUES ($1, 'debit', $2, $3, $4)`,
      [
        req.apiKey.company_id,
        costCredits,
        smsResult.rows[0].id,
        `SMS sent to ${to}`
      ]
    );

    await client.query("COMMIT");

    // MOCK delivery. Replace this section with your SMS transport/SMPP worker.
    setTimeout(async () => {
      try {
        await db.query(
          `UPDATE sms_messages
           SET status = 'delivered', delivered_at = NOW()
           WHERE id = $1`,
          [smsResult.rows[0].id]
        );

        await db.query(
          `INSERT INTO delivery_reports
           (sms_message_id, status, provider, raw_response)
           VALUES ($1, 'delivered', 'MOCK', $2)`,
          [smsResult.rows[0].id, JSON.stringify({ simulated: true })]
        );
      } catch (e) {
        console.error("Mock delivery update failed:", e.message);
      }
    }, 1500);

    res.status(202).json({
      success: true,
      message_id: smsResult.rows[0].id,
      provider_message_id: providerMessageId,
      status: "submitted",
      segments,
      credits_used: costCredits
    });
  } catch (error) {
    await client.query("ROLLBACK");
    next(error);
  } finally {
    client.release();
  }
});

router.get("/:id", requireApiKey, async (req, res, next) => {
  try {
    const result = await db.query(
      `SELECT id, to_number, message, message_type, segments,
              cost_credits, status, provider_message_id,
              created_at, submitted_at, delivered_at
       FROM sms_messages
       WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.apiKey.company_id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Message not found" });
    }

    res.json({ data: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
