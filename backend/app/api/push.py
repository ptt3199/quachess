from fastapi import APIRouter, Depends, status
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth.session import require_player
from app.config import settings
from app.database import get_db
from app.models import Player, PushSubscription
from app.schemas import PushStatusRead, PushSubscribe, PushUnsubscribe, VapidPublicKeyRead

router = APIRouter(prefix="/api/push", tags=["push"])


@router.get("/vapid-public-key", response_model=VapidPublicKeyRead)
async def get_vapid_public_key():
    if not settings.VAPID_PUBLIC_KEY:
        return VapidPublicKeyRead(public_key=None)
    return VapidPublicKeyRead(public_key=settings.VAPID_PUBLIC_KEY)


@router.get("/status", response_model=PushStatusRead)
async def push_status(_current_player: Player = Depends(require_player)):
    return PushStatusRead(enabled=bool(settings.VAPID_PUBLIC_KEY and settings.VAPID_PRIVATE_KEY))


@router.post("/subscribe", status_code=status.HTTP_204_NO_CONTENT)
async def subscribe(
    payload: PushSubscribe,
    current_player: Player = Depends(require_player),
    db: AsyncSession = Depends(get_db),
):
    # Upsert by endpoint: browsers may re-subscribe with rotated keys
    res = await db.execute(
        select(PushSubscription).where(PushSubscription.endpoint == payload.endpoint)
    )
    existing = res.scalars().first()
    if existing:
        existing.player_id = current_player.id
        existing.p256dh = payload.keys.p256dh
        existing.auth = payload.keys.auth
    else:
        db.add(
            PushSubscription(
                player_id=current_player.id,
                endpoint=payload.endpoint,
                p256dh=payload.keys.p256dh,
                auth=payload.keys.auth,
            )
        )
    await db.commit()


@router.post("/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
async def unsubscribe(
    payload: PushUnsubscribe,
    current_player: Player = Depends(require_player),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(PushSubscription).where(
            (PushSubscription.endpoint == payload.endpoint)
            & (PushSubscription.player_id == current_player.id)
        )
    )
    for sub in res.scalars().all():
        await db.delete(sub)
    await db.commit()
