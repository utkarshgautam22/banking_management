# Digital Banking and Fraud Detection System - Detailed User Manual

This manual explains everything users can do in the application, including role permissions, workflows, expected system behavior, and common troubleshooting.

## 1. Who Can Use Which Portal

The system has three role-based portals:

1. Customer: personal banking, transfers, loans, profile, and account security.
2. Employee: customer servicing, KYC verification, transaction monitoring, and loan queue processing.
3. Admin: full oversight, user and employee administration, fraud handling, and analytics reports.

Access is enforced by role. If a user tries to open a route from another role, the app redirects to that user's own dashboard.

## 2. Getting Started

### 2.1 Registration (Customer)

Path: /register

What a new user can do:

1. Enter first name, last name, email, optional phone.
2. Continue to second step and enter date of birth, optional address, password, and confirm password.
3. Submit account application.

What the system does:

1. Creates a customer profile.
2. Creates a default active savings account with zero balance.
3. Signs in the new customer and opens customer dashboard.

### 2.2 Login

Path: /login

What any user can do:

1. Select role (Customer, Employee, Admin).
2. Enter email and password.
3. Sign in.

What the system does:

1. Validates role-specific credentials.
2. Blocks deactivated accounts.
3. Redirects to the correct dashboard.
4. If login page is opened while already authenticated, auto-redirects to dashboard.

## 3. Session and Security Behavior

1. JWT token expiry is 1 hour.
2. Only one active browser login state is maintained at a time for the same browser storage.
3. Cross-tab synchronization is enabled.
4. Server-side session versioning invalidates older tokens after a new login or logout.
5. Unauthorized API access returns 401 and routes the user back to login.
6. Password policy enforced by backend:
	- minimum 8 characters
	- at least one uppercase, one lowercase, one number, and one special character

## 4. Global UI Features Available to Logged-In Users

### 4.1 Sidebar Navigation

Users can:

1. Navigate only within pages allowed for their role.
2. Log out from sidebar.

### 4.2 Topbar User Menu and Notifications

Users can:

1. Open notification dropdown.
2. Read latest notifications.
3. Mark all notifications as read.
4. Open user menu and logout.

Security behavior:

1. Notifications are role-scoped and user-scoped.
2. Notification read updates are ownership checked.

## 5. Customer Portal - Complete Capability Guide

### 5.1 Dashboard

Path: /customer/dashboard

Customer can:

1. View all own accounts and balances.
2. View account status (Active, etc.).
3. View recent transactions.
4. View transaction summary stats.
5. Use quick links to Transfer and Loans.
6. View KYC reminder when status is Pending.

### 5.2 Transactions History

Path: /customer/transactions

Customer can:

1. View full transaction list.
2. Filter by type:
	- Deposit
	- Withdrawal
	- Transfer
	- Loan_Repayment
3. See amount direction, account number, status, and timestamp.

### 5.3 Transfer Funds

Path: /customer/transfer

Customer can:

1. Select source account from own active accounts.
2. Enter beneficiary account number.
3. Choose transfer mode:
	- NEFT
	- IMPS
	- RTGS
4. Enter amount and optional remarks.
5. Submit transfer.

System checks and outcomes:

1. Source account ownership validation.
2. Source account active status validation.
3. Destination account existence and active status validation.
4. Insufficient balance prevention.
5. Atomic debit/credit transaction posting.
6. Transfer and transaction records creation.
7. Customer notifications generated for sender and receiver.
8. Fraud detection triggered after successful transfer.

### 5.4 Loans and Credit

Path: /customer/loans

Customer can:

1. View all own loans and statuses.
2. Apply for a loan with:
	- loan type
	- amount
	- tenure
	- purpose
	- disbursement account
3. Make repayment on active loans by choosing account and payment amount.

Loan status lifecycle visible to customer:

1. Pending
2. Active
3. Closed
4. Rejected

### 5.5 Security Alerts

Path: /customer/fraud-alerts

Customer can:

1. View account-level fraud/security alerts.
2. View alert level and current status.
3. See investigation/resolution information when available.

### 5.6 Profile

Path: /customer/profile

Customer can:

1. View personal details:
	- first name
	- last name
	- email
	- date of birth
	- member since
2. Update editable details:
	- phone
	- address
3. View own accounts summary.
4. View KYC status.

### 5.7 Settings and Security

Path: /customer/settings

Customer can:

1. Change password.
2. View current session details (device/browser summary view).
3. View communication preference toggles.
4. View generic limits panel.

Note:

1. Communication preference toggles and session card are UI-level informational features in current build.
2. Password change is backend-enforced and immediate.

## 6. Employee Portal - Complete Capability Guide

### 6.1 Dashboard

Path: /employee/dashboard

Employee can:

1. View operational summary metrics.
2. Use quick links to Customers, Loans, and KYC pages.

### 6.2 Customers Management

Path: /employee/customers

Employee can:

1. Search customers by name or email.
2. View customer profile summary and account count.
3. Review KYC status.
4. Verify or reject KYC for pending cases.

### 6.3 KYC Verification Queue

Path: /employee/kyc

Employee can:

1. View only pending KYC submissions.
2. Review customer identity basics and DOB/address metadata.
3. Approve (Verified) or reject (Rejected) KYC.

### 6.4 Loan Verification Queue

Path: /employee/loans

Employee can:

1. View pending loan applications only.
2. Review applicant, purpose, amount, and terms.
3. Approve or reject applications.

System behavior:

1. Approval activates loan and disburses amount to linked account (if linked).
2. Rejection records decision and customer is notified.

### 6.5 Transaction Monitoring

Path: /employee/transactions

Employee can:

1. View system-wide transactions (within role permissions).
2. Filter by exact account ID.
3. Audit amount direction, customer/account, timestamp, and status.

## 7. Admin Portal - Complete Capability Guide

### 7.1 Admin Dashboard

Path: /admin/dashboard

Admin can:

1. View system-level KPIs.
2. View transaction volume charts.
3. View transaction-type distribution.

### 7.2 User Management

Path: /admin/users

Admin can:

1. List customers.
2. Review contact and account status.
3. Deactivate active customer accounts.

Effect of deactivation:

1. Deactivated users cannot log in.

### 7.3 Employee Management

Path: /admin/employees

Admin can:

1. View all employees and branch assignment.
2. Provision new employee account with:
	- name
	- email
	- temporary password
	- phone
	- branch
	- sub-role (Teller/Manager/Analyst)
3. Deactivate active employees.

### 7.4 Transactions Oversight

Path: /admin/transactions

Admin can:

1. Use the same monitoring interface as employee transaction monitoring.
2. Filter and audit transaction history across accounts.

### 7.5 Fraud Monitoring Center

Path: /admin/fraud-alerts

Admin can:

1. Filter alerts by status:
	- Open
	- Investigating
	- Resolved
	- Dismissed
	- All
2. Review alert reason, transaction context, level, and timestamps.
3. Resolve or dismiss active alerts.

Implemented fraud rules (exact backend logic):

1. Large transaction rule:
	- if amount > 50,000 then alert is generated.
	- severity is High when amount is between 50,001 and 100,000.
	- severity is Critical when amount > 100,000.
2. Rapid transaction velocity rule:
	- if account has more than 5 transactions in last 60 minutes, alert is generated.
	- severity is High for 6 to 10 transactions.
	- severity is Critical for more than 10 transactions.
3. Daily outflow concentration rule:
	- for Withdrawal and Transfer transactions, if same-day total outflow > 100,000, alert is generated.
	- severity is High.

Post-alert actions:

1. Alert status is created as Open.
2. Admin notification is generated.
3. Customer security warning notification is generated.

### 7.6 Reports and Analytics

Path: /admin/reports

Admin can:

1. View monthly transaction trend chart.
2. View transaction type distribution.
3. View loan-type distribution.
4. View fraud severity summary.
5. Trigger export button.

Note:

1. PDF export is currently a placeholder in this build.

### 7.7 System Settings

Path: /admin/settings

Admin can:

1. View system settings section and configuration placeholder.

Note:

1. This is currently an informational screen for upcoming configurable controls.

## 8. Notifications Matrix

1. Customer receives:
	- transfer sent/received notifications
	- deposit/withdrawal updates
	- loan updates
	- security alerts
2. Employee receives:
	- operational notifications such as loan queue events
3. Admin receives:
	- fraud alerts and system-level security notifications

## 9. API-Driven Actions Summary

Critical user actions in UI are backed by API endpoints:

1. Authentication:
	- POST /api/auth/login
	- POST /api/auth/register
	- GET /api/auth/me
	- POST /api/auth/logout
	- POST /api/auth/change-password
2. Customer banking:
	- GET /api/accounts
	- GET /api/transactions
	- POST /api/transactions/transfer
	- GET /api/loans
	- POST /api/loans/apply
	- POST /api/loans/:id/pay
3. Employee/Admin operations:
	- GET /api/manage/customers
	- PATCH /api/manage/customers/:id/kyc
	- GET /api/manage/stats
	- GET /api/manage/reports
	- GET/POST /api/manage/employees
	- PATCH /api/manage/:type/:id/deactivate
	- GET/PATCH /api/fraud
4. Notifications:
	- GET /api/notifications
	- PATCH /api/notifications/mark-all-read

## 10. Troubleshooting

1. Invalid or expired token:
	- log in again.
2. Session no longer valid:
	- newer login replaced the old session token.
3. Access denied:
	- role mismatch or insufficient privilege.
4. Account deactivated:
	- contact administrator.
5. Profile values not appearing:
	- sign out and sign in again to refresh full profile payload.

Digital Banking System | Detailed User Manual 2026
