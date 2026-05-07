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

## API Reference

All endpoints are prefixed with `/api`. Authenticated endpoints require:

```
Authorization: Bearer <jwt_token>
```

### Auth

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| POST | `/api/auth/signup` | — | Create savings account |
| POST | `/api/auth/login` | — | Login — returns JWT |
| POST | `/api/auth/forgot-password` | — | Reset password |
| GET | `/api/auth/verify` | ✓ | Verify token validity |

### Account

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| GET | `/api/account/details` | ✓ | Full account information |
| GET | `/api/account/balance` | ✓ | Current balance |
| DELETE | `/api/account/close` | ✓ | Close account |

### Transactions

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| POST | `/api/transactions/deposit` | ✓ | Deposit funds |
| POST | `/api/transactions/withdraw` | ✓ | Withdraw funds (max ₹50,000) |
| POST | `/api/transactions/transfer` | ✓ | Transfer to another account (max ₹2,00,000) |
| GET | `/api/transactions/history` | ✓ | Transaction history (`?limit=20`) |

### Debit Cards

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| GET | `/api/cards` | ✓ | List all debit cards |
| POST | `/api/cards/create` | ✓ | Create new debit card (max 3) |
| GET | `/api/cards/:id` | ✓ | Card details and recent transactions |
| POST | `/api/cards/:id/withdraw` | ✓ | Withdraw via card |
| POST | `/api/cards/:id/payment` | ✓ | Make a payment — earns reward points |
| POST | `/api/cards/:id/redeem` | ✓ | Redeem reward points for cashback |
| PUT | `/api/cards/:id/password` | ✓ | Change card password |

### Current Account

| Method | Endpoint | Auth | Description |
|---|---|:---:|---|
| POST | `/api/current/apply` | — | Apply for current account |
| GET | `/api/current/dashboard` | ✓ | Dashboard data |
| POST | `/api/current/gst-payment` | ✓ | Process GST/Tax payment |
| POST | `/api/current/download-statement` | ✓ | Email statement (CSV) |

---

## Gmail App Password Setup

Account numbers and card details are sent **exclusively via email**. To enable email delivery:

1. Go to [myaccount.google.com/security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**
3. Search for **App Passwords** → generate one named `YourBank`
4. Paste the 16-character password into `backend/.env` as `SMTP_PASS`

---

## Security Notes

- Never commit `.env` — add it to `.gitignore`
- Use a strong, randomly generated `SECRET_KEY` (32+ characters) in production
- Generate `ENCRYPTION_KEY` once with `Fernet.generate_key()` and back it up securely
- SQLite is suitable for development; use PostgreSQL for production deployments
- Run behind a production WSGI server such as Gunicorn with debug mode disabled

---

## License

MIT
