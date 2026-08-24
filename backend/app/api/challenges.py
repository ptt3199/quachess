import random
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi_cache import FastAPICache
from sqlalchemy.orm import aliased
from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from app.auth.session import require_player
from app.database import get_db
from app.models import Challenge, ChallengeStatus, Match, MatchStatus, Player, utc_now
from app.schemas import ChallengeCreate, ChallengeRead

router = APIRouter(prefix="/api/challenges", tags=["challenges"])


async def clear_cache(namespace: str):
    if FastAPICache._backend is not None:
        await FastAPICache.clear(namespace=namespace)


@router.post("", response_model=ChallengeRead)
async def create_challenge(
    payload: ChallengeCreate,
    current_player: Player = Depends(require_player),
    db: AsyncSession = Depends(get_db),
):
    if current_player.id == payload.receiver_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot challenge yourself",
        )

    receiver = await db.get(Player, payload.receiver_id)
    if not receiver or not receiver.active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Opponent player not found or inactive",
        )

    # Resolve random color choice
    color = payload.sender_color.upper()
    if color not in ("WHITE", "BLACK", "RANDOM"):
        color = "WHITE"

    if color == "RANDOM":
        color = random.choice(["WHITE", "BLACK"])

    challenge = Challenge(
        sender_id=current_player.id,
        receiver_id=payload.receiver_id,
        game_type=payload.game_type,
        sender_color=color,
        scheduled_at=payload.scheduled_at or utc_now(),
        status=ChallengeStatus.PENDING,
    )
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)

    return ChallengeRead(
        id=challenge.id,
        sender_id=challenge.sender_id,
        receiver_id=challenge.receiver_id,
        sender_name=current_player.display_name,
        receiver_name=receiver.display_name,
        game_type=challenge.game_type,
        sender_color=challenge.sender_color,
        scheduled_at=challenge.scheduled_at,
        status=challenge.status,
        created_at=challenge.created_at,
    )


@router.get("/received", response_model=list[ChallengeRead])
async def list_received_challenges(
    current_player: Player = Depends(require_player),
    db: AsyncSession = Depends(get_db),
):
    Sender = aliased(Player)
    Receiver = aliased(Player)

    stmt = (
        select(Challenge, Sender.display_name, Receiver.display_name)
        .join(Sender, Challenge.sender_id == Sender.id)
        .join(Receiver, Challenge.receiver_id == Receiver.id)
        .where(Challenge.receiver_id == current_player.id)
        .where(Challenge.status == ChallengeStatus.PENDING)
        .order_by(Challenge.created_at.desc())
    )
    res = await db.execute(stmt)

    results = []
    for row in res.all():
        challenge, sender_name, receiver_name = row
        results.append(
            ChallengeRead(
                id=challenge.id,
                sender_id=challenge.sender_id,
                receiver_id=challenge.receiver_id,
                sender_name=sender_name,
                receiver_name=receiver_name,
                game_type=challenge.game_type,
                sender_color=challenge.sender_color,
                scheduled_at=challenge.scheduled_at,
                status=challenge.status,
                created_at=challenge.created_at,
            )
        )
    return results


@router.get("/sent", response_model=list[ChallengeRead])
async def list_sent_challenges(
    current_player: Player = Depends(require_player),
    db: AsyncSession = Depends(get_db),
):
    Sender = aliased(Player)
    Receiver = aliased(Player)

    stmt = (
        select(Challenge, Sender.display_name, Receiver.display_name)
        .join(Sender, Challenge.sender_id == Sender.id)
        .join(Receiver, Challenge.receiver_id == Receiver.id)
        .where(Challenge.sender_id == current_player.id)
        .order_by(Challenge.created_at.desc())
    )
    res = await db.execute(stmt)

    results = []
    for row in res.all():
        challenge, sender_name, receiver_name = row
        results.append(
            ChallengeRead(
                id=challenge.id,
                sender_id=challenge.sender_id,
                receiver_id=challenge.receiver_id,
                sender_name=sender_name,
                receiver_name=receiver_name,
                game_type=challenge.game_type,
                sender_color=challenge.sender_color,
                scheduled_at=challenge.scheduled_at,
                status=challenge.status,
                created_at=challenge.created_at,
            )
        )
    return results


@router.post("/{challenge_id}/accept", response_model=ChallengeRead)
async def accept_challenge(
    challenge_id: int,
    current_player: Player = Depends(require_player),
    db: AsyncSession = Depends(get_db),
):
    challenge = await db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    if challenge.receiver_id != current_player.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to accept this challenge",
        )

    if challenge.status != ChallengeStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot accept challenge in status '{challenge.status}'",
        )

    sender = await db.get(Player, challenge.sender_id)
    if not sender or not sender.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The challenging player is no longer active",
        )

    challenge.status = ChallengeStatus.ACCEPTED
    db.add(challenge)

    # Determine white and black players based on color selected
    if challenge.sender_color == "WHITE":
        white_id = challenge.sender_id
        black_id = challenge.receiver_id
    else:
        white_id = challenge.receiver_id
        black_id = challenge.sender_id

    # Create the scheduled match
    match = Match(
        white_player_id=white_id,
        black_player_id=black_id,
        game_type=challenge.game_type,
        scheduled_at=challenge.scheduled_at,
        status=MatchStatus.SCHEDULED,
    )
    db.add(match)
    await db.commit()
    await db.refresh(challenge)

    # Clear caches since list of scheduled matches changes
    await clear_cache("matches")

    return ChallengeRead(
        id=challenge.id,
        sender_id=challenge.sender_id,
        receiver_id=challenge.receiver_id,
        sender_name=sender.display_name,
        receiver_name=current_player.display_name,
        game_type=challenge.game_type,
        sender_color=challenge.sender_color,
        scheduled_at=challenge.scheduled_at,
        status=challenge.status,
        created_at=challenge.created_at,
    )


@router.post("/{challenge_id}/decline", response_model=ChallengeRead)
async def decline_challenge(
    challenge_id: int,
    current_player: Player = Depends(require_player),
    db: AsyncSession = Depends(get_db),
):
    challenge = await db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    if challenge.receiver_id != current_player.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to decline this challenge",
        )

    if challenge.status != ChallengeStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot decline challenge in status '{challenge.status}'",
        )

    challenge.status = ChallengeStatus.DECLINED
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)

    sender = await db.get(Player, challenge.sender_id)
    sender_name = sender.display_name if sender else "Unknown"

    return ChallengeRead(
        id=challenge.id,
        sender_id=challenge.sender_id,
        receiver_id=challenge.receiver_id,
        sender_name=sender_name,
        receiver_name=current_player.display_name,
        game_type=challenge.game_type,
        sender_color=challenge.sender_color,
        scheduled_at=challenge.scheduled_at,
        status=challenge.status,
        created_at=challenge.created_at,
    )


@router.post("/{challenge_id}/cancel", response_model=ChallengeRead)
async def cancel_challenge(
    challenge_id: int,
    current_player: Player = Depends(require_player),
    db: AsyncSession = Depends(get_db),
):
    challenge = await db.get(Challenge, challenge_id)
    if not challenge:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Challenge not found",
        )

    if challenge.sender_id != current_player.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not authorized to cancel this challenge",
        )

    if challenge.status != ChallengeStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel challenge in status '{challenge.status}'",
        )

    challenge.status = ChallengeStatus.CANCELLED
    db.add(challenge)
    await db.commit()
    await db.refresh(challenge)

    receiver = await db.get(Player, challenge.receiver_id)
    receiver_name = receiver.display_name if receiver else "Unknown"

    return ChallengeRead(
        id=challenge.id,
        sender_id=challenge.sender_id,
        receiver_id=challenge.receiver_id,
        sender_name=current_player.display_name,
        receiver_name=receiver_name,
        game_type=challenge.game_type,
        sender_color=challenge.sender_color,
        scheduled_at=challenge.scheduled_at,
        status=challenge.status,
        created_at=challenge.created_at,
    )
