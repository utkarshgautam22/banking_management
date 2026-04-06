-- ============================================================
-- Digital Banking & Fraud Detection System — PostgreSQL Schema
-- ============================================================

-- Drop tables if they exist (for clean re-runs)
DROP TABLE IF EXISTS notification CASCADE;
DROP TABLE IF EXISTS fraud_alert CASCADE;
DROP TABLE IF EXISTS loan_payment CASCADE;
DROP TABLE IF EXISTS card CASCADE;
DROP TABLE IF EXISTS transfer CASCADE;
DROP TABLE IF EXISTS transaction CASCADE;
DROP TABLE IF EXISTS loan CASCADE;
DROP TABLE IF EXISTS account CASCADE;
DROP TABLE IF EXISTS employee CASCADE;
DROP TABLE IF EXISTS admin_user CASCADE;
DROP TABLE IF EXISTS customer CASCADE;
DROP TABLE IF EXISTS branch CASCADE;

-- ========================
-- BRANCH
-- ========================
CREATE TABLE branch (
  branch_id   SERIAL PRIMARY KEY,
  branch_name VARCHAR(100) NOT NULL,
  location    VARCHAR(200) NOT NULL,
  contact_number VARCHAR(20),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ========================
-- CUSTOMER
-- ========================
CREATE TABLE customer (
  customer_id   SERIAL PRIMARY KEY,
  first_name    VARCHAR(50) NOT NULL,
  last_name     VARCHAR(50) NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  address       VARCHAR(255),
  date_of_birth DATE,
  password_hash VARCHAR(255) NOT NULL,
  kyc_status    VARCHAR(20) DEFAULT 'Pending' CHECK (kyc_status IN ('Pending','Verified','Rejected')),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ========================
-- ADMIN USER
-- ========================
CREATE TABLE admin_user (
  admin_id      SERIAL PRIMARY KEY,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ========================
-- EMPLOYEE
-- ========================
CREATE TABLE employee (
  employee_id   SERIAL PRIMARY KEY,
  branch_id     INTEGER REFERENCES branch(branch_id) ON DELETE SET NULL,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(30) DEFAULT 'Teller' CHECK (role IN ('Teller','Manager','Analyst')),
  phone         VARCHAR(20),
  hire_date     DATE DEFAULT CURRENT_DATE,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMP DEFAULT NOW()
);

-- ========================
-- ACCOUNT
-- ========================
CREATE TABLE account (
  account_id    SERIAL PRIMARY KEY,
  customer_id   INTEGER NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
  branch_id     INTEGER REFERENCES branch(branch_id) ON DELETE SET NULL,
  account_number VARCHAR(20) UNIQUE NOT NULL,
  account_type  VARCHAR(20) DEFAULT 'Savings' CHECK (account_type IN ('Savings','Checking','Fixed','Current')),
  balance       DECIMAL(15,2) DEFAULT 0.00 CHECK (balance >= 0),
  status        VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active','Inactive','Frozen','Closed')),
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ========================
-- TRANSACTION
-- ========================
CREATE TABLE transaction (
  transaction_id   SERIAL PRIMARY KEY,
  account_id       INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  amount           DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('Deposit','Withdrawal','Transfer','Loan_Disbursement','Loan_Repayment')),
  description      VARCHAR(255),
  status           VARCHAR(20) DEFAULT 'Completed' CHECK (status IN ('Pending','Completed','Failed','Reversed')),
  transaction_time TIMESTAMP DEFAULT NOW(),
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ========================
-- TRANSFER
-- ========================
CREATE TABLE transfer (
  transfer_id      SERIAL PRIMARY KEY,
  from_account_id  INTEGER NOT NULL REFERENCES account(account_id),
  to_account_id    INTEGER NOT NULL REFERENCES account(account_id),
  amount           DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  transfer_date    TIMESTAMP DEFAULT NOW(),
  transfer_mode    VARCHAR(20) DEFAULT 'NEFT' CHECK (transfer_mode IN ('NEFT','RTGS','UPI','IMPS','Internal')),
  description      VARCHAR(255),
  status           VARCHAR(20) DEFAULT 'Completed' CHECK (status IN ('Pending','Completed','Failed'))
);

-- ========================
-- LOAN
-- ========================
CREATE TABLE loan (
  loan_id         SERIAL PRIMARY KEY,
  customer_id     INTEGER NOT NULL REFERENCES customer(customer_id) ON DELETE CASCADE,
  account_id      INTEGER REFERENCES account(account_id),
  loan_type       VARCHAR(30) CHECK (loan_type IN ('Personal','Home','Auto','Education','Business')),
  loan_amount     DECIMAL(15,2) NOT NULL CHECK (loan_amount > 0),
  interest_rate   DECIMAL(5,2) NOT NULL,
  tenure_months   INTEGER NOT NULL,
  start_date      DATE,
  end_date        DATE,
  loan_status     VARCHAR(20) DEFAULT 'Pending' CHECK (loan_status IN ('Pending','Active','Closed','Rejected','Defaulted')),
  approved_by     INTEGER REFERENCES employee(employee_id),
  purpose         VARCHAR(255),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ========================
-- LOAN PAYMENT
-- ========================
CREATE TABLE loan_payment (
  payment_id        SERIAL PRIMARY KEY,
  loan_id           INTEGER NOT NULL REFERENCES loan(loan_id) ON DELETE CASCADE,
  payment_amount    DECIMAL(15,2) NOT NULL CHECK (payment_amount > 0),
  payment_date      TIMESTAMP DEFAULT NOW(),
  remaining_balance DECIMAL(15,2),
  status            VARCHAR(20) DEFAULT 'Completed' CHECK (status IN ('Pending','Completed','Failed'))
);

-- ========================
-- CARD
-- ========================
CREATE TABLE card (
  card_id        SERIAL PRIMARY KEY,
  account_id     INTEGER NOT NULL REFERENCES account(account_id) ON DELETE CASCADE,
  card_number    VARCHAR(20) UNIQUE NOT NULL,
  card_type      VARCHAR(10) CHECK (card_type IN ('Debit','Credit')),
  expiry_date    DATE,
  cvv            VARCHAR(4),
  issue_date     DATE DEFAULT CURRENT_DATE,
  status         VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active','Blocked','Expired'))
);

-- ========================
-- FRAUD ALERT
-- ========================
CREATE TABLE fraud_alert (
  alert_id       SERIAL PRIMARY KEY,
  transaction_id INTEGER REFERENCES transaction(transaction_id) ON DELETE SET NULL,
  account_id     INTEGER REFERENCES account(account_id),
  alert_reason   VARCHAR(255) NOT NULL,
  alert_level    VARCHAR(10) DEFAULT 'Medium' CHECK (alert_level IN ('Low','Medium','High','Critical')),
  status         VARCHAR(20) DEFAULT 'Open' CHECK (status IN ('Open','Investigating','Resolved','Dismissed')),
  detected_time  TIMESTAMP DEFAULT NOW(),
  resolved_by    INTEGER REFERENCES employee(employee_id),
  resolved_at    TIMESTAMP
);

-- ========================
-- NOTIFICATION
-- ========================
CREATE TABLE notification (
  notification_id  SERIAL PRIMARY KEY,
  user_type        VARCHAR(20) NOT NULL CHECK (user_type IN ('Customer','Employee','Admin')),
  user_id          INTEGER NOT NULL,
  title            VARCHAR(100) NOT NULL,
  message          TEXT NOT NULL,
  type             VARCHAR(20) DEFAULT 'info' CHECK (type IN ('info','success','warning','error','fraud')),
  is_read          BOOLEAN DEFAULT FALSE,
  created_at       TIMESTAMP DEFAULT NOW()
);

-- ========================
-- INDEXES
-- ========================
CREATE INDEX idx_account_customer ON account(customer_id);
CREATE INDEX idx_transaction_account ON transaction(account_id);
CREATE INDEX idx_transaction_time ON transaction(transaction_time);
CREATE INDEX idx_transfer_from ON transfer(from_account_id);
CREATE INDEX idx_transfer_to ON transfer(to_account_id);
CREATE INDEX idx_loan_customer ON loan(customer_id);
CREATE INDEX idx_fraud_alert_account ON fraud_alert(account_id);
CREATE INDEX idx_notification_user ON notification(user_type, user_id);
