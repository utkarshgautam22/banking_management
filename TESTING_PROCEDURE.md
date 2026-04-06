# Digital Banking and Fraud Detection System - Testing Procedure

This file defines the final regression and security test plan for the application.

## 1. Test Environment

1. Backend running at http://localhost:5000.
2. Frontend running at http://localhost:3000.
3. PostgreSQL initialized with schema and seed data.
4. Fresh browser profile recommended for session tests.

## 2. Authentication and Session Tests

| Test Case | Procedure | Expected Result |
| :--- | :--- | :--- |
| TC-01 Login success by role | Login with valid Customer, Employee, and Admin credentials. | Redirect to correct role dashboard each time. |
| TC-02 Login page auto-redirect | Login, then manually open /login again. | User is immediately redirected to their dashboard. |
| TC-03 Single browser session | Login as Customer in Tab A, then login as Admin in Tab B in same browser. | Active session is switched; all tabs converge to one active user session. |
| TC-04 Server-side invalidation | Login with same account in Browser A and Browser B. Use older token in Browser A after Browser B login. | Browser A receives 401 with invalid session and is forced to re-authenticate. |
| TC-05 Unauthorized route blocking | Login as Customer and open an Admin route directly. | App blocks content and redirects to Customer dashboard. |
| TC-06 Token expiry behavior | Wait for token expiry or simulate invalid token in storage, then call protected API. | API returns 401 and app redirects to login safely. |

## 3. Banking Transaction Integrity Tests

| Test Case | Procedure | Expected Result |
| :--- | :--- | :--- |
| TC-07 Deposit success | Deposit into owned active account. | Balance increases, transaction logged, notification generated. |
| TC-08 Withdraw insufficient funds | Attempt withdrawal greater than balance. | Request rejected with 400, no balance mutation. |
| TC-09 Transfer atomicity | Transfer between two active accounts. | Debit and credit both succeed together with transfer row and transaction rows. |
| TC-10 Transfer authorization | Customer attempts transfer from account not owned by them. | Request rejected with 403. |
| TC-11 Transfer validation | Send invalid amount, invalid account number, or invalid transfer mode. | Request rejected with validation error. |

## 4. Loan and Operational Tests

| Test Case | Procedure | Expected Result |
| :--- | :--- | :--- |
| TC-12 Loan application | Customer submits valid loan application. | Loan appears as Pending for Employee/Admin review. |
| TC-13 Loan approval | Employee/Admin approves pending loan. | Loan becomes Active, disbursement transaction recorded, customer notified. |
| TC-14 Loan repayment | Customer pays from owned account with sufficient balance. | Payment row and repayment transaction created; remaining balance reduced. |
| TC-15 KYC update validation | Submit invalid kyc_status. | Request rejected by validation middleware. |

## 5. Fraud and Notification Security Tests

| Test Case | Procedure | Expected Result |
| :--- | :--- | :--- |
| TC-16 High-value fraud detection | Execute high-value transfer above threshold. | Fraud alert created with High or Critical severity. |
| TC-17 Rapid-activity fraud detection | Execute rapid transaction burst in short window. | Fraud alert created for suspicious velocity. |
| TC-18 Notification ownership | User attempts to mark another user's notification as read. | API returns not found or denied behavior; target row unchanged. |

## 6. UI and Build Validation

| Test Case | Procedure | Expected Result |
| :--- | :--- | :--- |
| TC-19 Frontend production build | Run npm run build in frontend. | Build succeeds with no type errors. |
| TC-20 Backend startup check | Run npm run start in backend. | API starts and health endpoint returns success. |

## 7. Defect Reporting Template

Record each failure with:

1. Test case ID.
2. Role and test data used.
3. Steps to reproduce.
4. Actual response and expected response.
5. API payload and status code.
6. Logs or screenshots.

Digital Banking System | Final QA Procedure 2026
