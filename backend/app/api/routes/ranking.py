import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import require_league_role
from app.db.session import get_db
from app.models.enums import LeagueRole
from app.models.player import LeaguePlayer, LeaguePlayerStats
from app.schemas.highlight import SessionHighlightsRead
from app.schemas.player import RankingEntryRead, RankingSummaryItem, RankingSummaryRead
from app.services.billing import ensure_feature_access, get_plan_code_for_league, has_feature
from app.services.highlights import HighlightService


router = APIRouter(prefix="/leagues/{league_id}/ranking", tags=["ranking"])


def _serialize_ranking_entry(item: LeaguePlayerStats) -> RankingEntryRead:
    return RankingEntryRead(
        id=item.id,
        created_at=item.created_at,
        updated_at=item.updated_at,
        league_id=item.league_id,
        player_id=item.player_id,
        matches_played=item.matches_played,
        wins=item.wins,
        losses=item.losses,
        goals=item.goals,
        assists=item.assists,
        fouls=item.fouls,
        yellow_cards=item.yellow_cards,
        red_cards=item.red_cards,
        clean_sheets=item.clean_sheets,
        attendances=item.attendances,
        participations=item.participations,
        ranking_points=item.ranking_points,
        player_name=item.player.name,
        player_nickname=item.player.nickname,
    )


def _summary_item(rows: list[LeaguePlayerStats], selector) -> RankingSummaryItem:
    if not rows:
        return RankingSummaryItem()
    leader = max(rows, key=selector)
    return RankingSummaryItem(
        player_id=leader.player_id,
        player_name=leader.player.name,
        value=selector(leader),
    )


@router.get("", response_model=list[RankingEntryRead])
def get_ranking(
    league_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    plan_code = get_plan_code_for_league(db, league_id)
    rows = (
        db.query(LeaguePlayerStats)
        .join(LeaguePlayer, LeaguePlayer.id == LeaguePlayerStats.player_id)
        .filter(LeaguePlayerStats.league_id == league_id)
        .order_by(LeaguePlayerStats.ranking_points.desc(), LeaguePlayerStats.goals.desc())
        .all()
    )
    if not has_feature(plan_code, "full_ranking"):
        rows = rows[:5]
    return [_serialize_ranking_entry(item) for item in rows]


@router.get("/full", response_model=list[RankingEntryRead])
def get_full_ranking(
    league_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    ensure_feature_access(db, league_id, "full_ranking")
    rows = (
        db.query(LeaguePlayerStats)
        .join(LeaguePlayer, LeaguePlayer.id == LeaguePlayerStats.player_id)
        .filter(LeaguePlayerStats.league_id == league_id)
        .order_by(LeaguePlayerStats.ranking_points.desc(), LeaguePlayerStats.goals.desc())
        .all()
    )
    return [_serialize_ranking_entry(item) for item in rows]


@router.get("/summary", response_model=RankingSummaryRead)
def get_ranking_summary(
    league_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    rows = (
        db.query(LeaguePlayerStats)
        .join(LeaguePlayer, LeaguePlayer.id == LeaguePlayerStats.player_id)
        .filter(LeaguePlayerStats.league_id == league_id)
        .all()
    )
    return RankingSummaryRead(
        overall_leader=_summary_item(rows, lambda item: item.ranking_points),
        top_scorer=_summary_item(rows, lambda item: item.goals),
        top_assist_provider=_summary_item(rows, lambda item: item.assists),
        best_attendance=_summary_item(rows, lambda item: item.attendances),
        best_defense=_summary_item(rows, lambda item: item.clean_sheets),
    )


@router.get("/highlights/latest", response_model=SessionHighlightsRead)
def get_latest_round_highlights(
    league_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    payload = HighlightService(db).get_latest_session_highlights_payload(league_id)
    if not payload:
        raise HTTPException(status_code=404, detail="No round highlights available yet")
    return SessionHighlightsRead.model_validate(payload)
