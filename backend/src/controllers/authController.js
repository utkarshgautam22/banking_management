const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// Body: { email, password, role }  role: Customer | Employee | Admin
// ─────────────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    let user = null;
    let userId = null;

    if (role === 'Customer') {
      const result = await pool.query(
        `SELECT customer_id AS id, first_name || ' ' || last_name AS name, email, password_hash, is_active, kyc_status
         FROM customer WHERE email = $1`,
        [email]
      );
      user = result.rows[0];
      if (user) userId = user.id;
    } else if (role === 'Employee') {
      const result = await pool.query(
        `SELECT employee_id AS id, name, email, password_hash, role AS sub_role, is_active, branch_id
         FROM employee WHERE email = $1`,
        [email]
      );
      user = result.rows[0];
      if (user) userId = user.id;
    } else if (role === 'Admin') {
      const result = await pool.query(
        `SELECT admin_id AS id, name, email, password_hash, is_active
         FROM admin_user WHERE email = $1`,
        [email]
      );
      user = result.rows[0];
      if (user) userId = user.id;
    } else {
      return res.status(400).json({ success: false, message: 'Invalid role specified.' });
    }

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.is_active) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact support.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const tokenPayload = {
      id: userId,
      email: user.email,
      role,
      name: user.name,
      ...(role === 'Employee' && { sub_role: user.sub_role, branch_id: user.branch_id }),
      ...(role === 'Customer' && { kyc_status: user.kyc_status }),
    };

    const token = generateToken(tokenPayload);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: userId,
        name: user.name,
        email: user.email,
        role,
        ...(role === 'Employee' && { sub_role: user.sub_role }),
        ...(role === 'Customer' && { kyc_status: user.kyc_status }),
      }
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/register  (Customer self-registration)
// ─────────────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { first_name, last_name, email, phone, address, date_of_birth, password } = req.body;

    // Check existing email
    const existing = await client.query('SELECT customer_id FROM customer WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    await client.query('BEGIN');

    // Create customer
    const custResult = await client.query(
      `INSERT INTO customer (first_name, last_name, email, phone, address, date_of_birth, password_hash, kyc_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending')
       RETURNING customer_id, first_name, last_name, email, kyc_status`,
      [first_name, last_name, email, phone, address, date_of_birth, password_hash]
    );
    const customer = custResult.rows[0];

    // Auto-create a savings account
    const accNumber = 'ACC' + Date.now().toString().slice(-10);
    await client.query(
      `INSERT INTO account (customer_id, account_number, account_type, balance, status)
       VALUES ($1, $2, 'Savings', 0.00, 'Active')`,
      [customer.customer_id, accNumber]
    );

    // Welcome notification
    await client.query(
      `INSERT INTO notification (user_type, user_id, title, message, type)
       VALUES ('Customer', $1, 'Welcome to Digital Bank!', 'Your account has been created. Complete KYC to unlock all features.', 'success')`,
      [customer.customer_id]
    );

    await client.query('COMMIT');

    const token = generateToken({
      id: customer.customer_id,
      email: customer.email,
      role: 'Customer',
      name: `${customer.first_name} ${customer.last_name}`,
      kyc_status: 'Pending'
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: customer.customer_id,
        name: `${customer.first_name} ${customer.last_name}`,
        email: customer.email,
        role: 'Customer',
        kyc_status: 'Pending'
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────
const me = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    let result;

    if (role === 'Customer') {
      result = await pool.query(
        `SELECT customer_id AS id, first_name, last_name, email, phone, address, date_of_birth, kyc_status, is_active, created_at
         FROM customer WHERE customer_id = $1`,
        [id]
      );
    } else if (role === 'Employee') {
      result = await pool.query(
        `SELECT e.employee_id AS id, e.name, e.email, e.role AS sub_role, e.phone, e.hire_date, e.is_active,
                b.branch_name, b.location AS branch_location
         FROM employee e LEFT JOIN branch b ON e.branch_id = b.branch_id
         WHERE e.employee_id = $1`,
        [id]
      );
    } else {
      result = await pool.query(
        'SELECT admin_id AS id, name, email, is_active, created_at FROM admin_user WHERE admin_id = $1',
        [id]
      );
    }

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, user: { ...result.rows[0], role } });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────────────
// POST /api/auth/change-password
// ─────────────────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { id, role } = req.user;
    const { currentPassword, newPassword } = req.body;

    let userResult;
    if (role === 'Customer') {
      userResult = await pool.query('SELECT password_hash FROM customer WHERE customer_id = $1', [id]);
    } else if (role === 'Employee') {
      userResult = await pool.query('SELECT password_hash FROM employee WHERE employee_id = $1', [id]);
    } else {
      userResult = await pool.query('SELECT password_hash FROM admin_user WHERE admin_id = $1', [id]);
    }

    if (!userResult.rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password incorrect.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    if (role === 'Customer') {
      await pool.query('UPDATE customer SET password_hash = $1, updated_at = NOW() WHERE customer_id = $2', [newHash, id]);
    } else if (role === 'Employee') {
      await pool.query('UPDATE employee SET password_hash = $1 WHERE employee_id = $2', [newHash, id]);
    } else {
      await pool.query('UPDATE admin_user SET password_hash = $1 WHERE admin_id = $2', [newHash, id]);
    }

    res.json({ success: true, message: 'Password changed successfully.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { login, register, me, changePassword };
