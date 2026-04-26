import logging
import uuid
from dataclasses import dataclass

from sqlalchemy.orm import Session, joinedload

from app.models.league import League, LeagueMember
from app.models.user import User

logger = logging.getLogger("baba.leagues")


@dataclass
class ActiveLeagueResolution:
    league: League | None
    available_leagues: list[League]
    fallback_reason: str | None = None


class ActiveLeagueResolutionError(Exception):
    def __init__(self, code: str, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


def get_active_league_for_user(
    db: Session,
    user_id: uuid.UUID,
    preferred_league_id: uuid.UUID | None = None,
) -> ActiveLeagueResolution:
    logger.info(
        "Resolving active league user_id=%s preferred_league_id=%s",
        str(user_id) if user_id else None,
        str(preferred_league_id) if preferred_league_id else None,
    )
    if not user_id:
        raise ActiveLeagueResolutionError("USER_ID_REQUIRED", "User id is required")

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise ActiveLeagueResolutionError("USER_NOT_FOUND", "Authenticated user was not found")

    memberships = (
        db.query(LeagueMember)
        .options(joinedload(LeagueMember.league))
        .filter(
            LeagueMember.user_id == user_id,
            LeagueMember.is_active.is_(True),
        )
        .order_by(LeagueMember.created_at.asc(), LeagueMember.id.asc())
        .all()
    )

    available_leagues = [
        membership.league
        for membership in memberships
        if membership.league and membership.league.is_active
    ]

    if not available_leagues:
        logger.info("Active league resolution found no memberships user_id=%s", str(user_id))
        return ActiveLeagueResolution(
            league=None,
            available_leagues=[],
            fallback_reason="no_memberships",
        )

    fallback_reason: str | None = None
    selected_league = available_leagues[0]

    if preferred_league_id:
        preferred_league = next((league for league in available_leagues if league.id == preferred_league_id), None)
        if preferred_league:
            selected_league = preferred_league
        else:
            fallback_reason = "preferred_league_not_member"

    logger.info(
        "Active league resolved user_id=%s selected_league_id=%s available_count=%s fallback_reason=%s",
        str(user_id),
        str(selected_league.id),
        len(available_leagues),
        fallback_reason,
    )

    return ActiveLeagueResolution(
        league=selected_league,
        available_leagues=available_leagues,
        fallback_reason=fallback_reason,
    )
