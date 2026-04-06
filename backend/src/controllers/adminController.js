const pool = require('../db/pool');
const bcrypt = require('bcryptjs');

// ─── Customers ───
const getCustomers = async (req, res, next) => {
  try {
    const { search, kyc_status } = req.query;
    let query = `
      SELECT c.*, COUNT(a.account_id) AS account_count
      FROM customer c
      LEFT JOIN account a ON c.customer_id = a.customer_id
    `;
    const params = [];
    const conditions = [];

    if (search) {
      conditions.push(`(c.first_name ILIKE $${params.length + 1} OR c.last_name ILIKE $${params.length + 1} OR c.email ILIKE $${params.length + 1})`);
      params.push(`%${search}%`);
    }
    if (kyc_status) {
      conditions.push(`c.kyc_status = $${params.length + 1}`);
      params.push(kyc_status);
    }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ' GROUP BY c.customer_id ORDER BY c.created_at DESC';

    const result = await pool.query(query, params);
    res.json({ success: true, customers: result.rows });
  } catch (err) { next(err); }
};

const getCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT c.*, COUNT(a.account_id) AS account_count
       FROM customer c LEFT JOIN account a ON c.customer_id = a.customer_id
       WHERE c.customer_id = $1 GROUP BY c.customer_id`,
      [id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Customer not found.' });
    res.json({ success: true, customer: result.rows[0] });
  } catch (err) { next(err); }
};

const updateKyc = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { kyc_status } = req.body;
    const result = await pool.query(
      'UPDATE customer SET kyc_status = $1, updated_at = NOW() WHERE customer_id = $2 RETURNING *',
      [kyc_status, id]
    );
    if (!result.rows.length) return res.status(404).json({ success: false, message: 'Customer not found.' });
    res.json({ success: true, customer: result.rows[0] });
  } catch (err) { next(err); }
};

// ─── Users (Admin) ───
const deactivateUser = async (req, res, next) => {
  try {
    const { id, type } = req.params; // type: customer | employee
    if (!['customer', 'employee'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid user type.' });
    }

    const table = type === 'employee' ? 'employee' : 'customer';
    const idCol = type === 'employee' ? 'employee_id' : 'customer_id';

    const result = await pool.query(
      `UPDATE ${table} SET is_active = false, updated_at = NOW() WHERE ${idCol} = $1 RETURNING ${idCol}`,
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: `${type} not found.` });
    }

    res.json({ success: true, message: `${type} deactivated` });
  } catch (err) { next(err); }
};

// ─── Employees (Admin) ───
const getEmployees = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT e.*, b.branch_name FROM employee e LEFT JOIN branch b ON e.branch_id = b.branch_id ORDER BY e.created_at DESC`
    );
    res.json({ success: true, employees: result.rows });
  } catch (err) { next(err); }
};

const createEmployee = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, branch_id } = req.body;
    const password_hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO employee (name, email, password_hash, role, phone, branch_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING employee_id, name, email, role, branch_id, created_at`,
      [name, email, password_hash, role || 'Teller', phone, branch_id]
    );
    res.status(201).json({ success: true, employee: result.rows[0] });
  } catch (err) { next(err); }
};

// ─── System Stats (Admin) ───
const getSystemStats = async (req, res, next) => {
  try {
    const [customers, accounts, transactions, loans, fraudAlerts, totalBalance] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM customer WHERE is_active = true'),
      pool.query('SELECT COUNT(*) FROM account WHERE status = \'Active\''),
      pool.query('SELECT COUNT(*) FROM transaction'),
      pool.query('SELECT COUNT(*) FILTER (WHERE loan_status = \'Pending\') AS pending, COUNT(*) FILTER (WHERE loan_status = \'Active\') AS active FROM loan'),
      pool.query('SELECT COUNT(*) FILTER (WHERE status = \'Open\') AS open, COUNT(*) AS total FROM fraud_alert'),
      pool.query('SELECT COALESCE(SUM(balance),0) AS total FROM account WHERE status = \'Active\''),
    ]);

    res.json({
      success: true,
      stats: {
        total_customers: parseInt(customers.rows[0].count),
        active_accounts: parseInt(accounts.rows[0].count),
        total_transactions: parseInt(transactions.rows[0].count),
        pending_loans: parseInt(loans.rows[0].pending),
        active_loans: parseInt(loans.rows[0].active),
        open_fraud_alerts: parseInt(fraudAlerts.rows[0].open),
        total_fraud_alerts: parseInt(fraudAlerts.rows[0].total),
        total_balance_under_management: parseFloat(totalBalance.rows[0].total),
      }
    });
  } catch (err) { next(err); }
};

// ─── Reports (Admin) ───
const getReports = async (req, res, next) => {
  try {
    const [monthlyTxns, txnByType, loansByType, fraudByLevel] = await Promise.all([
      pool.query(`
        SELECT TO_CHAR(DATE_TRUNC('month', transaction_time), 'Mon YYYY') AS month,
               COUNT(*) AS count, COALESCE(SUM(amount),0) AS volume
        FROM transaction
        WHERE transaction_time > NOW() - INTERVAL '6 months'
        GROUP BY DATE_TRUNC('month', transaction_time)
        ORDER BY DATE_TRUNC('month', transaction_time)
      `),
      pool.query(`
        SELECT transaction_type, COUNT(*) AS count, COALESCE(SUM(amount),0) AS volume
        FROM transaction GROUP BY transaction_type
      `),
      pool.query(`
        SELECT loan_type, COUNT(*) AS count, COALESCE(SUM(loan_amount),0) AS total_amount
        FROM loan GROUP BY loan_type
      `),
      pool.query(`
        SELECT alert_level, COUNT(*) AS count FROM fraud_alert GROUP BY alert_level
      `),
    ]);

    res.json({
      success: true,
      reports: {
        monthly_transactions: monthlyTxns.rows,
        transactions_by_type: txnByType.rows,
        loans_by_type: loansByType.rows,
        fraud_by_level: fraudByLevel.rows,
      }
    });
  } catch (err) { next(err); }
};

// ─── Customer Self-Update ───
const updateProfile = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const { phone, address } = req.body;

    if (role === 'Customer') {
      const result = await pool.query(
        'UPDATE customer SET phone = $1, address = $2, updated_at = NOW() WHERE customer_id = $3 RETURNING *',
        [phone, address, id]
      );
      return res.json({ success: true, user: result.rows[0] });
    }
    res.status(400).json({ success: false, message: 'Not supported for this role' });
  } catch (err) { next(err); }
};

const getBranches = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM branch ORDER BY branch_name');
    res.json({ success: true, branches: result.rows });
  } catch (err) { next(err); }
};

module.exports = {
  getCustomers, getCustomer, updateKyc, deactivateUser,
  getEmployees, createEmployee, getSystemStats, getReports,
  updateProfile, getBranches
};
