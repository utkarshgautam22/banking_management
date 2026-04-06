# Digital Banking & Fraud Detection System - Comprehensive User Manual 📖

Welcome to the Digital Banking platform. This manual provides a step-by-step guide for Customers, Employees, and Administrators to navigate and use the system effectively.

---

## 👤 1. Customer Portal: Detailed Guide

As a customer, you can manage your personal finances, apply for loans, and monitor your security.

### 🔑 Getting Started
1. **Registration:** Visit the [Registration Page](/register) to create your account. 
   - **Fields Required:** First Name, Last Name, Email, Phone, Address, Date of Birth, and Password.
   - **Validation:** Passwords must be at least 6 characters.
2. **Login:** Use your registered email and password on the [Login Page](/login). Ensure "Customer" is selected.

### 💰 Managing Funds: Interactive Procedures
- **Dashboard:** 
  - **Account Balance:** View the total real-time balance for all your accounts.
  - **Quick Stats:** View your monthly volume and total transaction count.
- **Transfers:** 
  - Choose one of your accounts.
  - Enter valid **Beneficiary Account Number** (e.g., `ACC35467...`).
  - Choose Transfer Mode:
    - **NEFT:** Next-business-day settlement.
    - **IMPS:** Instant, 24/7.
    - **RTGS:** Minimum ₹2,00,000 required.
  - Enter Amount (₹).
  - **Action:** Click "Transfer Now". If successful, your balance will update immediately.
- **Transactions:** 
  - Filter and search for specific transaction types (Deposit/Withdrawal/Transfer).
  - Use the "Download Statement" button for official PDF records (in next release).

### 🏥 Loans & KYC: Workflow
- **Apply for Loan:** 
  - **Selection:** Choose between Personal, Home, Vehicle, or Education.
  - **Calculation:** Input the amount (₹) and tenure (Months). The interest rate is automatically calculated by the system.
  - **Submission:** Click "Submit Application". You will get a notification when an employee reviews it.
- **KYC Status:** Your profile will initially show "Pending KYC". 
  - Until **Verified**, your transfer limits are capped at ₹1,00,000 per transaction.
  - Contact support or visit a branch to confirm your identity.

---

## 🧑‍💼 2. Employee Portal: Operations Manual

Employees are responsible for the day-to-day operations and verification of customer data.

### 📋 Daily Operations & Navigation
- **Dashboard Overview:** Monitor total branch deposits and today's active tasks.
- **Customer Directory:** 
  - Search for customers by Name, Email, or Account Number.
  - **Details:** View their full contact information and active account list.

### ✅ Verifications: Step-by-Step
- **KYC Workflow:** 
  - Access the **KYC Queue** to see all pending identify verifications.
  - **Verify KYC:** Confirm the customer's ID matches their profile records.
  - **Reject KYC:** Used if documents are illegible or fraudulent.
- **Loan Verification:** 
  - Access the **Loan Queue** to review new applications.
  - Review the loan amount and purpose.
  - Click **Approve** to instantly disburse funds to the customer's savings account.
  - Click **Reject** if the customer's history or details do not meet branch criteria.

---

## ⚡ 3. Administrator Portal: Technical Oversight

Administrators have full system-wide control and access to advanced analytics.

### 🛡️ Fraud Monitoring: Security Interactions
- **Fraud Monitoring Center:** 
  - **Rules:** The system flags any transaction over ₹50,000 as "High" priority. It flags IMPS transfers over ₹100,000 as "Critical".
  - **Intervention:** If a transaction looks suspicious, Admin can **Investigate** (flagging to Employee).
  - **Resolution:** If the customer confirms the activity, Admin clicks **Resolve** to clear the alert.

### 📈 Reports & Analytics: Interactive Visualizations
- **System Stats:** Monitor total system AUM (Assets Under Management) and active customer counts.
- **Analytics Visuals:**
  - **Monthly Transactions:** Track business growth over a 6-month period.
  - **Transaction Types:** Understand user behavior (Deposit vs Transfer vs Loan Payment).
  - **Loan Portfolio:** See which loan categories (e.g., Home) carry the most value.
  - **Security Overview:** Real-time chart of Fraud Incident severity.

### 🛠️ System Management
- **Provisioning:** Create new staff accounts for your bank branches. 
- **Roles Available:** Teller, Manager, Analyst.
- **Security Audit:** Deactivate any employee account instantly if security is compromised.

---

## 🆘 Troubleshooting

- **"Account Deactivated":** Contact your administrator to re-enable your access.
- **"Invalid or Expired Token":** For security reasons, sessions expire after 1 hour. Please log in again.
- **"Access Denied":** RBAC prevents you from accessing a portal not assigned to your role.

---
**Digital Banking System | Official Documentation 2026**
