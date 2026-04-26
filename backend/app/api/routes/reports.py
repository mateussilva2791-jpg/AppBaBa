import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.deps import require_league_role
from app.db.session import get_db
from app.models.enums import LeagueRole
from app.models.match import Match
from app.models.player import LeaguePlayer, LeaguePlayerStats
from app.models.session import Session as LeagueSession
from app.schemas.analytics import LeagueReportFullRead, LeagueReportSummaryRead
from app.services.billing import ensure_feature_access, get_plan_code_for_league


router = APIRouter(prefix="/leagues/{league_id}/reports", tags=["reports"])


@router.get("", response_model=LeagueReportSummaryRead)
def get_report_summary(
    league_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    plan_code = get_plan_code_for_league(db, league_id)
    total_players = db.query(LeaguePlayer).filter(LeaguePlayer.league_id == league_id).count()
    total_sessions = db.query(LeagueSession).filter(LeagueSession.league_id == league_id).count()
    total_matches = db.query(Match).filter(Match.league_id == league_id).count()
    finished_matches = (
        db.query(Match)
        .filter(Match.league_id == league_id, Match.status == "FINISHED")
        .count()
    )

    return LeagueReportSummaryRead(
        plan=plan_code.value,
        is_limited=True,
        total_players=total_players,
        total_sessions=total_sessions,
        total_matches=total_matches,
        finished_matches=finished_matches,
    )


@router.get("/full", response_model=LeagueReportFullRead)
def get_full_report(
    league_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    plan_code = ensure_feature_access(db, league_id, "full_reports")
    total_players = db.query(LeaguePlayer).filter(LeaguePlayer.league_id == league_id).count()
    total_sessions = db.query(LeagueSession).filter(LeagueSession.league_id == league_id).count()
    total_matches = db.query(Match).filter(Match.league_id == league_id).count()
    finished_matches = (
        db.query(Match)
        .filter(Match.league_id == league_id, Match.status == "FINISHED")
        .count()
    )

    goal_totals = (
        db.query(
            func.coalesce(func.sum(LeaguePlayerStats.goals), 0),
            func.coalesce(func.sum(LeaguePlayerStats.assists), 0),
        )
        .filter(LeaguePlayerStats.league_id == league_id)
        .one()
    )

    top_scorer = (
        db.query(LeaguePlayerStats)
        .join(LeaguePlayer, LeaguePlayer.id == LeaguePlayerStats.player_id)
        .filter(LeaguePlayerStats.league_id == league_id)
        .order_by(LeaguePlayerStats.goals.desc(), LeaguePlayer.name.asc())
        .first()
    )
    leader = (
        db.query(LeaguePlayerStats)
        .join(LeaguePlayer, LeaguePlayer.id == LeaguePlayerStats.player_id)
        .filter(LeaguePlayerStats.league_id == league_id)
        .order_by(LeaguePlayerStats.ranking_points.desc(), LeaguePlayerStats.goals.desc())
        .first()
    )

    return LeagueReportFullRead(
        plan=plan_code.value,
        is_limited=False,
        total_players=total_players,
        total_sessions=total_sessions,
        total_matches=total_matches,
        finished_matches=finished_matches,
        total_goals=int(goal_totals[0] or 0),
        total_assists=int(goal_totals[1] or 0),
        top_scorer_name=top_scorer.player.name if top_scorer else None,
        top_scorer_goals=top_scorer.goals if top_scorer else 0,
        leader_name=leader.player.name if leader else None,
        leader_points=leader.ranking_points if leader else 0,
    )
