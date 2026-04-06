#!/bin/bash

# Digital Banking & Fraud Detection System - Automated Setup Script 🚀
# This script will install dependencies, configure the database, and prepare the project for running.

set -e # Exit on any error

# Colors for professional output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================================${NC}"
echo -e "${PURPLE}🏦 Digital Banking & Fraud Detection System - Setup 🛡️${NC}"
echo -e "${BLUE}==================================================================${NC}\n"

# 1. System Dependency Checks
echo -e "${BLUE}[1/5] Checking System Dependencies...${NC}"
if ! command -v node &> /dev/null; then echo -e "❌ Node.js not found. Please install it."; exit 1; fi
if ! command -v psql &> /dev/null; then echo -e "❌ PostgreSQL (psql) not found. Please install it."; exit 1; fi
echo -e "✅ System Dependencies Verified.\n"

# 2. Project Installation
echo -e "${BLUE}[2/5] Installing Project Dependencies...${NC}"

echo -e "📦 Installing Backend Dependencies..."
cd backend && npm install
echo -e "✅ Backend Dependencies Installed."

echo -e "📦 Installing Frontend Dependencies..."
cd ../frontend && npm install
echo -e "✅ Frontend Dependencies Installed.\n"

# 3. Environment Configuration
echo -e "${BLUE}[3/5] Configuring Environment Variables...${NC}"
cd ../backend
if [ ! -f .env ]; then
    echo -e "📄 Creating default .env file for backend..."
    cp .env.example .env 2>/dev/null || cat <<EOT > .env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=banking_db
DB_USER=banking_user
DB_PASSWORD=banking1234
JWT_SECRET=super_secret_banking_jwt_key_2024
FRONTEND_URL=http://localhost:3000
EOT
    echo -e "⚠️ Created .env with default local credentials."
else
    echo -e "✅ Existing .env file found."
fi
echo ""

# 4. Database Setup
echo -e "${BLUE}[4/5] Setting up PostgreSQL Database...${NC}"
DB_NAME=$(grep DB_NAME .env | cut -d '=' -f2)
DB_USER=$(grep DB_USER .env | cut -d '=' -f2)
DB_PASS=$(grep DB_PASSWORD .env | cut -d '=' -f2)

export PGPASSWORD=$DB_PASS

echo -e "🏗️ Creating Database: ${DB_NAME} if not exists..."
psql -U $DB_USER -h localhost -tc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'" | grep -q 1 || \
psql -U $DB_USER -h localhost -c "CREATE DATABASE $DB_NAME"

echo -e "📜 Running Schema Scripts..."
psql -U $DB_USER -h localhost -d $DB_NAME -f src/db/schema.sql

echo -e "🌱 Seeding Professional Demo Data..."
node src/db/seed.js

echo -e "✅ Database Setup Completed Successfully.\n"

# 5. Final Instructions
echo -e "${BLUE}[5/5] Setup Complete! 🚀${NC}"
echo -e "${BLUE}==================================================================${NC}"
echo -e "${GREEN}Project is ready to run!${NC}"
echo -e "\nTo start the application:"
echo -e "1. Terminal 1 (Backend): ${PURPLE}cd backend && npm run dev${NC}"
echo -e "2. Terminal 2 (Frontend): ${PURPLE}cd frontend && npm run dev${NC}"
echo -e "\nHappy Banking! 🏦"
echo -e "${BLUE}==================================================================${NC}"
