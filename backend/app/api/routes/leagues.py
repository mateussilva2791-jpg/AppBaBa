import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_league_role
from app.db.session import get_db
from app.models.billing import Subscription
from app.models.enums import LeagueRole
from app.models.league import League, LeagueMember
from app.models.billing import SubscriptionPlan
from app.models.enums import SubscriptionPlanCode, SubscriptionStatus
from app.models.user import User
from app.schemas.league import LeagueCreate, LeagueMemberCreate, LeagueMemberRead, LeagueMemberUpdate, LeagueRead
from app.schemas.league_resolution import ActiveLeagueResolutionRead
from app.services.leagues import ActiveLeagueResolutionError, get_active_league_for_user


router = APIRouter(prefix="/leagues", tags=["leagues"])
logger = logging.getLogger("baba.leagues")


@router.get("", response_model=list[LeagueRead])
def list_leagues(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return (
        db.query(League)
        .join(LeagueMember, LeagueMember.league_id == League.id)
        .filter(LeagueMember.user_id == current_user.id)
        .order_by(LeagueMember.created_at.asc(), League.created_at.asc())
        .all()
    )


@router.get("/active", response_model=ActiveLeagueResolutionRead)
def resolve_active_league(
    preferred_league_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        resolution = get_active_league_for_user(db, current_user.id, preferred_league_id)
    except ActiveLeagueResolutionError as exc:
        logger.warning(
            "Active league resolution failed user_id=%s preferred_league_id=%s error_code=%s error_message=%s",
            str(current_user.id),
            str(preferred_league_id) if preferred_league_id else None,
            exc.code,
            exc.message,
        )
        raise HTTPException(status_code=400, detail={"code": exc.code, "message": exc.message}) from exc

    logger.info(
        "Active league resolution route succeeded user_id=%s preferred_league_id=%s resolved_league_id=%s available_count=%s fallback_reason=%s",
        str(current_user.id),
        str(preferred_league_id) if preferred_league_id else None,
        str(resolution.league.id) if resolution.league else None,
        len(resolution.available_leagues),
        resolution.fallback_reason,
    )

    return ActiveLeagueResolutionRead(
        league=resolution.league,
        available_leagues=resolution.available_leagues,
        fallback_reason=resolution.fallback_reason,
    )


@router.post("", response_model=LeagueRead, status_code=status.HTTP_201_CREATED)
def create_league(payload: LeagueCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if db.query(League).filter(League.slug == payload.slug).first():
        raise HTTPException(status_code=400, detail="League slug already in use")

    free_plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == SubscriptionPlanCode.FREE).first()
    if not free_plan:
        raise HTTPException(status_code=500, detail="FREE subscription plan is not configured")

    league = League(name=payload.name, slug=payload.slug, description=payload.description)
    db.add(league)
    db.flush()
    db.add(LeagueMember(league_id=league.id, user_id=current_user.id, role=LeagueRole.OWNER))
    db.add(
        Subscription(
            league_id=league.id,
            plan_id=free_plan.id,
            status=SubscriptionStatus.ACTIVE,
            started_at=datetime.now(UTC),
            current_period_end=None,
            cancel_at_period_end=False,
        )
    )
    db.commit()
    db.refresh(league)
    return league


@router.get("/{league_id}", response_model=LeagueRead)
def get_league(
    league_id: uuid.UUID,
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
    db: Session = Depends(get_db),
):
    league = db.get(League, league_id)
    if not league:
        raise HTTPException(status_code=404, detail="League not found")
    return league


@router.get("/{league_id}/members", response_model=list[LeagueMemberRead])
def list_members(
    league_id: uuid.UUID,
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN)),
    db: Session = Depends(get_db),
):
    return db.query(LeagueMember).filter(LeagueMember.league_id == league_id).all()


@router.post("/{league_id}/members", response_model=LeagueMemberRead, status_code=status.HTTP_201_CREATED)
def add_member(
    league_id: uuid.UUID,
    payload: LeagueMemberCreate,
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN)),
    db: Session = Depends(get_db),
):
    target_user = None
    if payload.user_id:
        target_user = db.get(User, payload.user_id)
    elif payload.email:
        target_user = db.query(User).filter(User.email == payload.email).first()

    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    existing = (
        db.query(LeagueMember)
        .filter(LeagueMember.league_id == league_id, LeagueMember.user_id == target_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member of this league")
    member = LeagueMember(league_id=league_id, user_id=target_user.id, role=payload.role)
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.patch("/{league_id}/members/{member_id}", response_model=LeagueMemberRead)
def update_member(
    league_id: uuid.UUID,
    member_id: uuid.UUID,
    payload: LeagueMemberUpdate,
    current_member: LeagueMember = Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN)),
    db: Session = Depends(get_db),
):
    member = db.get(LeagueMember, member_id)
    if not member or member.league_id != league_id:
        raise HTTPException(status_code=404, detail="Member not found in this league")

    updates = payload.model_dump(exclude_unset=True)

    if current_member.role != LeagueRole.OWNER and "role" in updates and updates["role"] == LeagueRole.OWNER:
        raise HTTPException(status_code=403, detail="Only an OWNER can promote another member to OWNER")

    if member.role == LeagueRole.OWNER and current_member.user_id != member.user_id and current_member.role != LeagueRole.OWNER:
        raise HTTPException(status_code=403, detail="Only an OWNER can manage another OWNER")

    if member.role == LeagueRole.OWNER:
        active_owner_count = (
            db.query(LeagueMember)
            .filter(
                LeagueMember.league_id == league_id,
                LeagueMember.role == LeagueRole.OWNER,
                LeagueMember.is_active.is_(True),
            )
            .count()
        )
        if active_owner_count <= 1:
            if updates.get("is_active") is False:
                raise HTTPException(status_code=400, detail="League must keep at least one active OWNER")
            if "role" in updates and updates["role"] != LeagueRole.OWNER:
                raise HTTPException(status_code=400, detail="League must keep at least one active OWNER")

    for field, value in updates.items():
        setattr(member, field, value)

    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{league_id}/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_member(
    league_id: uuid.UUID,
    member_id: uuid.UUID,
    current_member: LeagueMember = Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN)),
    db: Session = Depends(get_db),
):
    member = db.get(LeagueMember, member_id)
    if not member or member.league_id != league_id:
        raise HTTPException(status_code=404, detail="Member not found in this league")

    if member.role == LeagueRole.OWNER and current_member.role != LeagueRole.OWNER:
        raise HTTPException(status_code=403, detail="Only an OWNER can remove an OWNER")

    active_owner_count = (
        db.query(LeagueMember)
        .filter(
            LeagueMember.league_id == league_id,
            LeagueMember.role == LeagueRole.OWNER,
            LeagueMember.is_active.is_(True),
        )
        .count()
    )
    if member.role == LeagueRole.OWNER and active_owner_count <= 1:
        raise HTTPException(status_code=400, detail="League must keep at least one active OWNER")

    db.delete(member)
    db.commit()
