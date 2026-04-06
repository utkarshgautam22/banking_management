const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const getAuthMeta = (role) => {
  if (role === 'Customer') {
    return { table: 'customer', idColumn: 'customer_id' };
  }
  if (role === 'Employee') {
    return { table: 'employee', idColumn: 'employee_id' };
  }
  if (role === 'Admin') {
    return { table: 'admin_user', idColumn: 'admin_id' };
  }
  return null;
};

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const meta = getAuthMeta(decoded.role);
    if (!meta) {
      return res.status(401).json({ success: false, message: 'Invalid token role.' });
    }

    const result = await pool.query(
      `SELECT is_active, session_version FROM ${meta.table} WHERE ${meta.idColumn} = $1`,
      [decoded.id]
    );

    if (!result.rows.length || !result.rows[0].is_active) {
      return res.status(401).json({ success: false, message: 'Account is inactive or does not exist.' });
    }

    if (!decoded.session_version || decoded.session_version !== result.rows[0].session_version) {
      return res.status(401).json({ success: false, message: 'Session is no longer valid. Please login again.' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

module.exports = auth;
