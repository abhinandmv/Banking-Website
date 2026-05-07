from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from encryption import encrypt, decrypt, mask_card_number

db = SQLAlchemy()


class Account(db.Model):
    __tablename__ = 'account'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    acno = db.Column(db.String(20), unique=True, nullable=False, index=True)
    _dob = db.Column('dob', db.String(200), nullable=False)
    _phone = db.Column('phone', db.String(200), nullable=False)
    _email = db.Column('email', db.String(200), nullable=False)
    _address = db.Column('address', db.String(500), nullable=False)
    opening_balance = db.Column(db.Integer, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    points = db.Column(db.Integer, default=0)
    account_type = db.Column(db.String(20), nullable=False, default='SAVINGS')
    login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True)

    @property
    def dob(self):
        return decrypt(self._dob)

    @dob.setter
    def dob(self, value):
        self._dob = encrypt(value) if value else value

    @property
    def phone(self):
        return decrypt(self._phone)

    @phone.setter
    def phone(self, value):
        self._phone = encrypt(value) if value else value

    @property
    def email(self):
        return decrypt(self._email)

    @email.setter
    def email(self, value):
        self._email = encrypt(value) if value else value

    @property
    def address(self):
        return decrypt(self._address)

    @address.setter
    def address(self, value):
        self._address = encrypt(value) if value else value

    def to_dict(self, include_sensitive=False):
        data = {
            'id': self.id,
            'name': self.name,
            'acno': self.acno,
            'account_type': self.account_type,
            'opening_balance': self.opening_balance,
            'points': self.points,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }
        if include_sensitive:
            data.update({
                'dob': self.dob,
                'phone': self.phone,
                'email': self.email,
                'address': self.address,
            })
        return data

    def __repr__(self):
        return f"<Account {self.acno}>"


class Amount(db.Model):
    __tablename__ = 'amount'
    id = db.Column(db.Integer, primary_key=True)
    acno = db.Column(db.String(20), unique=True, nullable=False, index=True)
    balance = db.Column(db.Float, nullable=False, default=0)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'acno': self.acno,
            'balance': self.balance,
            'last_updated': self.last_updated.isoformat() if self.last_updated else None,
        }

    def __repr__(self):
        return f"<Amount {self.acno}: {self.balance}>"


class Transaction(db.Model):
    __tablename__ = 'transaction'
    id = db.Column(db.Integer, primary_key=True)
    acno = db.Column(db.String(20), nullable=False, index=True)
    transaction_type = db.Column(db.String(30), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    balance_after = db.Column(db.Float, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    description = db.Column(db.String(255))

    def to_dict(self):
        return {
            'id': self.id,
            'acno': self.acno,
            'transaction_type': self.transaction_type,
            'amount': self.amount,
            'balance_after': self.balance_after,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'description': self.description or '',
        }

    def __repr__(self):
        return f"<Transaction {self.id}: {self.transaction_type} {self.amount}>"


class DebitCard(db.Model):
    __tablename__ = 'debit_card'
    id = db.Column(db.Integer, primary_key=True)
    _card_number = db.Column('card_number', db.String(500), unique=True, nullable=False, index=True)
    account_id = db.Column(db.Integer, db.ForeignKey('account.id'), nullable=False)
    expiry_date = db.Column(db.String(7), nullable=False)
    _cvv = db.Column('cvv', db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    password_hash = db.Column(db.String(200), nullable=True)

    @property
    def card_number(self):
        return decrypt(self._card_number)

    @card_number.setter
    def card_number(self, value):
        self._card_number = encrypt(value) if value else value

    @property
    def cvv(self):
        return decrypt(self._cvv)

    @cvv.setter
    def cvv(self, value):
        self._cvv = encrypt(value) if value else value

    @property
    def masked_number(self):
        return mask_card_number(self.card_number)

    def to_dict(self):
        return {
            'id': self.id,
            'masked_number': self.masked_number,
            'expiry_date': self.expiry_date,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

    def __repr__(self):
        return f"<DebitCard {self.masked_number}>"


class CurrentAccountApplication(db.Model):
    __tablename__ = 'current_account_application'
    id = db.Column(db.Integer, primary_key=True)
    account_type = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    dob = db.Column(db.String(20), nullable=False)
    business_type = db.Column(db.String(50), nullable=False)
    company_name = db.Column(db.String(200), nullable=False)
    turnover = db.Column(db.Integer, nullable=False)
    start_date = db.Column(db.String(20), nullable=False)
    acno = db.Column(db.String(20), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def __repr__(self):
        return f"<CurrentAccountApplication {self.acno}>"
