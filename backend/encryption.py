import os
from cryptography.fernet import Fernet

_fernet_instance = None


def get_fernet() -> Fernet:
    global _fernet_instance
    if _fernet_instance is not None:
        return _fernet_instance

    key = os.environ.get('ENCRYPTION_KEY')
    if not key:
        key = Fernet.generate_key().decode()
        print(
            f"\n[WARNING] ENCRYPTION_KEY not set. Using a generated key for this session.\n"
            f"Data encrypted with this key CANNOT be decrypted after restart.\n"
            f"Set this in your .env file:\n  ENCRYPTION_KEY={key}\n"
        )
    if isinstance(key, str):
        key = key.encode()
    _fernet_instance = Fernet(key)
    return _fernet_instance


def encrypt(value: str) -> str:
    if not value:
        return value
    return get_fernet().encrypt(value.encode()).decode()


def decrypt(value: str) -> str:
    if not value:
        return value
    try:
        return get_fernet().decrypt(value.encode()).decode()
    except Exception:
        return value


def mask_card_number(card_number: str) -> str:
    if not card_number or len(card_number) < 4:
        return '****'
    return '**** **** **** ' + card_number[-4:]
