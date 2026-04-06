/**
 * Database Seed Script
 * Run: node src/db/seed.js
 *
 * Plaintext passwords for login (shown in comments):
 *   Admin:    admin@bank.com     / Admin@123
 *   Employee: alice@bank.com     / Employee@123
 *   Employee: bob@bank.com       / Employee@123
 *   Customer: john@example.com   / Customer@123
 *   Customer: jane@example.com   / Customer@123
 *   Customer: mike@example.com   / Customer@123
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./pool');

async function seed() {
  console.log('🌱 Starting seed...');
  const client = await pool.connect();

  try {
    // ------------------------------------------------------------------
    // Hash passwords (plaintext shown above in file header comments)
    // ------------------------------------------------------------------
    const adminHash     = await bcrypt.hash('Admin@123', 10);      // admin@bank.com
    const employeeHash  = await bcrypt.hash('Employee@123', 10);   // alice@bank.com, bob@bank.com
    const customerHash  = await bcrypt.hash('Customer@123', 10);   // john, jane, mike

    await client.query('BEGIN');

    // ------------------------------------------------------------------
    // BRANCHES
    // ------------------------------------------------------------------
    const branchRes = await client.query(`
      INSERT INTO branch (branch_name, location, contact_number) VALUES
        ('Main Branch',   'New York, NY',      '+1-800-555-0001'),
        ('West Branch',   'Los Angeles, CA',   '+1-800-555-0002'),
        ('East Branch',   'Chicago, IL',       '+1-800-555-0003')
      RETURNING branch_id
    `);
    const [b1, b2, b3] = branchRes.rows;
    console.log('✅ Branches seeded');

    // ------------------------------------------------------------------
    // ADMIN USER
    // Password: Admin@123
    // ------------------------------------------------------------------
    await client.query(`
      INSERT INTO admin_user (name, email, password_hash) VALUES
        ('System Admin', 'admin@bank.com', $1)
      ON CONFLICT (email) DO NOTHING
    `, [adminHash]);
    console.log('✅ Admin seeded  →  admin@bank.com  /  Admin@123');

    // ------------------------------------------------------------------
    // EMPLOYEES
    // Password: Employee@123
    // ------------------------------------------------------------------
    const empRes = await client.query(`
      INSERT INTO employee (branch_id, name, email, password_hash, role, phone, hire_date) VALUES
        ($1, 'Alice Johnson', 'alice@bank.com', $3, 'Manager', '+1-800-555-0010', '2020-01-15'),
        ($2, 'Bob Smith',     'bob@bank.com',   $3, 'Teller',  '+1-800-555-0011', '2021-06-01')
      RETURNING employee_id
    `, [b1.branch_id, b2.branch_id, employeeHash]);
    const [e1, e2] = empRes.rows;
    console.log('✅ Employees seeded  →  alice@bank.com  /  Employee@123');
    console.log('                     →  bob@bank.com    /  Employee@123');

    // ------------------------------------------------------------------
    // CUSTOMERS
    // Password: Customer@123
    // ------------------------------------------------------------------
    const custRes = await client.query(`
      INSERT INTO customer (first_name, last_name, email, phone, address, date_of_birth, password_hash, kyc_status) VALUES
        ('John', 'Doe',   'john@example.com', '+1-555-1001', '123 Main St, NY', '1990-05-15', $1, 'Verified'),
        ('Jane', 'Smith', 'jane@example.com', '+1-555-1002', '456 Oak Ave, CA', '1985-09-22', $1, 'Verified'),
        ('Mike', 'Brown', 'mike@example.com', '+1-555-1003', '789 Pine Rd, IL', '1995-03-10', $1, 'Pending')
      RETURNING customer_id
    `, [customerHash]);
    const [c1, c2, c3] = custRes.rows;
    console.log('✅ Customers seeded  →  john@example.com  /  Customer@123');
    console.log('                     →  jane@example.com  /  Customer@123');
    console.log('                     →  mike@example.com  /  Customer@123');

    // ------------------------------------------------------------------
    // ACCOUNTS
    // ------------------------------------------------------------------
    const accRes = await client.query(`
      INSERT INTO account (customer_id, branch_id, account_number, account_type, balance, status) VALUES
        ($1, $4, 'ACC0001001', 'Savings',  15000.00, 'Active'),
        ($1, $4, 'ACC0001002', 'Checking',  5000.00, 'Active'),
        ($2, $5, 'ACC0002001', 'Savings',  30000.00, 'Active'),
        ($3, $6, 'ACC0003001', 'Savings',   2000.00, 'Active')
      RETURNING account_id
    `, [c1.customer_id, c2.customer_id, c3.customer_id, b1.branch_id, b2.branch_id, b3.branch_id]);
    const [a1, a2, a3, a4] = accRes.rows;
    console.log('✅ Accounts seeded');

    // ------------------------------------------------------------------
    // TRANSACTIONS
    // ------------------------------------------------------------------
    await client.query(`
      INSERT INTO transaction (account_id, amount, transaction_type, description, status, transaction_time) VALUES
        ($1, 5000.00,  'Deposit',    'Initial deposit',            'Completed', NOW() - INTERVAL '30 days'),
        ($1, 1000.00,  'Withdrawal', 'ATM withdrawal',             'Completed', NOW() - INTERVAL '20 days'),
        ($1, 2500.00,  'Transfer',   'Transfer to Jane',           'Completed', NOW() - INTERVAL '10 days'),
        ($2, 2000.00,  'Deposit',    'Payroll deposit',            'Completed', NOW() - INTERVAL '25 days'),
        ($3, 10000.00, 'Deposit',    'Property sale proceeds',     'Completed', NOW() - INTERVAL '15 days'),
        ($3, 75000.00, 'Transfer',   'Large transfer - flagged',   'Completed', NOW() - INTERVAL '5 days'),
        ($4, 500.00,   'Deposit',    'Cash deposit',               'Completed', NOW() - INTERVAL '8 days')
    `, [a1.account_id, a2.account_id, a3.account_id, a4.account_id]);
    console.log('✅ Transactions seeded');

    // ------------------------------------------------------------------
    // TRANSFER RECORDS
    // ------------------------------------------------------------------
    await client.query(`
      INSERT INTO transfer (from_account_id, to_account_id, amount, transfer_mode, description, status) VALUES
        ($1, $2, 2500.00, 'NEFT',     'Monthly transfer to Jane',      'Completed'),
        ($3, $1, 75000.00,'RTGS',     'Large real estate transaction',  'Completed')
    `, [a1.account_id, a2.account_id, a3.account_id]);
    console.log('✅ Transfers seeded');

    // ------------------------------------------------------------------
    // LOANS
    // ------------------------------------------------------------------
    const loanRes = await client.query(`
      INSERT INTO loan (customer_id, account_id, loan_type, loan_amount, interest_rate, tenure_months, start_date, end_date, loan_status, purpose) VALUES
        ($1, $4, 'Personal', 50000.00, 8.5,  24, CURRENT_DATE, CURRENT_DATE + INTERVAL '24 months', 'Active',  'Home renovation'),
        ($2, $5, 'Home',    500000.00, 6.75, 240,CURRENT_DATE, CURRENT_DATE + INTERVAL '240 months','Active',  'House purchase'),
        ($3, $6, 'Auto',     25000.00, 9.0,  36, NULL,         NULL,                                 'Pending', 'Car purchase')
      RETURNING loan_id
    `, [c1.customer_id, c2.customer_id, c3.customer_id, a1.account_id, a3.account_id, a4.account_id]);
    const [l1, l2] = loanRes.rows;
    console.log('✅ Loans seeded');

    // ------------------------------------------------------------------
    // LOAN PAYMENTS
    // ------------------------------------------------------------------
    await client.query(`
      INSERT INTO loan_payment (loan_id, payment_amount, payment_date, remaining_balance, status) VALUES
        ($1, 2300.00, NOW() - INTERVAL '2 months', 47700.00, 'Completed'),
        ($1, 2300.00, NOW() - INTERVAL '1 month',  45400.00, 'Completed'),
        ($2, 3800.00, NOW() - INTERVAL '1 month',  496200.00,'Completed')
    `, [l1.loan_id, l2.loan_id]);
    console.log('✅ Loan payments seeded');

    // ------------------------------------------------------------------
    // CARDS
    // ------------------------------------------------------------------
    await client.query(`
      INSERT INTO card (account_id, card_number, card_type, expiry_date, cvv, issue_date, status) VALUES
        ($1, '4111111111111001', 'Debit',  '2027-12-31', '123', CURRENT_DATE - INTERVAL '1 year', 'Active'),
        ($1, '5111111111111001', 'Credit', '2026-06-30', '456', CURRENT_DATE - INTERVAL '6 months','Active'),
        ($2, '4111111111112001', 'Debit',  '2027-09-30', '789', CURRENT_DATE - INTERVAL '8 months','Active')
    `, [a1.account_id, a3.account_id]);
    console.log('✅ Cards seeded');

    // ------------------------------------------------------------------
    // FRAUD ALERTS (the 75K transfer triggers one)
    // ------------------------------------------------------------------
    const txnRes = await client.query(
      `SELECT transaction_id FROM transaction WHERE description = 'Large transfer - flagged' LIMIT 1`
    );
    if (txnRes.rows.length > 0) {
      await client.query(`
        INSERT INTO fraud_alert (transaction_id, account_id, alert_reason, alert_level, status) VALUES
          ($1, $2, 'Transaction amount exceeds threshold (₹75,000)', 'High', 'Open')
      `, [txnRes.rows[0].transaction_id, a3.account_id]);
      console.log('✅ Fraud alert seeded');
    }

    // ------------------------------------------------------------------
    // NOTIFICATIONS
    // ------------------------------------------------------------------
    await client.query(`
      INSERT INTO notification (user_type, user_id, title, message, type) VALUES
        ('Customer', $1, 'Welcome to Digital Bank!',        'Your account is now active and ready to use.',                      'success'),
        ('Customer', $1, 'Transaction Completed',           'Your deposit of $5,000 was successful.',                            'info'),
        ('Customer', $2, 'Welcome to Digital Bank!',        'Your account is now active and ready to use.',                      'success'),
        ('Customer', $3, 'KYC Pending',                     'Please complete your KYC verification to unlock all features.',      'warning'),
        ('Employee', $4, 'New Loan Application',            'Mike Brown has applied for an Auto loan of $25,000.',               'info'),
        ('Admin',    1,  'Fraud Alert Detected',            'High-value transfer flagged on account ACC0002001. Review required.','fraud')
    `, [c1.customer_id, c2.customer_id, c3.customer_id, e1.employee_id]);
    console.log('✅ Notifications seeded');

    await client.query('COMMIT');
    console.log('\n🎉 Seed completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('──────────────────────────────────────────────────────');
    console.log('Role       Email                    Password');
    console.log('──────────────────────────────────────────────────────');
    console.log('Admin      admin@bank.com           Admin@123');
    console.log('Employee   alice@bank.com           Employee@123');
    console.log('Employee   bob@bank.com             Employee@123');
    console.log('Customer   john@example.com         Customer@123');
    console.log('Customer   jane@example.com         Customer@123');
    console.log('Customer   mike@example.com         Customer@123');
    console.log('──────────────────────────────────────────────────────');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

seed().catch(console.error);
