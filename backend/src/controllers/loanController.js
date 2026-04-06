const pool = require('../db/pool');

// GET /api/loans
const getLoans = async (req, res, next) => {
  try {
    const { role, id } = req.user;
    let result;

    if (role === 'Customer') {
      result = await pool.query(
        `SELECT l.*, a.account_number,
                e.name AS approved_by_name
         FROM loan l
         LEFT JOIN account a ON l.account_id = a.account_id
         LEFT JOIN employee e ON l.approved_by = e.employee_id
         WHERE l.customer_id = $1
         ORDER BY l.created_at DESC`,
        [id]
      );
    } else {
      result = await pool.query(
        `SELECT l.*, a.account_number,
                c.first_name || ' ' || c.last_name AS customer_name, c.email AS customer_email,
                e.name AS approved_by_name
         FROM loan l
         LEFT JOIN account a ON l.account_id = a.account_id
         LEFT JOIN customer c ON l.customer_id = c.customer_id
         LEFT JOIN employee e ON l.approved_by = e.employee_id
         ORDER BY l.created_at DESC`
      );
    }

    res.json({ success: true, loans: result.rows });
  } catch (err) {
    next(err);
  }
};

// GET /api/loans/:id
const getLoan = async (req, res, next) => {
  try {
    const { id: loanId } = req.params;
    const { role, id: userId } = req.user;

    const loanResult = await pool.query(
      `SELECT l.*, c.first_name || ' ' || c.last_name AS customer_name, c.email as customer_email,
              a.account_number, e.name AS approved_by_name
       FROM loan l
       LEFT JOIN customer c ON l.customer_id = c.customer_id
       LEFT JOIN account a ON l.account_id = a.account_id
       LEFT JOIN employee e ON l.approved_by = e.employee_id
       WHERE l.loan_id = $1`,
      [loanId]
    );

    if (!loanResult.rows.length) {
      return res.status(404).json({ success: false, message: 'Loan not found.' });
    }

    const loan = loanResult.rows[0];
    if (role === 'Customer' && loan.customer_id !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    // Get payments
    const payments = await pool.query(
      'SELECT * FROM loan_payment WHERE loan_id = $1 ORDER BY payment_date DESC',
      [loanId]
    );

    res.json({ success: true, loan, payments: payments.rows });
  } catch (err) {
    next(err);
  }
};

// POST /api/loans/apply
const applyLoan = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { loan_type, loan_amount, interest_rate = 8.5, tenure_months, account_id, purpose } = req.body;
    const { id: customerId } = req.user;

    await client.query('BEGIN');

    const result = await client.query(
      `INSERT INTO loan (customer_id, account_id, loan_type, loan_amount, interest_rate, tenure_months, loan_status, purpose)
       VALUES ($1, $2, $3, $4, $5, $6, 'Pending', $7)
       RETURNING *`,
      [customerId, account_id, loan_type, loan_amount, interest_rate, tenure_months, purpose]
    );

    // Notify employees
    await client.query(
      `INSERT INTO notification (user_type, user_id, title, message, type)
       SELECT 'Employee', employee_id, 'New Loan Application', $1, 'info'
       FROM employee WHERE is_active = true LIMIT 3`,
      [`Customer has applied for a ${loan_type} loan of ₹${parseFloat(loan_amount).toLocaleString()}`]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully',
      loan: result.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// PATCH /api/loans/:id/approve
const approveLoan = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id: loanId } = req.params;
    const { id: employeeId } = req.user;

    await client.query('BEGIN');

    const loanResult = await client.query(
      'SELECT * FROM loan WHERE loan_id = $1 FOR UPDATE',
      [loanId]
    );

    if (!loanResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Loan not found.' });
    }

    const loan = loanResult.rows[0];
    if (loan.loan_status !== 'Pending') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: `Loan is already ${loan.loan_status}.` });
    }

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + loan.tenure_months);

    // Update loan status
    const updated = await client.query(
      `UPDATE loan SET loan_status = 'Active', approved_by = $1, start_date = CURRENT_DATE, end_date = $2, updated_at = NOW()
       WHERE loan_id = $3 RETURNING *`,
      [employeeId, endDate.toISOString().split('T')[0], loanId]
    );

    // Disburse loan amount to linked account if exists
    if (loan.account_id) {
      await client.query(
        'UPDATE account SET balance = balance + $1, updated_at = NOW() WHERE account_id = $2',
        [loan.loan_amount, loan.account_id]
      );

      await client.query(
        `INSERT INTO transaction (account_id, amount, transaction_type, description, status)
         VALUES ($1, $2, 'Loan_Disbursement', $3, 'Completed')`,
        [loan.account_id, loan.loan_amount, `Loan disbursement - ${loan.loan_type} loan #${loanId}`]
      );
    }

    // Notify customer
    await client.query(
      `INSERT INTO notification (user_type, user_id, title, message, type)
       VALUES ('Customer', $1, 'Loan Approved! 🎉', $2, 'success')`,
      [loan.customer_id, `Your ${loan.loan_type} loan of ₹${parseFloat(loan.loan_amount).toLocaleString()} has been approved and disbursed.`]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Loan approved and disbursed', loan: updated.rows[0] });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// PATCH /api/loans/:id/reject
const rejectLoan = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id: loanId } = req.params;
    const { reason } = req.body;
    const { id: employeeId } = req.user;

    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE loan SET loan_status = 'Rejected', approved_by = $1, updated_at = NOW()
       WHERE loan_id = $2 AND loan_status = 'Pending'
       RETURNING *`,
      [employeeId, loanId]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Loan not found or already processed.' });
    }

    const loan = result.rows[0];
    await client.query(
      `INSERT INTO notification (user_type, user_id, title, message, type)
       VALUES ('Customer', $1, 'Loan Application Update', $2, 'error')`,
      [loan.customer_id, `Your ${loan.loan_type} loan application has been rejected. ${reason ? 'Reason: ' + reason : ''}`]
    );

    await client.query('COMMIT');
    res.json({ success: true, message: 'Loan rejected', loan: loan });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// POST /api/loans/:id/pay
const payLoan = async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { id: loanId } = req.params;
    const { payment_amount, account_id } = req.body;
    const { id: customerId } = req.user;

    await client.query('BEGIN');

    const loanResult = await client.query('SELECT * FROM loan WHERE loan_id = $1 FOR UPDATE', [loanId]);
    if (!loanResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Loan not found.' });
    }

    const loan = loanResult.rows[0];
    if (loan.customer_id !== customerId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    if (loan.loan_status !== 'Active') {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Loan is not active.' });
    }

    // Deduct from account
    const accResult = await client.query('SELECT * FROM account WHERE account_id = $1 FOR UPDATE', [account_id]);
    if (!accResult.rows.length || accResult.rows[0].customer_id !== customerId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Invalid payment account.' });
    }

    const account = accResult.rows[0];
    if (parseFloat(account.balance) < parseFloat(payment_amount)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Insufficient balance for loan payment.' });
    }

    // Get remaining balance from last payment
    const lastPayment = await client.query(
      'SELECT remaining_balance FROM loan_payment WHERE loan_id = $1 ORDER BY payment_date DESC LIMIT 1',
      [loanId]
    );
    const previousBalance = lastPayment.rows.length
      ? parseFloat(lastPayment.rows[0].remaining_balance)
      : parseFloat(loan.loan_amount);
    const newRemaining = Math.max(0, previousBalance - parseFloat(payment_amount));

    await client.query('UPDATE account SET balance = balance - $1, updated_at = NOW() WHERE account_id = $2', [payment_amount, account_id]);

    await client.query(
      'INSERT INTO loan_payment (loan_id, payment_amount, remaining_balance, status) VALUES ($1, $2, $3, \'Completed\')',
      [loanId, payment_amount, newRemaining]
    );

    await client.query(
      `INSERT INTO transaction (account_id, amount, transaction_type, description, status)
       VALUES ($1, $2, 'Loan_Repayment', $3, 'Completed')`,
      [account_id, payment_amount, `Loan repayment for loan #${loanId}`]
    );

    // Close loan if fully paid
    if (newRemaining <= 0) {
      await client.query('UPDATE loan SET loan_status = \'Closed\', updated_at = NOW() WHERE loan_id = $1', [loanId]);
    }

    await client.query('COMMIT');

    res.json({
      success: true,
      message: newRemaining <= 0 ? 'Loan fully repaid! 🎉' : 'Loan payment successful',
      remaining_balance: newRemaining
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = { getLoans, getLoan, applyLoan, approveLoan, rejectLoan, payLoan };
