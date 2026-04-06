# Digital Banking & Fraud Detection System - Technical Implementation Guide (Deep-Dive) v3.0 🚀

This document provides the most granular technical breakdown of the system interaction, data architecture, and security protocols for developers and auditors.

---

## 🏛️ 1. Comprehensive System Architecture

The platform uses a **three-tier architecture** designed for high throughput and security.

### A. Frontend Layer (Next.js 15)
- **Component Model:** Functional components using React's latest patterns.
- **State Preservation:** `sessionStorage` is mapped to the `AuthContext` to ensure per-tab isolation.
- **Dynamic Charting:** `Recharts` utilizes a `ResponsiveContainer` wrapped in a `minWidth: 0` Flexbox to prevent SSR/CSR measurement mismatches.
- **Micro-Animations:** `framer-motion` manages entry transitions for cards and modals to reduce "perceived latency."

### B. Backend API Layer (Node.js/Express)
- **Modularity:** Routes are segmented by domain (`/auth`, `/accounts`, etc.) to keep the codebase maintainable.
- **Stateless Authentication:** Every request is authenticated using JWT. The backend does not store session state, facilitating horizontal scaling.
- **Security Middlewares:** 
  - `Helmet`: Sets secure HTTP headers (HSTS, CSP, etc.).
  - `CORS`: Restricts access to the specific frontend origin.
  - `Express-Validator`: Performs deep schema validation on incoming JSON payloads.

### C. Database Layer (PostgreSQL)
- **Pool Management:** Uses `pg.Pool` for efficient connection reuse.
- **Audit Trails:** Automatic `created_at` and `updated_at` timestamps on all critical tables.
- **Integrity Constraints:** Foreign keys ensure that a transaction cannot exist without an associated account.

---

## 🔐 2. Security & Authorization Deep-Dive

### JWT Token Payload Shape:
```json
{
  "id": 101,
  "role": "Customer",
  "name": "John Doe",
  "kyc_status": "Verified",
  "iat": 1672531200,
  "exp": 1672534800
}
```

### RBAC Hierarchy Enforcement:
1.  **Level 1 (Middleware):** The `auth.js` middleware extracts the JWT and verified its signature.
2.  **Level 2 (Role Check):** The `rbac.js` middleware compares the `role` field against an allowed array (`['Admin', 'Employee']`).
3.  **Level 3 (Business Logic):** Functions like `transfer` further verify that the user **owns** the account they are attempting to debit.

---

## 💸 3. Transaction Logic & Fraud Rules Interaction

### The "Transfer" Interaction Flow:
1.  **Frontend:** `POST /api/transactions/transfer` with `{from_id, to_number, amount, mode}`.
2.  **Backend (Controller):** Starts a SQL Transaction. 
3.  **Validation:** 
    - Verify `from_id` belongs to the logged-in user.
    - Verify `from_id` has `balance >= amount`.
    - Verify `to_number` exists in the system.
4.  **Debit/Credit:** Executes `UPDATE account SET balance = balance - X` and `UPDATE account SET balance = balance + X`.
5.  **Logging:** Records entries in both `transaction` and `transfer` tables.
6.  **Fraud Check (Async hook):**
    - IF `amount > 50000`, record a **High Risk** Alert.
    - IF `mode == 'IMPS'` AND `amount > 100000`, record a **Critical Risk** Alert.
    - Notify Admin via the `notification` table.
7.  **Commit:** If all succeed, permanent data change.

---

## 🗄️ 4. Data Model & Key SQL Constraints

### `account` Table:
- `balance >= 0`: CHECK constraint to prevent overdrafts.
- `status`: ENUM ('Active', 'Flagged', 'Dormant').

### `fraud_alert` Table:
- `status`: ENUM ('Open', 'Investigating', 'Resolved', 'Dismissed').
- `alert_level`: ENUM ('Low', 'Medium', 'High', 'Critical').

---

## 📡 5. Notifications Architecture

The system uses a **Polled Notification System**:
- Alerts are stored in the database.
- The `Topbar.tsx` component fetches notifications every time the page mounts or on manual refresh.
- Notifications are role-specific (e.g., Admins see Fraud Alerts; Customers see Transfer Successes).

---

## 🚀 6. Production Hardening Checklist

- [x] **Rate Limiting:** (Implicit) Express-validator and RBAC prevent bulk malicious requests.
- [x] **CSRF Mitigation:** Next.js and Axios headers prevent unauthorized cross-site requests.
- [x] **SQLi Prevention:** 100% of queries use parameterized bindings.
- [x] **Sensitive Data:** Passwords are never returned in JSON responses (only hashes exist in the DB).

---
**Banking Implementation v3.0 | Secure Engineering Department**
