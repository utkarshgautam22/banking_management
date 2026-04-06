const pool = require('../db/pool');

// GET /api/accounts  — Customer: own accounts; Employee/Admin: all or by customer
const getAccounts = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    let result;

    if (role === 'Customer') {
      result = await pool.query(
        `SELECT a.*, b.branch_name
         FROM account a LEFT JOIN branch b ON a.branch_id = b.branch_id
         WHERE a.customer_id = $1 ORDER BY a.created_at ASC`,
        [id]
      );
    } else {
      const { customer_id } = req.query;
      if (customer_id) {
        result = await pool.query(
          `SELECT a.*, b.branch_name, c.first_name || ' ' || c.last_name AS customer_name
           FROM account a
           LEFT JOIN branch b ON a.branch_id = b.branch_id
           LEFT JOIN customer c ON a.customer_id = c.customer_id
           WHERE a.customer_id = $1 ORDER BY a.created_at ASC`,
          [customer_id]
        );
      } else {
        result = await pool.query(
          `SELECT a.*, b.branch_name, c.first_name || ' ' || c.last_name AS customer_name
           FROM account a
           LEFT JOIN branch b ON a.branch_id = b.branch_id
           LEFT JOIN customer c ON a.customer_id = c.customer_id
           ORDER BY a.created_at DESC LIMIT 100`
        );
      }
    }

    res.json({ success: true, accounts: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/accounts/:id
const getAccount = async (req, res, next) => {
  try {
    const { id: accountId } = req.params;
    const { role, id: userId } = req.user;

    const result = await pool.query(
      `SELECT a.*, b.branch_name, c.first_name || ' ' || c.last_name AS customer_name
       FROM account a
       LEFT JOIN branch b ON a.branch_id = b.branch_id
       LEFT JOIN customer c ON a.customer_id = c.customer_id
       WHERE a.account_id = $1`,
      [accountId]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const account = result.rows[0];
    if (role === 'Customer' && account.customer_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    res.json({ success: true, account });
  } catch (err) {
    next(err);
  }
};

// POST /api/accounts — Admin/Employee can create accounts
const createAccount = async (req, res, next) => {
  try {
    const { customer_id, branch_id, account_type } = req.body;
    const accNumber = 'ACC' + Date.now().toString().slice(-10);

    const result = await pool.query(
      `INSERT INTO account (customer_id, branch_id, account_number, account_type, balance, status)
       VALUES ($1, $2, $3, $4, 0.00, 'Active')
       RETURNING *`,
      [customer_id, branch_id, accNumber, account_type || 'Savings']
    );

    res.status(201).json({ success: true, account: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/accounts/:id/status — Admin can freeze/close accounts
const updateAccountStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const result = await pool.query(
      `UPDATE account SET status = $1, updated_at = NOW() WHERE account_id = $2 RETURNING *`,
      [status, id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    res.json({ success: true, account: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

module.exports = { getAccounts, getAccount, createAccount, updateAccountStatus };
