import os
import smtplib
from email.message import EmailMessage

SMTP_HOST = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 587))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASS = os.environ.get('SMTP_PASS', '').replace(' ', '')  # Gmail App Passwords may include spaces
BANK_NAME = os.environ.get('BANK_NAME', 'YourBank')


def send_email(to: str, subject: str, body: str, attachment_path: str = None):
    if not SMTP_USER or not SMTP_PASS:
        print(f"[EMAIL] Would send to {to}: {subject}\n{body}")
        return

    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = f'{BANK_NAME} <{SMTP_USER}>'
    msg['To'] = to
    msg.set_content(body)

    if attachment_path and os.path.exists(attachment_path):
        with open(attachment_path, 'rb') as f:
            msg.add_attachment(f.read(), maintype='application',
                               subtype='octet-stream',
                               filename=os.path.basename(attachment_path))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        server.ehlo()
        server.starttls()
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)


def send_account_created_email(email: str, name: str, acno: str,
                                account_type: str, debit_card_number: str = None,
                                expiry_date: str = None):
    subject = f'Welcome to {BANK_NAME} – Your Account Details'
    body = f"""Dear {name},

Welcome to {BANK_NAME}! Your {account_type.title()} Savings Account has been created successfully.

=== YOUR LOGIN DETAILS ===
Account Number : {acno}
Account Type   : {account_type}

IMPORTANT: Your Account Number is your Login ID. Please save it.

"""
    if debit_card_number:
        body += f"""=== YOUR DEBIT CARD ===
Card Number    : {debit_card_number}
Expiry Date    : {expiry_date}

"""
    body += f"""For security, please do not share your account number or password with anyone.

Thank you for banking with {BANK_NAME}.

Regards,
{BANK_NAME} Team
"""
    send_email(email, subject, body)


def send_current_account_email(email: str, name: str, acno: str,
                                account_type: str, temp_password: str, features_text: str):
    subject = f'Welcome to {BANK_NAME} – Current Account Details'
    body = f"""Dear {name},

Congratulations! Your {account_type.title()} Current Account has been created successfully.

=== YOUR LOGIN DETAILS ===
Account Number   : {acno}
Temporary Password: {temp_password}

Please change your password after first login.

=== ACCOUNT FEATURES ===
{features_text}

Regards,
{BANK_NAME} Team
"""
    send_email(email, subject, body)


def send_card_created_email(email: str, name: str, masked_number: str,
                             expiry_date: str, card_password: str):
    subject = f'{BANK_NAME} – New Debit Card Created'
    body = f"""Dear {name},

A new debit card has been issued to your account.

Card Number  : {masked_number}
Expiry Date  : {expiry_date}
Card Password: {card_password}

Keep this information secure. Do not share your card password with anyone.

Regards,
{BANK_NAME} Team
"""
    send_email(email, subject, body)
