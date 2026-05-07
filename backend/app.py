import os
import re
import random
import string
import secrets
import csv
from io import StringIO
from datetime import datetime, timedelta, timezone

def utcnow():
    return datetime.now(timezone.utc).replace(tzinfo=None)
from functools import wraps

from dotenv import load_dotenv
load_dotenv()

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import SQLAlchemyError

from models import db, Account, Amount, Transaction, DebitCard, CurrentAccountApplication
from auth import (require_auth, get_current_user, generate_token,
                  record_failed_login, reset_login_attempts, is_account_locked)
from email_service import (send_account_created_email, send_current_account_email,
                           send_card_created_email, send_email)

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-CHANGE-IN-PRODUCTION')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, '..', 'instance', 'banking.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

CORS(app,
     origins=['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://localhost:5174'],
     supports_credentials=True,
     allow_headers=['Content-Type', 'Authorization'],
     methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'])

db.init_app(app)

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=['500 per day', '100 per hour'],
    storage_uri='memory://',
)

BUSINESS_TYPES = [
    'Business', 'Sole Proprietorship', 'Private Limited Company',
    'Public Limited Company', 'Trust', 'Association', 'Partnership', 'LLP',
]
BUSINESS_MIN_TURNOVER = {
    'Business': 1_000_000, 'Sole Proprietorship': 500_000,
    'Private Limited Company': 2_000_000, 'Public Limited Company': 5_000_000,
    'Trust': 100_000, 'Association': 100_000,
    'Partnership': 500_000, 'LLP': 1_000_000,
}


# ── helpers ──────────────────────────────────────────────────────────────────

def ok(data=None, message='', status=200):
    resp = {'success': True}
    if data is not None:
        resp['data'] = data
    if message:
        resp['message'] = message
    return jsonify(resp), status


def err(message, status=400):
    return jsonify({'success': False, 'error': message}), status


def generate_acno():
    while True:
        acno = ''.join(random.choices(string.digits, k=10))
        if not Account.query.filter_by(acno=acno).first():
            return acno


def validate_password_strength(password: str) -> bool:
    return bool(re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$', password))


def gen_card_password() -> str:
    chars = string.ascii_letters + string.digits + '@$!%*?&'
    while True:
        pwd = ''.join(secrets.choice(chars) for _ in range(10))
        if (re.search(r'[A-Z]', pwd) and re.search(r'[a-z]', pwd)
                and re.search(r'\d', pwd)):
            return pwd


def require_current_account(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if g.account_type != 'CURRENT':
            return err('This endpoint is for Current Account holders only.', 403)
        return f(*args, **kwargs)
    return decorated


# ── error handlers ────────────────────────────────────────────────────────────

@app.errorhandler(404)
def not_found(_):
    return err('Resource not found.', 404)


@app.errorhandler(500)
def internal_error(e):
    app.logger.error(f'500 error: {e}')
    return err('An internal error occurred. Please try again.', 500)


@app.errorhandler(429)
def ratelimit_handler(_):
    return err('Too many requests. Please slow down and try again later.', 429)


# ── AUTH ──────────────────────────────────────────────────────────────────────

@app.route('/api/auth/signup', methods=['POST'])
@limiter.limit('5 per hour')
def signup():
    data = request.get_json(silent=True) or {}
    name = str(data.get('name', '')).strip()
    dob = str(data.get('dob', '')).strip()
    phone = str(data.get('phone', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    address = str(data.get('address', '')).strip()
    opening_balance = data.get('opening_balance', '')
    password = str(data.get('password', ''))
    confirm_password = str(data.get('confirm_password', ''))

    errors = []
    if not re.match(r'^[A-Za-z\s]{3,100}$', name):
        errors.append('Name must contain only letters (3–100 characters).')
    try:
        datetime.strptime(dob, '%Y-%m-%d')
    except ValueError:
        errors.append('Date of birth must be in YYYY-MM-DD format.')
    if not re.match(r'^\d{10}$', phone):
        errors.append('Phone number must be exactly 10 digits.')
    if not re.match(r'^[\w.\-]+@[\w.\-]+\.\w{2,}$', email):
        errors.append('Please enter a valid email address.')
    if not address or len(address) < 5:
        errors.append('Address must be at least 5 characters.')
    try:
        bal = int(opening_balance)
        if bal < 500:
            errors.append('Opening balance must be at least ₹500.')
    except (TypeError, ValueError):
        errors.append('Opening balance must be a valid number.')
        bal = 0
    if password != confirm_password:
        errors.append('Passwords do not match.')
    elif not validate_password_strength(password):
        errors.append('Password must be at least 8 characters with uppercase, lowercase, digit, and special character (@$!%*?&).')

    if errors:
        return jsonify({'success': False, 'errors': errors}), 422

    if Account.query.filter(Account._email.isnot(None)).all():
        from encryption import decrypt as _d
        for acc in Account.query.all():
            if acc.email.lower() == email:
                return err('An account with this email already exists.', 409)

    try:
        acno = generate_acno()
        hashed_pw = generate_password_hash(password)

        account = Account(
            name=name,
            acno=acno,
            opening_balance=bal,
            password=hashed_pw,
            account_type='SAVINGS',
            points=0,
        )
        account.dob = dob
        account.phone = phone
        account.email = email
        account.address = address

        amount = Amount(acno=acno, balance=bal)
        txn = Transaction(
            acno=acno, transaction_type='DEPOSIT',
            amount=bal, balance_after=bal,
            timestamp=utcnow(),
            description='Account opening deposit',
        )

        db.session.add_all([account, amount, txn])
        db.session.flush()

        raw_card_number = ''.join(random.choices(string.digits, k=16))
        expiry = f"{utcnow().month:02d}/{utcnow().year + 5}"
        raw_cvv = ''.join(random.choices(string.digits, k=3))
        card_password_plain = gen_card_password()

        card = DebitCard(
            account_id=account.id,
            expiry_date=expiry,
            password_hash=generate_password_hash(card_password_plain),
        )
        card.card_number = raw_card_number
        card.cvv = raw_cvv

        db.session.add(card)
        db.session.commit()

        try:
            send_account_created_email(
                email=email, name=name, acno=acno, account_type='SAVINGS',
                debit_card_number=raw_card_number, expiry_date=expiry,
            )
        except Exception as e:
            app.logger.warning(f'Welcome email failed for {acno}: {e}')

        return ok(message='Account created successfully! Your account number has been sent to your registered email. Please check your inbox to login.', status=201)

    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f'Signup DB error: {e}')
        return err('Database error. Please try again.', 500)


@app.route('/api/auth/login', methods=['POST'])
@limiter.limit('15 per minute')
def login():
    data = request.get_json(silent=True) or {}
    acno = str(data.get('acno', '')).strip()
    password = str(data.get('password', ''))
    account_type = str(data.get('account_type', 'SAVINGS')).upper()

    if account_type not in ('SAVINGS', 'CURRENT'):
        return err('Invalid account type.', 400)

    if not acno or not password:
        return err('Account number and password are required.', 400)

    account = Account.query.filter_by(acno=acno, account_type=account_type).first()

    if not account:
        return err('Invalid account number or password.', 401)

    if is_account_locked(account):
        remaining = (account.locked_until - utcnow()).seconds // 60
        return err(f'Account locked due to too many failed attempts. Try again in {remaining+1} minute(s).', 423)

    if not check_password_hash(account.password, password):
        record_failed_login(account, db)
        attempts_left = max(0, 5 - (account.login_attempts or 0))
        if attempts_left > 0:
            return err(f'Invalid account number or password. {attempts_left} attempt(s) remaining.', 401)
        else:
            return err('Account locked for 15 minutes due to too many failed attempts.', 423)

    reset_login_attempts(account, db)
    token = generate_token(account.acno, account.account_type)

    return ok({
        'token': token,
        'user': {
            'name': account.name,
            'acno': account.acno,
            'account_type': account.account_type,
            'points': account.points,
        }
    })


@app.route('/api/auth/forgot-password', methods=['POST'])
@limiter.limit('3 per hour')
def forgot_password():
    data = request.get_json(silent=True) or {}
    acno = str(data.get('acno', '')).strip()
    email_input = str(data.get('email', '')).strip().lower()
    new_password = str(data.get('new_password', ''))
    confirm_password = str(data.get('confirm_password', ''))

    if new_password != confirm_password:
        return err('Passwords do not match.')
    if not validate_password_strength(new_password):
        return err('Password must be at least 8 characters with uppercase, lowercase, digit, and special character.')

    account = Account.query.filter_by(acno=acno).first()
    if not account or account.email.lower() != email_input:
        return err('Account not found or email does not match our records.', 404)

    try:
        account.password = generate_password_hash(new_password)
        account.login_attempts = 0
        account.locked_until = None
        db.session.commit()
        return ok(message='Password updated successfully. Please login with your new password.')
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f'Password reset DB error: {e}')
        return err('Database error. Please try again.', 500)


@app.route('/api/auth/verify', methods=['GET'])
@require_auth
def verify_token_route():
    account = get_current_user()
    if not account:
        return err('Account not found.', 404)
    return ok({'user': {'name': account.name, 'acno': account.acno,
                        'account_type': account.account_type, 'points': account.points}})


# ── ACCOUNT ───────────────────────────────────────────────────────────────────

@app.route('/api/account/details', methods=['GET'])
@require_auth
def account_details():
    account = get_current_user()
    if not account:
        return err('Account not found.', 404)
    amount = Amount.query.filter_by(acno=account.acno).first()
    data = account.to_dict(include_sensitive=True)
    data['balance'] = amount.balance if amount else 0
    return ok(data)


@app.route('/api/account/balance', methods=['GET'])
@require_auth
def account_balance():
    amount = Amount.query.filter_by(acno=g.user_acno).first()
    if not amount:
        return err('Balance record not found.', 404)
    return ok({'balance': amount.balance})


@app.route('/api/account/close', methods=['DELETE'])
@require_auth
def close_account():
    data = request.get_json(silent=True) or {}
    password = str(data.get('password', ''))

    account = get_current_user()
    if not account:
        return err('Account not found.', 404)
    if not check_password_hash(account.password, password):
        return err('Incorrect password.', 401)

    amount = Amount.query.filter_by(acno=account.acno).first()
    if amount and amount.balance > 0:
        return err(f'Please withdraw your remaining balance of ₹{amount.balance:.0f} before closing the account.')

    try:
        DebitCard.query.filter_by(account_id=account.id).delete()
        Transaction.query.filter_by(acno=account.acno).delete()
        Amount.query.filter_by(acno=account.acno).delete()
        db.session.delete(account)
        db.session.commit()
        return ok(message='Account closed successfully.')
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f'Close account DB error: {e}')
        return err('Database error. Please try again.', 500)


# ── TRANSACTIONS ──────────────────────────────────────────────────────────────

@app.route('/api/transactions/deposit', methods=['POST'])
@require_auth
@limiter.limit('30 per hour')
def deposit():
    data = request.get_json(silent=True) or {}
    try:
        amount = int(data.get('amount', 0))
    except (TypeError, ValueError):
        return err('Amount must be a whole number.')
    if amount <= 0:
        return err('Amount must be a positive number.')
    if amount > 1_000_000:
        return err('Maximum deposit per transaction is ₹10,00,000.')

    user_amount = Amount.query.filter_by(acno=g.user_acno).first()
    if not user_amount:
        return err('Account balance record not found.', 404)

    try:
        user_amount.balance += amount
        txn = Transaction(
            acno=g.user_acno, transaction_type='DEPOSIT',
            amount=amount, balance_after=user_amount.balance,
            timestamp=utcnow(),
        )
        db.session.add(txn)
        db.session.commit()
        return ok({'balance': user_amount.balance, 'transaction_id': txn.id},
                  f'₹{amount:,} deposited successfully.')
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f'Deposit DB error: {e}')
        return err('Transaction failed. Please try again.', 500)


@app.route('/api/transactions/withdraw', methods=['POST'])
@require_auth
@limiter.limit('20 per hour')
def withdraw():
    data = request.get_json(silent=True) or {}
    try:
        amount = int(data.get('amount', 0))
    except (TypeError, ValueError):
        return err('Amount must be a whole number.')
    if amount <= 0:
        return err('Amount must be a positive number.')
    if amount > 50_000:
        return err('Maximum withdrawal per transaction is ₹50,000.')

    user_amount = Amount.query.filter_by(acno=g.user_acno).first()
    if not user_amount:
        return err('Account balance record not found.', 404)
    if user_amount.balance < amount:
        return err(f'Insufficient balance. Current balance: ₹{user_amount.balance:,.0f}')

    try:
        user_amount.balance -= amount
        txn = Transaction(
            acno=g.user_acno, transaction_type='WITHDRAW',
            amount=amount, balance_after=user_amount.balance,
            timestamp=utcnow(),
        )
        db.session.add(txn)
        db.session.commit()
        return ok({'balance': user_amount.balance}, f'₹{amount:,} withdrawn successfully.')
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f'Withdraw DB error: {e}')
        return err('Transaction failed. Please try again.', 500)


@app.route('/api/transactions/transfer', methods=['POST'])
@require_auth
@limiter.limit('10 per hour')
def transfer():
    data = request.get_json(silent=True) or {}
    to_acno = str(data.get('to_acno', '')).strip()

    try:
        amount = int(data.get('amount', 0))
    except (TypeError, ValueError):
        return err('Amount must be a whole number.')

    # SECURITY FIX: from_acno comes ONLY from JWT, never from client input
    from_acno = g.user_acno

    if not re.match(r'^\d{10}$', to_acno):
        return err('Recipient account number must be exactly 10 digits.')
    if to_acno == from_acno:
        return err('Cannot transfer to your own account.')
    if amount <= 0:
        return err('Amount must be a positive number.')
    if amount > 200_000:
        return err('Maximum transfer per transaction is ₹2,00,000.')

    sender = Amount.query.filter_by(acno=from_acno).first()
    receiver = Amount.query.filter_by(acno=to_acno).first()

    if not receiver:
        return err('Recipient account not found.')
    if not sender:
        return err('Sender account not found.', 404)
    if sender.balance < amount:
        return err(f'Insufficient balance. Current balance: ₹{sender.balance:,.0f}')

    try:
        sender.balance -= amount
        receiver.balance += amount
        now = utcnow()

        receiver_account = Account.query.filter_by(acno=to_acno).first()
        receiver_name = receiver_account.name if receiver_account else to_acno

        txn_out = Transaction(
            acno=from_acno, transaction_type='TRANSFER',
            amount=amount, balance_after=sender.balance,
            timestamp=now, description=f'Transfer to {to_acno}',
        )
        txn_in = Transaction(
            acno=to_acno, transaction_type='RECEIVE',
            amount=amount, balance_after=receiver.balance,
            timestamp=now, description=f'Transfer from {from_acno}',
        )
        db.session.add_all([txn_out, txn_in])
        db.session.commit()
        return ok({'balance': sender.balance, 'recipient': receiver_name},
                  f'₹{amount:,} transferred successfully to {to_acno}.')
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f'Transfer DB error: {e}')
        return err('Transaction failed. Please try again.', 500)


@app.route('/api/transactions/history', methods=['GET'])
@require_auth
def transaction_history():
    try:
        limit = min(int(request.args.get('limit', 20)), 100)
    except (TypeError, ValueError):
        limit = 20

    txns = (Transaction.query
            .filter_by(acno=g.user_acno)
            .order_by(Transaction.timestamp.desc())
            .limit(limit).all())
    return ok({'transactions': [t.to_dict() for t in txns]})


# ── DEBIT CARDS ───────────────────────────────────────────────────────────────

@app.route('/api/cards', methods=['GET'])
@require_auth
def list_cards():
    account = get_current_user()
    if not account:
        return err('Account not found.', 404)
    cards = DebitCard.query.filter_by(account_id=account.id).all()
    return ok({'cards': [c.to_dict() for c in cards]})


@app.route('/api/cards/create', methods=['POST'])
@require_auth
def create_card():
    account = get_current_user()
    if not account:
        return err('Account not found.', 404)

    existing = DebitCard.query.filter_by(account_id=account.id).count()
    if existing >= 3:
        return err('Maximum of 3 debit cards allowed per account.')

    raw_number = ''.join(random.choices(string.digits, k=16))
    expiry = f"{utcnow().month:02d}/{utcnow().year + 5}"
    raw_cvv = ''.join(random.choices(string.digits, k=3))
    card_password = gen_card_password()

    card = DebitCard(
        account_id=account.id,
        expiry_date=expiry,
        password_hash=generate_password_hash(card_password),
    )
    card.card_number = raw_number
    card.cvv = raw_cvv

    try:
        db.session.add(card)
        db.session.commit()
        try:
            send_card_created_email(
                email=account.email, name=account.name,
                masked_number=card.masked_number,
                expiry_date=expiry, card_password=card_password,
            )
        except Exception as e:
            app.logger.warning(f'Card email failed: {e}')

        return ok({'card_id': card.id, 'masked_number': card.masked_number,
                   'expiry_date': expiry},
                  'Debit card created. Details sent to your registered email.', 201)
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f'Card create DB error: {e}')
        return err('Failed to create card. Please try again.', 500)


def _get_verified_card(card_id):
    account = get_current_user()
    if not account:
        return None, None, err('Account not found.', 404)
    card = DebitCard.query.get(card_id)
    if not card or card.account_id != account.id:
        return None, None, err('Debit card not found or access denied.', 404)
    return account, card, None


@app.route('/api/cards/<int:card_id>', methods=['GET'])
@require_auth
def card_detail(card_id):
    account, card, error = _get_verified_card(card_id)
    if error:
        return error
    txns = (Transaction.query.filter_by(acno=account.acno)
            .order_by(Transaction.timestamp.desc()).limit(20).all())
    return ok({'card': card.to_dict(), 'transactions': [t.to_dict() for t in txns]})


@app.route('/api/cards/<int:card_id>/withdraw', methods=['POST'])
@require_auth
@limiter.limit('10 per hour')
def card_withdraw(card_id):
    account, card, error = _get_verified_card(card_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    card_password = str(data.get('card_password', ''))
    try:
        amount = int(data.get('amount', 0))
    except (TypeError, ValueError):
        return err('Amount must be a whole number.')

    if not check_password_hash(card.password_hash, card_password):
        return err('Incorrect card password.', 401)
    if amount <= 0:
        return err('Amount must be positive.')
    if amount > 50_000:
        return err('Maximum ₹50,000 per card withdrawal.')

    user_amount = Amount.query.filter_by(acno=account.acno).first()
    if not user_amount or user_amount.balance < amount:
        return err('Insufficient balance.')

    try:
        user_amount.balance -= amount
        txn = Transaction(
            acno=account.acno, transaction_type='WITHDRAW',
            amount=amount, balance_after=user_amount.balance,
            timestamp=utcnow(), description='Card withdrawal',
        )
        db.session.add(txn)
        db.session.commit()
        return ok({'balance': user_amount.balance}, f'₹{amount:,} withdrawn successfully.')
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f'Card withdraw DB error: {e}')
        return err('Transaction failed. Please try again.', 500)


@app.route('/api/cards/<int:card_id>/payment', methods=['POST'])
@require_auth
@limiter.limit('15 per hour')
def card_payment(card_id):
    account, card, error = _get_verified_card(card_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    card_password = str(data.get('card_password', ''))
    to_acno = str(data.get('to_acno', '')).strip()
    try:
        amount = int(data.get('amount', 0))
    except (TypeError, ValueError):
        return err('Amount must be a whole number.')

    if not check_password_hash(card.password_hash, card_password):
        return err('Incorrect card password.', 401)
    if not re.match(r'^\d{10}$', to_acno):
        return err('Recipient account number must be exactly 10 digits.')
    if to_acno == account.acno:
        return err('Cannot pay to your own account.')
    if amount <= 0:
        return err('Amount must be positive.')

    user_amount = Amount.query.filter_by(acno=account.acno).first()
    receiver_amount = Amount.query.filter_by(acno=to_acno).first()

    if not receiver_amount:
        return err('Recipient account not found.')
    if not user_amount or user_amount.balance < amount:
        return err('Insufficient balance.')

    try:
        user_amount.balance -= amount
        receiver_amount.balance += amount

        if amount >= 10_000:
            points = 170 * (amount // 10_000) + (amount % 10_000) // 100
        else:
            points = amount // 100
        account.points = (account.points or 0) + points

        now = utcnow()
        txn_out = Transaction(
            acno=account.acno, transaction_type='PAYMENT',
            amount=amount, balance_after=user_amount.balance,
            timestamp=now, description=f'Payment to {to_acno}',
        )
        txn_in = Transaction(
            acno=to_acno, transaction_type='RECEIVE',
            amount=amount, balance_after=receiver_amount.balance,
            timestamp=now, description=f'Payment from {account.acno}',
        )
        db.session.add_all([txn_out, txn_in])
        db.session.commit()
        return ok({'balance': user_amount.balance, 'points_earned': points,
                   'total_points': account.points},
                  f'₹{amount:,} paid successfully! You earned {points} reward points.')
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f'Card payment DB error: {e}')
        return err('Payment failed. Please try again.', 500)


@app.route('/api/cards/<int:card_id>/redeem', methods=['POST'])
@require_auth
def card_redeem(card_id):
    account, card, error = _get_verified_card(card_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    try:
        points_to_redeem = int(data.get('points', 0))
    except (TypeError, ValueError):
        return err('Points must be a whole number.')
    if points_to_redeem <= 0:
        return err('Points must be positive.')
    if (account.points or 0) < points_to_redeem:
        return err(f'Insufficient points. You have {account.points or 0} points.')

    cash = int(points_to_redeem * 0.25)
    if cash <= 0:
        return err('Minimum redemption is 4 points (₹1).')

    user_amount = Amount.query.filter_by(acno=account.acno).first()
    if not user_amount:
        return err('Account balance record not found.', 404)

    try:
        user_amount.balance += cash
        account.points -= points_to_redeem
        txn = Transaction(
            acno=account.acno, transaction_type='REDEEM',
            amount=cash, balance_after=user_amount.balance,
            timestamp=utcnow(),
            description=f'Redeemed {points_to_redeem} points',
        )
        db.session.add(txn)
        db.session.commit()
        return ok({'cash_credited': cash, 'new_balance': user_amount.balance,
                   'remaining_points': account.points},
                  f'Redeemed {points_to_redeem} points for ₹{cash}.')
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f'Redeem DB error: {e}')
        return err('Redemption failed. Please try again.', 500)


@app.route('/api/cards/<int:card_id>/password', methods=['PUT'])
@require_auth
def card_change_password(card_id):
    account, card, error = _get_verified_card(card_id)
    if error:
        return error

    data = request.get_json(silent=True) or {}
    old_password = str(data.get('old_password', ''))
    new_password = str(data.get('new_password', ''))

    if not check_password_hash(card.password_hash, old_password):
        return err('Incorrect current password.', 401)
    if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$', new_password):
        return err('New password must be at least 8 characters with uppercase, lowercase, and digit.')

    try:
        card.password_hash = generate_password_hash(new_password)
        db.session.commit()
        return ok(message='Card password updated successfully.')
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f'Card password change DB error: {e}')
        return err('Failed to update password. Please try again.', 500)


# ── CURRENT ACCOUNT ───────────────────────────────────────────────────────────

@app.route('/api/current/apply', methods=['POST'])
@limiter.limit('3 per hour')
def current_account_apply():
    data = request.get_json(silent=True) or {}
    name = str(data.get('name', '')).strip()
    phone = str(data.get('phone', '')).strip()
    email = str(data.get('email', '')).strip().lower()
    dob = str(data.get('dob', '')).strip()
    business_type = str(data.get('business_type', '')).strip()
    company_name = str(data.get('company_name', '')).strip()
    account_type = str(data.get('account_type', '')).strip().lower()
    start_date = str(data.get('start_date', '')).strip()

    try:
        turnover = int(str(data.get('turnover', '0')).replace(',', ''))
    except (TypeError, ValueError):
        return err('Turnover must be a valid number.')

    errors = []
    if not re.match(r'^[A-Za-z\s]{3,100}$', name):
        errors.append('Name must contain only letters (3–100 chars).')
    if not re.match(r'^\d{10}$', phone):
        errors.append('Phone must be exactly 10 digits.')
    if not re.match(r'^[\w.\-]+@[\w.\-]+\.\w{2,}$', email):
        errors.append('Invalid email address.')
    try:
        datetime.strptime(dob, '%Y-%m-%d')
    except ValueError:
        errors.append('DOB must be in YYYY-MM-DD format.')
    if business_type not in BUSINESS_TYPES:
        errors.append('Invalid business type.')
    if not company_name or len(company_name) < 3:
        errors.append('Company name must be at least 3 characters.')
    if account_type not in ('regular', 'premium'):
        errors.append('Account type must be regular or premium.')
    try:
        datetime.strptime(start_date, '%Y-%m-%d')
    except ValueError:
        errors.append('Company start date must be in YYYY-MM-DD format.')

    if not errors:
        min_turnover = BUSINESS_MIN_TURNOVER.get(business_type, 0)
        if turnover < min_turnover:
            errors.append(f'Minimum annual turnover for {business_type} is ₹{min_turnover:,}.')
        if account_type == 'premium' and turnover < 400_000_000:
            errors.append('Premium Current Account requires annual turnover of at least ₹4,00,00,000.')

    if errors:
        return jsonify({'success': False, 'errors': errors}), 422

    acno = generate_acno()
    opening_balance = 50_000 if account_type == 'regular' else 3_500_000

    temp_password = gen_card_password()
    hashed_pw = generate_password_hash(temp_password)

    if account_type == 'regular':
        features = (
            '• Monthly account balance: ₹50,000\n'
            '• Free cash deposit up to ₹18,00,000 per month\n'
            '• Free 20 Demand Drafts per month\n'
            '• Quarterly charges: ₹1,000'
        )
    else:
        features = (
            '• Monthly account balance: ₹35,00,000\n'
            '• Free cash deposit up to ₹5,00,00,000 per month\n'
            '• Unlimited free Demand Drafts/Banker Cheques\n'
            '• Quarterly charges: ₹300'
        )

    try:
        account = Account(
            name=name, acno=acno,
            opening_balance=opening_balance,
            password=hashed_pw,
            account_type='CURRENT',
            points=0,
        )
        account.dob = dob
        account.phone = phone
        account.email = email
        account.address = company_name

        application = CurrentAccountApplication(
            account_type=account_type, name=name, phone=phone,
            email=email, dob=dob, business_type=business_type,
            company_name=company_name, turnover=turnover,
            start_date=start_date, acno=acno,
        )

        db.session.add_all([
            account, application,
            Amount(acno=acno, balance=opening_balance),
            Transaction(acno=acno, transaction_type='DEPOSIT',
                        amount=opening_balance, balance_after=opening_balance,
                        timestamp=utcnow(), description='Account opening'),
        ])
        db.session.commit()

        try:
            send_current_account_email(
                email=email, name=name, acno=acno,
                account_type=account_type, temp_password=temp_password,
                features_text=features,
            )
        except Exception as e:
            app.logger.warning(f'Current account email failed: {e}')

        return ok(message='Current account created! Your account number and login credentials have been sent to your registered email. Please check your inbox to login.', status=201)

    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f'Current account apply DB error: {e}')
        return err('Database error. Please try again.', 500)


@app.route('/api/current/dashboard', methods=['GET'])
@require_auth
@require_current_account
def current_dashboard():
    account = get_current_user()
    if not account:
        return err('Account not found.', 404)

    amount = Amount.query.filter_by(acno=account.acno).first()
    txns = (Transaction.query.filter_by(acno=account.acno)
            .order_by(Transaction.timestamp.desc()).limit(100).all())

    from collections import defaultdict
    income_data = defaultdict(float)
    expense_data = defaultdict(float)
    for t in txns:
        month = t.timestamp.strftime('%b %Y') if t.timestamp else 'Unknown'
        if t.transaction_type in ('DEPOSIT', 'RECEIVE'):
            income_data[month] += t.amount
        elif t.transaction_type in ('WITHDRAW', 'TRANSFER', 'PAYMENT', 'GST_PAYMENT'):
            expense_data[month] += abs(t.amount)

    alerts = []
    bal = amount.balance if amount else 0
    if bal < 10_000:
        alerts.append({'type': 'warning', 'message': f'Low balance: ₹{bal:,.0f}. Minimum balance is ₹10,000.'})
    for t in txns[:20]:
        if abs(t.amount) > 100_000:
            alerts.append({'type': 'info',
                           'message': f'Large transaction: ₹{t.amount:,.0f} on {t.timestamp.strftime("%d %b %Y") if t.timestamp else "N/A"}.'})

    offers = [
        'Business Loan: Up to ₹50,00,000 at 9.5% p.a.',
        'Overdraft Facility: Up to ₹10,00,000 with zero processing fee.',
        'Credit Card: Free for first year, 2% cashback on business spends.',
    ]

    return ok({
        'account': account.to_dict(include_sensitive=False),
        'balance': bal,
        'transactions': [t.to_dict() for t in txns[:10]],
        'income_data': dict(income_data),
        'expense_data': dict(expense_data),
        'alerts': alerts,
        'offers': offers,
    })


@app.route('/api/current/gst-payment', methods=['POST'])
@require_auth
@require_current_account
@limiter.limit('10 per hour')
def gst_payment():
    data = request.get_json(silent=True) or {}
    try:
        gst_amount = int(data.get('gst_amount', 0))
    except (TypeError, ValueError):
        return err('GST amount must be a whole number.')
    if gst_amount <= 0:
        return err('GST amount must be positive.')

    account = get_current_user()
    user_amount = Amount.query.filter_by(acno=account.acno).first()
    if not user_amount or user_amount.balance < gst_amount:
        return err(f'Insufficient balance. Current balance: ₹{(user_amount.balance if user_amount else 0):,.0f}')

    try:
        user_amount.balance -= gst_amount
        txn = Transaction(
            acno=account.acno, transaction_type='GST_PAYMENT',
            amount=gst_amount, balance_after=user_amount.balance,
            timestamp=utcnow(), description='GST/Tax Payment',
        )
        db.session.add(txn)
        db.session.commit()
        return ok({'balance': user_amount.balance}, f'GST payment of ₹{gst_amount:,} processed successfully.')
    except SQLAlchemyError as e:
        db.session.rollback()
        app.logger.error(f'GST payment DB error: {e}')
        return err('Payment failed. Please try again.', 500)


@app.route('/api/current/download-statement', methods=['POST'])
@require_auth
def download_statement():
    account = get_current_user()
    if not account:
        return err('Account not found.', 404)

    txns = (Transaction.query.filter_by(acno=account.acno)
            .order_by(Transaction.timestamp.desc()).all())

    si = StringIO()
    writer = csv.writer(si)
    writer.writerow(['YourBank Account Statement'])
    writer.writerow(['Account Number:', account.acno])
    writer.writerow(['Name:', account.name])
    writer.writerow(['Account Type:', account.account_type])
    writer.writerow([])
    writer.writerow(['Date', 'Type', 'Amount (₹)', 'Balance After (₹)', 'Description'])
    for t in txns:
        writer.writerow([
            t.timestamp.strftime('%Y-%m-%d %H:%M:%S') if t.timestamp else '',
            t.transaction_type, t.amount, t.balance_after, t.description or '',
        ])

    filename = f'/tmp/statement_{account.acno}.csv'
    with open(filename, 'w') as f:
        f.write(si.getvalue())

    try:
        send_email(
            to=account.email,
            subject='YourBank – Account Statement',
            body=f'Dear {account.name},\n\nPlease find attached your account statement.\n\nRegards,\nYourBank Team',
            attachment_path=filename,
        )
        import os as _os
        try:
            _os.remove(filename)
        except Exception:
            pass
        return ok(message='Statement sent to your registered email address.')
    except Exception as e:
        app.logger.warning(f'Statement email failed: {e}')
        return err('Failed to send statement. Please try again.')


# ── STARTUP ───────────────────────────────────────────────────────────────────

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        print('Database tables created.')
    app.run(debug=False, host='0.0.0.0', port=5001)
