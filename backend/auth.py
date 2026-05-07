import os
import jwt
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, g

SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-CHANGE-IN-PRODUCTION')
JWT_EXPIRY_HOURS = 24
MAX_LOGIN_ATTEMPTS = 5
LOCKOUT_MINUTES = 15


def generate_token(user_acno: str, account_type: str) -> str:
    payload = {
        'sub': user_acno,
        'account_type': account_type,
        'iat': datetime.now(timezone.utc),
        'exp': datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')


def verify_token(token: str) -> dict:
    return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])


def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'success': False, 'error': 'Authentication required'}), 401

        token = auth_header.split(' ', 1)[1]
        try:
            payload = verify_token(token)
            g.user_acno = payload['sub']
            g.account_type = payload['account_type']
        except jwt.ExpiredSignatureError:
            return jsonify({'success': False, 'error': 'Session expired. Please login again.'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'success': False, 'error': 'Invalid authentication token.'}), 401

        return f(*args, **kwargs)
    return decorated


def get_current_user():
    from models import Account
    return Account.query.filter_by(acno=g.user_acno).first()


def is_account_locked(account) -> bool:
    if account.locked_until and account.locked_until > datetime.utcnow():
        return True
    return False


def record_failed_login(account, db):
    account.login_attempts = (account.login_attempts or 0) + 1
    if account.login_attempts >= MAX_LOGIN_ATTEMPTS:
        account.locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
    db.session.commit()


def reset_login_attempts(account, db):
    account.login_attempts = 0
    account.locked_until = None
    db.session.commit()
