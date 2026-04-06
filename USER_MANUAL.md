# Digital Banking and Fraud Detection System - User Manual

This manual is the final reference for Customers, Employees, and Administrators using the production-ready banking application.

## 1. Login and Session Rules

1. Open /login and choose your role: Customer, Employee, or Admin.
2. Enter valid email and password.
3. After successful login, you are redirected to your role dashboard automatically.
4. If you open /login while already authenticated, the app sends you to your dashboard immediately.

Important session behavior:

- Single-user browser session: only one active login is kept in the browser at a time.
- Cross-tab sync: all tabs share the same signed-in user.
- Server-side session invalidation: when the same account logs in again, older tokens become invalid.
- Session expiry: tokens expire after 1 hour and the app returns to login securely.

## 2. Password and Account Security

- Password policy: minimum 8 characters with uppercase, lowercase, number, and special character.
- Disabled users cannot authenticate.
- Unauthorized role paths are blocked and redirected to the correct dashboard.
- Notification read actions are ownership checked, so users can only modify their own notifications.

## 3. Customer Portal Guide

Main capabilities:

- View account balances and account status.
- Transfer funds to valid beneficiary accounts.
- Track transaction history.
- Apply for loans and pay active loans.
- Receive account and security notifications.

Transfer process:

1. Go to Customer -> Transfer.
2. Select source account.
3. Enter destination account number.
4. Enter amount and transfer mode (NEFT, RTGS, UPI, IMPS, Internal).
5. Submit transfer.

System protections during transfer:

- Ownership check on source account.
- Balance check to prevent overdraft.
- Destination account existence and active status check.
- Atomic debit/credit update and transfer record creation.
- Fraud analysis triggered after successful posting.

## 4. Employee Portal Guide

Employees can:

- Review customers and KYC status.
- Process pending loan applications.
- View operational dashboards.
- Monitor and handle fraud alerts (based on role access).

Loan approval behavior:

1. Open pending loan request.
2. Approve or reject.
3. On approval, active status is set and disbursement transaction is recorded.
4. Customer receives a notification.

## 5. Admin Portal Guide

Admins can:

- View system-wide reports and analytics.
- Create employee accounts.
- Deactivate customer or employee accounts.
- Update account status (freeze/close workflows).
- Resolve or dismiss fraud alerts.

## 6. Fraud and Alerting

Alerts are generated automatically for suspicious patterns such as:

- Large-value transactions.
- Rapid transaction bursts in a short period.
- High daily outflow behavior.

Alerts are visible in fraud dashboards and linked notifications are generated for relevant users.

## 7. Troubleshooting

- Invalid or expired token: log in again.
- Session no longer valid: this usually means a newer login replaced the old session.
- Access denied: verify your selected role and permitted routes.
- Account deactivated: contact an administrator.

Digital Banking System | Final User Manual 2026
