import asyncio
import json
import logging

from pywebpush import WebPushException, webpush
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.config import settings
from app.models import PushSubscription

logger = logging.getLogger("quaveo.push")

# Subscriptions returning these codes are gone forever -> prune them.
GONE_STATUS_CODES = (404, 410)


def push_enabled() -> bool:
    return bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY)


def _send_sync(subscription: PushSubscription, payload: str, expired: list[int]) -> None:
    try:
        webpush(
            subscription_info={
                "endpoint": subscription.endpoint,
                "keys": {"p256dh": subscription.p256dh, "auth": subscription.auth},
            },
            data=payload,
            vapid_private_key=settings.VAPID_PRIVATE_KEY,
            vapid_claims={"sub": settings.VAPID_SUBJECT},
        )
    except WebPushException as exc:
        status_code = exc.response.status_code if exc.response is not None else None
        if status_code in GONE_STATUS_CODES:
            logger.info(
                "Push subscription expired (endpoint=%s...)", subscription.endpoint[:40]
            )
            expired.append(subscription.id)
        else:
            logger.warning("Push send failed (status=%s): %s", status_code, exc)


async def send_to_player(
    db: AsyncSession, player_id: int, title: str, body: str, url: str = "/"
) -> None:
    """Send a push to every subscription of a player. Never raises: push
    failures must not break the API call that triggered the notification."""
    if not push_enabled():
        return

    res = await db.execute(select(PushSubscription).where(PushSubscription.player_id == player_id))
    subscriptions = res.scalars().all()
    if not subscriptions:
        return

    message = json.dumps({"title": title, "body": body, "url": url})
    expired: list[int] = []
    try:
        await asyncio.gather(
            *(asyncio.to_thread(_send_sync, sub, message, expired) for sub in subscriptions)
        )
    except Exception:
        logger.exception("Unexpected error while sending push to player %s", player_id)
        return

    for sub_id in expired:
        sub = await db.get(PushSubscription, sub_id)
        if sub:
            await db.delete(sub)
    await db.commit()
