from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import get_settings
from app.db.session import get_db
from app.models.league import LeagueMember
from app.models.user import User

ONLINE_THRESHOLD_MINUTES = 5


router = APIRouter(prefix="/dev", tags=["dev"])


def _require_dev(current_user: User = Depends(get_current_user)) -> User:
    if current_user.email != get_settings().admin_email:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Acesso restrito ao desenvolvedor")
    return current_user


@router.get("/users")
def list_beta_users(
    _: User = Depends(_require_dev),
    db: Session = Depends(get_db),
):
    league_counts = (
        db.query(LeagueMember.user_id, func.count(LeagueMember.id).label("n"))
        .group_by(LeagueMember.user_id)
        .subquery()
    )

    rows = (
        db.query(User, league_counts.c.n)
        .outerjoin(league_counts, User.id == league_counts.c.user_id)
        .order_by(User.created_at.desc())
        .all()
    )

    threshold = datetime.now(UTC) - timedelta(minutes=ONLINE_THRESHOLD_MINUTES)

    return [
        {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "is_active": user.is_active,
            "leagues": n or 0,
            "created_at": user.created_at.isoformat(),
            "last_seen_at": user.last_seen_at.isoformat() if user.last_seen_at else None,
            "online": user.last_seen_at is not None and user.last_seen_at.replace(tzinfo=UTC) >= threshold,
        }
        for user, n in rows
    ]


@router.get("/stats")
def beta_stats(
    _: User = Depends(_require_dev),
    db: Session = Depends(get_db),
):
    total = db.query(func.count(User.id)).scalar() or 0
    active = db.query(func.count(User.id)).filter(User.is_active.is_(True)).scalar() or 0
    with_league = (
        db.query(func.count(func.distinct(LeagueMember.user_id))).scalar() or 0
    )

    return {
        "total_users": total,
        "active_users": active,
        "users_with_league": with_league,
        "users_without_league": total - with_league,
    }
