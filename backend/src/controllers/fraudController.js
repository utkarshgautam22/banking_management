const pool = require('../db/pool');

// GET /api/fraud — Employee/Admin see all alerts; Customer sees own
const getFraudAlerts = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { status, level } = req.query;
    let params = [];
    let conditions = [];

    let query = `
      SELECT fa.*, t.amount, t.transaction_type, t.transaction_time,
             a.account_number, c.first_name || ' ' || c.last_name AS customer_name,
             e.name AS resolved_by_name
      FROM fraud_alert fa
      LEFT JOIN transaction t ON fa.transaction_id = t.transaction_id
      LEFT JOIN account a ON fa.account_id = a.account_id
      LEFT JOIN customer c ON a.customer_id = c.customer_id
      LEFT JOIN employee e ON fa.resolved_by = e.employee_id
    `;

    if (role === 'Customer') {
      conditions.push(`a.customer_id = $${params.length + 1}`);
      params.push(id);
    }
    if (status) {
      conditions.push(`fa.status = $${params.length + 1}`);
      params.push(status);
    }
    if (level) {
      conditions.push(`fa.alert_level = $${params.length + 1}`);
      params.push(level);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY fa.detected_time DESC LIMIT 100';

    const result = await pool.query(query, params);
    res.json({ success: true, alerts: result.rows });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/fraud/:id/resolve
const resolveAlert = async (req, res, next) => {
  try {
    const { id: alertId } = req.params;
    const { id: employeeId } = req.user;

    const result = await pool.query(
      `UPDATE fraud_alert
       SET status = 'Resolved', resolved_by = $1, resolved_at = NOW()
       WHERE alert_id = $2
       RETURNING *`,
      [employeeId, alertId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Alert not found.' });
    }

    res.json({ success: true, message: 'Alert resolved', alert: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/fraud/:id/dismiss
const dismissAlert = async (req, res, next) => {
  try {
    const { id: alertId } = req.params;

    const result = await pool.query(
      `UPDATE fraud_alert SET status = 'Dismissed' WHERE alert_id = $1 RETURNING *`,
      [alertId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Alert not found.' });
    }

    res.json({ success: true, message: 'Alert dismissed', alert: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// GET /api/fraud/stats
const getFraudStats = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'Open')         AS open_count,
        COUNT(*) FILTER (WHERE status = 'Resolved')     AS resolved_count,
        COUNT(*) FILTER (WHERE status = 'Investigating')AS investigating_count,
        COUNT(*) FILTER (WHERE alert_level = 'Critical')AS critical_count,
        COUNT(*) FILTER (WHERE alert_level = 'High')    AS high_count,
        COUNT(*)                                         AS total_count
      FROM fraud_alert
    `);

    res.json({ success: true, stats: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { getFraudAlerts, resolveAlert, dismissAlert, getFraudStats };
