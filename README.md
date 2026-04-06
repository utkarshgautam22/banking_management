# Digital Banking & Fraud Detection System 🏦🛡️

A state-of-the-art, full-stack financial platform built with **Next.js 15**, **Node.js/Express**, and **PostgreSQL**. This system features real-time fraud monitoring, military-grade security, and comprehensive banking workflows for Customers, Employees, and Administrators.

---

## 🌟 Key Features

### 🏢 Core Banking
- **Multi-Role Portals:** Dedicated dashboards for Customers, Employees, and Admins.
- **Account Management:** Real-time balance tracking, transaction history, and account summaries.
- **Secure Transfers:** Support for NEFT, RTGS, and IMPS transfer modes with atomic balance updates.
- **Loan Management:** Full lifecycle management from application and underwriting to repayment.
- **Profile & Security:** User profile updates, KYC status tracking, and secure password management.

### 🛡️ Fraud Detection & Security
- **Real-Time Analysis:** Automated risk assessment on every transaction.
- **Rule-Based Engine:** Detects large transactions, high-frequency shifts, and velocity anomalies.
- **RBAC & Path Protection:** Robust Role-Based Access Control enforcing strict isolation between portals with automatic path-based redirection.
- **Session Isolation:** Per-tab session management allowing multiple accounts to be managed independently.
- **Initial Verification:** Instant background session validation on app mount to prevent unauthorized rendering.

---

## 🚀 Tech Stack

- **Frontend:** Next.js 15 (App Router), Tailwind CSS, Lucide Icons, Recharts, Framer Motion.
- **Backend:** Node.js, Express.js.
- **Database:** PostgreSQL with `pg` pool management.
- **Security:** JWT Authentication (1h expiry), Bcrypt password hashing, Helmet security headers, CORS protection.

---

## ⚙️ Preparation & Setup

### 1. Database Configuration
Ensure **PostgreSQL** is running on your machine.
1. Create a database named `banking_db`.
2. Run `backend/src/db/schema.sql` to initialize the tables.
3. (Optional) Run `backend/src/db/seed.js` to populate with professional demo data.

### 2. Environment Variables

Create a **`.env`** file in the `backend/` directory:
```env
PORT=5000
DB_USER=your_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=banking_db
JWT_SECRET=super_secure_secret_change_this_for_prod
FRONTEND_URL=http://localhost:3000
```

### 3. Installation
```bash
# Clone the repository
git clone https://github.com/utkarshgautam22/banking_management.git

# Install Backend Dependencies
cd backend && npm install

# Install Frontend Dependencies
cd ../frontend && npm install
```

---

## 🛠️ Usage

### Development Mode
```bash
# In the backend directory
npm run dev

# In the frontend directory 
npm run dev
```

### Production Build
```bash
# Build frontend
cd frontend && npm run build && npm start

# Start backend
cd backend && npm start
```

---

## 🧑‍💻 Default Demo Credentials

| Role | Email | Password |
| :--- | :--- | :--- |
| **Customer** | `john@example.com` | `Customer@123` |
| **Employee** | `teller@bank.com` | `Teller@123` |
| **Administrator** | `admin@bank.com` | `Admin@123` |

---

## 📜 Documentation
- [Implementation Details](implementation.md)
- [User Manual](USER_MANUAL.md)
- [Testing Procedure](TESTING_PROCEDURE.md)

---

## 📜 License
This project is for demonstration and prototype purposes. Built with ❤️ for Advanced Agentic Coding.
