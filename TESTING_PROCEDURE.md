# Digital Banking & Fraud Detection System - Testing Procedure 🧪

This document outlines the standard operating procedures for verifying the banking system's functionality, security, and performance.

---

## 🏗️ 1. Environmental Setup

Before testing, ensures:
- PostgreSQL is running and the `banking_db` is seeded with `src/db/seed.js`.
- The Backend server is running on `http://localhost:5000`.
- The Frontend server is running on `http://localhost:3000`.

---

## 🔐 2. Authentication & Session Testing

| Test Case | Procedure | Expected Result |
| :--- | :--- | :--- |
| **TC-01: Login Success** | Enter valid credentials for Customer/Employee/Admin. | User is redirected to their specific dashboard with no flicker. |
| **TC-02: Redirect Logic** | Access `/admin/dashboard` while logged out -> login as Admin. | User is redirected back to `/admin/dashboard` (not default dashboard). |
| **TC-03: Session Isolation** | Log in as Customer in Tab A and Admin in Tab B. | Tab A remains Customer; Tab B remains Admin (independent sessions). |
| **TC-04: Token Expiration** | (Simulated) Remove `banking_token` from `sessionStorage` and refresh. | App detects missing token and redirects to `/login?expired=true`. |
| **TC-05: Unauthorized Access** | Log in as Customer -> manually type `/admin/employees`. | App blocks render and redirects back to `/customer/dashboard`. |

---

## 💸 3. Core Banking Functionality Testing

| Test Case | Procedure | Expected Result |
| :--- | :--- | :--- |
| **TC-06: Atomic Transfer** | Initiate a transfer of ₹1,000 between two accounts. | Sender balance -₹1,000; Receiver balance +₹1,000; Transaction recorded. |
| **TC-07: Insufficient Balance** | Attempt a transfer exceeding the current balance. | Backend returns 400 error; transaction fails; data integrity maintained. |
| **TC-08: Loan Application** | Submit a loan request from Customer dashboard. | Request appears in Employee loan queue with "Pending" status. |
| **TC-09: Loan Processing** | Employee approves the loan request. | Customer balance increases; status changes to "Active"; notification sent. |
| **TC-10: KYC Completion** | Employee clicks "Verify KYC" on a pending customer profile. | Customer's status updates instantly; "KYC Pending" badge disappears. |

---

## 🛡️ 4. Fraud Detection Testing

| Test Case | Procedure | Expected Result |
| :--- | :--- | :--- |
| **TC-11: Large Volume Alert** | Transfer ₹150,000 from a new customer account. | Transfer completes but a "Critical" fraud alert is generated in the Admin portal. |
| **TC-12: Resolution Workflow** | Admin views a "Critical" alert and clicks "Resolve". | Alert status updates to "Resolved"; Auditor name is recorded in history. |
| **TC-13: Rapid Transactions** | Perform 10 transfers within 60 seconds (Velocity Check). | System flags the account for suspicious activity and creates a security alert. |

---

## 📊 5. UI/UX & Reliability Testing

| Test Case | Procedure | Expected Result |
| :--- | :--- | :--- |
| **TC-14: Responsive Charts** | Resize the browser window on the Admin Dashboard. | Charts (`Recharts`) dynamically resize without `width(-1)` errors. |
| **TC-15: Error Resilience** | Force a JS crash in a dashboard component (e.g., malformed data). | Global `ErrorBoundary` catches the crash and shows a professional recovery UI. |
| **TC-16: Theme Integrity** | Navigate across all portals. | Glassmorphic aesthetic is consistent; no broken layouts or missing icons. |

---

## 📝 6. Reporting Results

Record any failures in the project's issue tracker with:
- Error Message / Stack Trace
- Steps to Reproduce
- User Role at time of failure

---
**Digital Banking System | Quality Assurance Team 2026**
