# DBank — Secure Internet Banking System

A full-stack banking web application built with a **Flask REST API** backend and a **React** frontend. Designed to simulate a real-world internet banking portal with industry-standard security practices.

---

## Features

### Savings Account
- Account registration with email delivery of account number
- Secure login with account number and password
- Deposit, Withdraw, and Fund Transfer
- Debit card management (up to 3 cards per account)
- Card transactions: Withdraw, Payment, Redeem Points
- Reward points system (earned on card payments)
- Transaction history with filters
- Downloadable PDF account statements with date range selection
- Account details and account closure

### Current Account
- Business account application (Regular & Premium tiers)
- Dashboard with monthly income/expense summary
- GST / Tax payment processing
- Low balance and large transaction alerts
- Exclusive business offers

### Security
- JWT-based authentication (24-hour tokens)
- Fernet symmetric encryption on all sensitive database fields — phone, email, DOB, address, card numbers, CVV
- Account lockout after 5 failed login attempts (15-minute cooldown)
- Rate limiting on all sensitive endpoints
- Transfer endpoint enforces server-side sender verification — client cannot spoof the source account
- Password policy: minimum 8 characters with uppercase, lowercase, digit, and special character
- CORS restricted to known frontend origins
- No sensitive data ever returned in error responses

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, React Router, Axios, jsPDF |
| Backend | Python 3.13, Flask 3.1 |
| Database | SQLite via SQLAlchemy |
| Auth | PyJWT |
| Encryption | cryptography (Fernet) |
| Email | smtplib — Gmail SMTP |
| Rate Limiting | Flask-Limiter |

---

## Project Structure

```
Banking System/
├── backend/
│   ├── app.py              # Flask REST API — all endpoints
│   ├── models.py           # SQLAlchemy models with field-level encryption
│   ├── encryption.py       # Fernet encryption/decryption helpers
│   ├── auth.py             # JWT generation, verification, account lockout
│   ├── email_service.py    # SMTP email delivery
│   ├── requirements.txt
│   └── .env                # Environment variables (not committed)
├── frontend/
│   ├── src/
│   │   ├── api/            # Axios API client
│   │   ├── components/     # Layout (sidebar), ProtectedRoute
│   │   ├── context/        # AuthContext — JWT state management
│   │   └── pages/          # All page components
│   ├── package.json
│   └── vite.config.js
├── instance/
│   └── banking.db          # SQLite database
├── start.sh                # Starts both servers
└── README.md
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- npm

### 1. Clone the repository

```bash
git clone https://github.com/your-username/banking-system.git
cd "banking-system"
```

### 2. Set up the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
SECRET_KEY=your-long-random-secret-key

# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=your-fernet-key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=yourbank@gmail.com
SMTP_PASS=xxxx xxxx xxxx xxxx   # Gmail App Password

BANK_NAME=YourBank
```

> **Important:** `ENCRYPTION_KEY` must remain constant after first run. Changing it will make all existing encrypted data unreadable.

### 4. Set up the frontend

```bash
cd ../frontend
npm install
```

### 5. Run the application

From the project root:

```bash
./start.sh
```

Or manually in two terminals:

```bash
# Terminal 1 — Backend (http://localhost:5001)
cd backend && python app.py

# Terminal 2 — Frontend (http://localhost:5173)
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.
---

## License

MIT
