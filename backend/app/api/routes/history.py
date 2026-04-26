import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import require_league_role
from app.db.session import get_db
from app.models.enums import LeagueRole
from app.models.match import Match
from app.models.session import Session as LeagueSession
from app.schemas.analytics import HistorySummaryRead, MatchHistoryItem, SessionHistoryItem
from app.services.billing import ensure_feature_access, get_plan_code_for_league


router = APIRouter(prefix="/leagues/{league_id}/history", tags=["history"])


@router.get("", response_model=HistorySummaryRead)
def get_history_summary(
    league_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    plan_code = get_plan_code_for_league(db, league_id)
    sessions = (
        db.query(LeagueSession)
        .filter(LeagueSession.league_id == league_id)
        .order_by(LeagueSession.scheduled_at.desc())
        .limit(5)
        .all()
    )
    matches = (
        db.query(Match)
        .filter(Match.league_id == league_id)
        .order_by(Match.created_at.desc())
        .limit(10)
        .all()
    )
    return HistorySummaryRead(
        plan=plan_code.value,
        is_limited=True,
        sessions=[SessionHistoryItem.model_validate(item, from_attributes=True) for item in sessions],
        matches=[MatchHistoryItem.model_validate(item, from_attributes=True) for item in matches],
    )


@router.get("/full", response_model=HistorySummaryRead)
def get_full_history(
    league_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    plan_code = ensure_feature_access(db, league_id, "full_history")
    sessions = (
        db.query(LeagueSession)
        .filter(LeagueSession.league_id == league_id)
        .order_by(LeagueSession.scheduled_at.desc())
        .all()
    )
    matches = (
        db.query(Match)
        .filter(Match.league_id == league_id)
        .order_by(Match.created_at.desc())
        .all()
    )
    return HistorySummaryRead(
        plan=plan_code.value,
        is_limited=False,
        sessions=[SessionHistoryItem.model_validate(item, from_attributes=True) for item in sessions],
        matches=[MatchHistoryItem.model_validate(item, from_attributes=True) for item in matches],
    )
