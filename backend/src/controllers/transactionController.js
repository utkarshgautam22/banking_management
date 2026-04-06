const pool = require('../db/pool');
const { runFraudDetection } = require('../services/fraudDetector');

const parsePositiveAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
};

const parsePagination = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  if (typeof max === 'number') return Math.min(parsed, max);
  return parsed;
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/transactions
// Customer: own txns; Employee/Admin: all or filtered
// ─────────────────────────────────────────────────────────────────────
const getTransactions = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    const { account_id, type } = req.query;
    const limit = parsePagination(req.query.limit, 20, 100);
    const offset = parsePagination(req.query.offset, 0);
    const accountId = account_id ? Number.parseInt(account_id, 10) : null;
    const txnType = type && ['Deposit', 'Withdrawal', 'Transfer', 'Loan_Disbursement', 'Loan_Repayment'].includes(type)
      ? type
      : null;

    let query, params;

    if (role === 'Customer') {
      query = `
        SELECT t.*, a.account_number
        FROM transaction t
        JOIN account a ON t.account_id = a.account_id
        WHERE a.customer_id = $1
        ${txnType ? "AND t.transaction_type = $4" : ""}
        ORDER BY t.transaction_time DESC
        LIMIT $2 OFFSET $3
      `;
      params = txnType ? [id, limit, offset, txnType] : [id, limit, offset];
    } else if (accountId) {
      query = `
        SELECT t.*, a.account_number, c.first_name || ' ' || c.last_name AS customer_name
        FROM transaction t
        JOIN account a ON t.account_id = a.account_id
        JOIN customer c ON a.customer_id = c.customer_id
        WHERE t.account_id = $1
        ORDER BY t.transaction_time DESC
        LIMIT $2 OFFSET $3
      `;
      params = [accountId, limit, offset];
    } else {
      query = `
        SELECT t.*, a.account_number, c.first_name || ' ' || c.last_name AS customer_name
        FROM transaction t
        JOIN account a ON t.account_id = a.account_id
        JOIN customer c ON a.customer_id = c.customer_id
        ORDER BY t.transaction_time DESC
        LIMIT $1 OFFSET $2
      `;
      params = [limit, offset];
    }

    const result = await pool.query(query, params);
    res.json({ success: true, transactions: result.rows });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/transactions/deposit
// ─────────────────────────────────────────────────────────────────────
const deposit = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { account_id, amount, description } = req.body;
    const { id: userId, role } = req.user;
    const normalizedAmount = parsePositiveAmount(amount);

    if (!normalizedAmount) {
      return res.status(400).json({ success: false, message: 'Invalid deposit amount.' });
    }

    await client.query('BEGIN');

    // Lock the account row
    const accResult = await client.query(
      'SELECT * FROM account WHERE account_id = $1 FOR UPDATE',
      [account_id]
    );
    if (!accResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const account = accResult.rows[0];

    // Customers can only deposit to their own accounts
    if (role === 'Customer' && account.customer_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (account.status !== 'Active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Account is ${account.status}. Cannot deposit.` });
    }

    // Update balance
    const newBalance = Number(account.balance) + normalizedAmount;
    await client.query(
      'UPDATE account SET balance = $1, updated_at = NOW() WHERE account_id = $2',
      [newBalance, account_id]
    );

    // Record transaction
    const txnResult = await client.query(
      `INSERT INTO transaction (account_id, amount, transaction_type, description, status)
       VALUES ($1, $2, 'Deposit', $3, 'Completed')
       RETURNING *`,
      [account_id, normalizedAmount, description || 'Deposit']
    );
    const txn = txnResult.rows[0];

    // Notification
    await client.query(
      `INSERT INTO notification (user_type, user_id, title, message, type)
       VALUES ('Customer', $1, 'Deposit Successful', $2, 'success')`,
      [account.customer_id, `₹${normalizedAmount.toLocaleString()} has been deposited to account ${account.account_number}`]
    );

    await client.query('COMMIT');

    // Run fraud detection (non-blocking)
    runFraudDetection(txn.transaction_id, account_id, normalizedAmount, 'Deposit').catch(console.error);

    res.json({
      success: true,
      message: 'Deposit successful',
      transaction: txn,
      new_balance: newBalance
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/transactions/withdraw
// ─────────────────────────────────────────────────────────────────────
const withdraw = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { account_id, amount, description } = req.body;
    const { id: userId, role } = req.user;
    const normalizedAmount = parsePositiveAmount(amount);

    if (!normalizedAmount) {
      return res.status(400).json({ success: false, message: 'Invalid withdrawal amount.' });
    }

    await client.query('BEGIN');

    const accResult = await client.query(
      'SELECT * FROM account WHERE account_id = $1 FOR UPDATE',
      [account_id]
    );
    if (!accResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Account not found.' });
    }

    const account = accResult.rows[0];

    if (role === 'Customer' && account.customer_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (account.status !== 'Active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Account is ${account.status}.` });
    }

    if (Number(account.balance) < normalizedAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Insufficient balance.' });
    }

    const newBalance = Number(account.balance) - normalizedAmount;
    await client.query(
      'UPDATE account SET balance = $1, updated_at = NOW() WHERE account_id = $2',
      [newBalance, account_id]
    );

    const txnResult = await client.query(
      `INSERT INTO transaction (account_id, amount, transaction_type, description, status)
       VALUES ($1, $2, 'Withdrawal', $3, 'Completed')
       RETURNING *`,
      [account_id, normalizedAmount, description || 'Withdrawal']
    );
    const txn = txnResult.rows[0];

    await client.query(
      `INSERT INTO notification (user_type, user_id, title, message, type)
       VALUES ('Customer', $1, 'Withdrawal Processed', $2, 'info')`,
      [account.customer_id, `₹${normalizedAmount.toLocaleString()} withdrawn from account ${account.account_number}`]
    );

    await client.query('COMMIT');

    runFraudDetection(txn.transaction_id, account_id, normalizedAmount, 'Withdrawal').catch(console.error);

    res.json({
      success: true,
      message: 'Withdrawal successful',
      transaction: txn,
      new_balance: newBalance
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/transactions/transfer
// ─────────────────────────────────────────────────────────────────────
const transfer = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { from_account_id, to_account_number, amount, transfer_mode, description } = req.body;
    const { id: userId, role } = req.user;
    const normalizedAmount = parsePositiveAmount(amount);

    if (!normalizedAmount) {
      return res.status(400).json({ success: false, message: 'Invalid transfer amount.' });
    }

    await client.query('BEGIN');

    // Lock source account
    const fromResult = await client.query(
      'SELECT * FROM account WHERE account_id = $1 FOR UPDATE',
      [from_account_id]
    );
    if (!fromResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Source account not found.' });
    }

    const fromAccount = fromResult.rows[0];

    if (role === 'Customer' && fromAccount.customer_id !== userId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Access denied to source account.' });
    }

    if (fromAccount.status !== 'Active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Source account is ${fromAccount.status}.` });
    }

    if (Number(fromAccount.balance) < normalizedAmount) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Insufficient balance.' });
    }

    // Find destination account
    const toResult = await client.query(
      'SELECT * FROM account WHERE account_number = $1 FOR UPDATE',
      [to_account_number]
    );
    if (!toResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Destination account not found.' });
    }

    const toAccount = toResult.rows[0];

    if (toAccount.status !== 'Active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Destination account is not active.' });
    }

    if (toAccount.account_id === fromAccount.account_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Cannot transfer to same account.' });
    }

    const newFromBalance = Number(fromAccount.balance) - normalizedAmount;
    const newToBalance = Number(toAccount.balance) + normalizedAmount;

    // Update balances
    await client.query('UPDATE account SET balance = $1, updated_at = NOW() WHERE account_id = $2', [newFromBalance, fromAccount.account_id]);
    await client.query('UPDATE account SET balance = $1, updated_at = NOW() WHERE account_id = $2', [newToBalance, toAccount.account_id]);

    // Record debit transaction
    const debitTxn = await client.query(
      `INSERT INTO transaction (account_id, amount, transaction_type, description, status)
       VALUES ($1, $2, 'Transfer', $3, 'Completed') RETURNING *`,
      [fromAccount.account_id, normalizedAmount, description || `Transfer to ${to_account_number}`]
    );

    // Record credit transaction
    await client.query(
      `INSERT INTO transaction (account_id, amount, transaction_type, description, status)
       VALUES ($1, $2, 'Transfer', $3, 'Completed')`,
      [toAccount.account_id, normalizedAmount, `Transfer from ${fromAccount.account_number}`]
    );

    // Transfer record
    await client.query(
      `INSERT INTO transfer (from_account_id, to_account_id, amount, transfer_mode, description, status)
       VALUES ($1, $2, $3, $4, $5, 'Completed')`,
      [fromAccount.account_id, toAccount.account_id, normalizedAmount, transfer_mode || 'NEFT', description || 'Fund transfer']
    );

    // Notifications
    await client.query(
      `INSERT INTO notification (user_type, user_id, title, message, type)
       VALUES ('Customer', $1, 'Transfer Sent', $2, 'info'),
              ('Customer', $3, 'Amount Received', $4, 'success')`,
      [
        fromAccount.customer_id, `₹${normalizedAmount.toLocaleString()} transferred to ${to_account_number}`,
        toAccount.customer_id, `₹${normalizedAmount.toLocaleString()} received from ${fromAccount.account_number}`
      ]
    );

    await client.query('COMMIT');

    runFraudDetection(debitTxn.rows[0].transaction_id, fromAccount.account_id, normalizedAmount, 'Transfer').catch(console.error);

    res.json({
      success: true,
      message: 'Transfer successful',
      transaction: debitTxn.rows[0],
      new_balance: newFromBalance
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// GET /api/transactions/stats — Dashboard summary
const getStats = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    let customerFilter = '';
    let params = [];

    if (role === 'Customer') {
      customerFilter = 'AND a.customer_id = $1';
      params = [id];
    }

    const [totalTxns, totalVolume, todayTxns] = await Promise.all([
      pool.query(`SELECT COUNT(*) FROM transaction t JOIN account a ON t.account_id = a.account_id WHERE 1=1 ${customerFilter}`, params),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM transaction t JOIN account a ON t.account_id = a.account_id WHERE 1=1 ${customerFilter}`, params),
      pool.query(`SELECT COUNT(*) FROM transaction t JOIN account a ON t.account_id = a.account_id WHERE DATE(t.transaction_time) = CURRENT_DATE ${customerFilter}`, params),
    ]);

    res.json({
      success: true,
      stats: {
        total_transactions: parseInt(totalTxns.rows[0].count),
        total_volume: parseFloat(totalVolume.rows[0].total),
        today_transactions: parseInt(todayTxns.rows[0].count),
      }
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getTransactions, deposit, withdraw, transfer, getStats };
