"""Generate a VAPID keypair for Web Push.

Usage: uv run python scripts/generate_vapid.py
Prints env-style lines to paste into .env or the FastAPI Cloud dashboard.
"""
import base64

from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat


def b64url(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def main() -> None:
    private_key = ec.generate_private_key(ec.SECP256R1())
    private_bytes = private_key.private_numbers().private_value.to_bytes(32, "big")
    public_bytes = private_key.public_key().public_bytes(
        Encoding.X962, PublicFormat.UncompressedPoint
    )
    print(f"VAPID_PUBLIC_KEY={b64url(public_bytes)}")
    print(f"VAPID_PRIVATE_KEY={b64url(private_bytes)}")
    print("# Set VAPID_SUBJECT to a mailto: or https: contact URL in production.")


if __name__ == "__main__":
    main()
