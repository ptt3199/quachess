import base64
import hashlib
import os


def hash_password(password: str) -> str:
    """Hash password using PBKDF2 with SHA-256."""
    salt = os.urandom(16)
    rounds = 100000
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, rounds)

    # Format: pbkdf2_sha256$rounds$salt_b64$key_b64
    salt_b64 = base64.b64encode(salt).decode("utf-8")
    key_b64 = base64.b64encode(key).decode("utf-8")
    return f"pbkdf2_sha256${rounds}${salt_b64}${key_b64}"


def verify_password(password: str, password_hash: str) -> bool:
    """Verify password against pbkdf2_sha256 hash."""
    try:
        parts = password_hash.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        rounds = int(parts[1])
        salt = base64.b64decode(parts[2].encode("utf-8"))
        key = base64.b64decode(parts[3].encode("utf-8"))

        test_key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, rounds)
        return test_key == key
    except Exception:
        return False
