const pool = require('../db/pool');

// ─────────────────────────────────────────────────────────────────────
// Fraud Detection Rules Engine
// Called after every transaction
// ─────────────────────────────────────────────────────────────────────
const runFraudDetection = async (transactionId, accountId, amount, txnType) => {
  const alerts = [];

  // Rule 1: Large transaction threshold (> 50,000)
  if (parseFloat(amount) > 50000) {
    alerts.push({
      reason: `Large ${txnType} amount of ₹${parseFloat(amount).toLocaleString()} exceeds threshold`,
      level: parseFloat(amount) > 100000 ? 'Critical' : 'High'
    });
  }

  // Rule 2: Rapid fire — more than 5 transactions in last 60 minutes
  const rapidResult = await pool.query(
    `SELECT COUNT(*) FROM transaction
     WHERE account_id = $1
     AND transaction_time > NOW() - INTERVAL '60 minutes'`,
    [accountId]
  );
  const txnCount = parseInt(rapidResult.rows[0].count);
  if (txnCount > 5) {
    alerts.push({
      reason: `Suspicious activity: ${txnCount} transactions in the last 60 minutes`,
      level: txnCount > 10 ? 'Critical' : 'High'
    });
  }

  // Rule 3: Multiple large withdrawals in same day
  if (txnType === 'Withdrawal' || txnType === 'Transfer') {
    const dailyResult = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS daily_total
       FROM transaction
       WHERE account_id = $1
       AND transaction_type IN ('Withdrawal','Transfer')
       AND DATE(transaction_time) = CURRENT_DATE`,
      [accountId]
    );
    const dailyTotal = parseFloat(dailyResult.rows[0].daily_total);
    if (dailyTotal > 100000) {
      alerts.push({
        reason: `Daily outflow of ₹${dailyTotal.toLocaleString()} exceeds safe limit`,
        level: 'High'
      });
    }
  }

  // Insert all fraud alerts
  if (alerts.length > 0) {
    const accResult = await pool.query('SELECT customer_id FROM account WHERE account_id = $1', [accountId]);
    const customerId = accResult.rows[0]?.customer_id;

    for (const alert of alerts) {
      await pool.query(
        `INSERT INTO fraud_alert (transaction_id, account_id, alert_reason, alert_level, status)
         VALUES ($1, $2, $3, $4, 'Open')`,
        [transactionId, accountId, alert.reason, alert.level]
      );

      // Notify admin (admin_id = 1 as primary)
      await pool.query(
        `INSERT INTO notification (user_type, user_id, title, message, type)
         VALUES ('Admin', 1, 'Fraud Alert: ${alert.level}', $1, 'fraud')`,
        [`[Account ${accountId}] ${alert.reason}`]
      );

      // Notify customer
      if (customerId) {
        await pool.query(
          `INSERT INTO notification (user_type, user_id, title, message, type)
           VALUES ('Customer', $1, 'Security Alert', $2, 'warning')`,
          [customerId, `Suspicious activity detected on your account. Alert level: ${alert.level}`]
        );
      }
    }

    console.log(`🚨 Fraud detection: ${alerts.length} alert(s) for account ${accountId}`);
  }
};

module.exports = { runFraudDetection };
