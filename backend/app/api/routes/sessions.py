import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.api.deps import require_league_role
from app.db.session import get_db
from app.models.enums import LeagueRole, TeamGenerationMode
from app.models.match import Match
from app.models.player import LeaguePlayer
from app.schemas.highlight import SessionHighlightsRead
from app.models.session import Session, SessionPlayer, SessionSubstitution, SessionTeam, SessionTeamPlayer
from app.schemas.session_summary import SessionSummaryRead
from app.schemas.session import (
    BracketSourceRead,
    GeneratedTeamRead,
    MessageResponse,
    SessionBracketMatchRead,
    SessionBracketRead,
    SessionCreate,
    SessionPlayerCreate,
    SessionPlayerRead,
    SessionPlayerUpdate,
    SessionRead,
    SessionFinalizeRead,
    SessionTeamPlayerRead,
    SessionTeamPlayerMove,
    SessionSubstitutionCreate,
    SessionTeamCreate,
    SessionTeamPlayerCreate,
    SessionTeamRead,
    SessionUpdate,
    TeamGenerationRequest,
    TeamGenerationResponse,
    SessionWorkflowRead,
)
from app.services.billing import get_active_subscription
from app.services.highlights import HighlightService
from app.services.session_closing import SessionClosingService
from app.services.session_match_flow import SessionMatchFlowService
from app.services.sessions import (
    advance_session_bracket,
    build_session_workflow,
    create_session_bracket,
    ensure_session_editable,
    ensure_session_bracket_generated,
    finalize_session,
    generate_session_teams,
    move_session_player,
    require_session,
    sync_session_status,
)


router = APIRouter(prefix="/leagues/{league_id}/sessions", tags=["sessions"])


def _serialize_bracket_match(match: Match, db: DBSession) -> SessionBracketMatchRead:
    home_team = db.get(SessionTeam, match.home_team_id)
    away_team = db.get(SessionTeam, match.away_team_id)
    home_source_match = db.get(Match, match.home_team_source_match_id) if match.home_team_source_match_id else None
    away_source_match = db.get(Match, match.away_team_source_match_id) if match.away_team_source_match_id else None
    return SessionBracketMatchRead(
        id=match.id,
        home_team_id=match.home_team_id,
        away_team_id=match.away_team_id,
        home_team_name=home_team.name if home_team else None,
        away_team_name=away_team.name if away_team else None,
        stage=match.stage,
        round_number=match.round_number,
        sequence=match.sequence,
        label=match.label,
        status=match.status,
        bracket_group=match.bracket_group,
        winner_team_id=match.winner_team_id,
        loser_team_id=match.loser_team_id,
        home_score=match.home_score,
        away_score=match.away_score,
        home_slot_label=home_team.name if home_team else _format_bracket_slot(home_source_match, match.home_team_source_outcome),
        away_slot_label=away_team.name if away_team else _format_bracket_slot(away_source_match, match.away_team_source_outcome),
        home_source=(
            BracketSourceRead(
                match_id=home_source_match.id if home_source_match else None,
                label=home_source_match.label if home_source_match else None,
                outcome=match.home_team_source_outcome,
            )
            if match.home_team_source_match_id
            else None
        ),
        away_source=(
            BracketSourceRead(
                match_id=away_source_match.id if away_source_match else None,
                label=away_source_match.label if away_source_match else None,
                outcome=match.away_team_source_outcome,
            )
            if match.away_team_source_match_id
            else None
        ),
    )


def _format_bracket_slot(source_match: Match | None, outcome: str | None) -> str | None:
    if not source_match or not outcome:
        return None
    slot_prefix = "Vencedor" if outcome == "WINNER" else "Perdedor"
    return f"{slot_prefix} {source_match.label or f'Jogo {source_match.sequence}'}"


def _serialize_session_bracket(db: DBSession, session: Session, matches: list[Match]) -> SessionBracketRead:
    flow_service = SessionMatchFlowService(db)
    matches = flow_service.reconcile_session_flow(session.id)
    current_match = flow_service.get_current_match(session.id)
    next_match = flow_service.get_next_match(session.id)
    current_staying = db.get(SessionTeam, session.current_staying_team_id) if session.current_staying_team_id else None
    challenger = db.get(SessionTeam, session.challenger_team_id) if session.challenger_team_id else None
    queue = flow_service.get_session_queue(session.id)
    return SessionBracketRead(
        session_id=session.id,
        flow_phase=session.flow_phase,
        current_staying_team_id=session.current_staying_team_id,
        current_staying_team_name=current_staying.name if current_staying else None,
        challenger_team_id=session.challenger_team_id,
        challenger_team_name=challenger.name if challenger else None,
        current_match_id=current_match.id if current_match else None,
        next_match_id=next_match.id if next_match else None,
        queue=[SessionTeamRead.model_validate(item) for item in queue],
        matches=[_serialize_bracket_match(match, db) for match in matches],
    )


@router.get("", response_model=list[SessionRead])
def list_sessions(
    league_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    sessions = db.query(Session).filter(Session.league_id == league_id).order_by(Session.scheduled_at.desc()).all()
    for item in sessions:
        sync_session_status(db, item)
    db.commit()
    return sessions


@router.get("/{session_id}", response_model=SessionRead)
def get_session(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    item = require_session(db, league_id, session_id)
    sync_session_status(db, item)
    db.commit()
    return item


@router.get("/{session_id}/workflow", response_model=SessionWorkflowRead)
def get_session_workflow(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    return SessionWorkflowRead.model_validate(build_session_workflow(db, league_id, session_id))


@router.post("", response_model=SessionRead, status_code=status.HTTP_201_CREATED)
def create_session(
    league_id: uuid.UUID,
    payload: SessionCreate,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    if payload.team_count < 2:
        raise HTTPException(status_code=400, detail="Session must have at least 2 teams")
    active_subscription = get_active_subscription(db, league_id)
    if active_subscription and active_subscription.plan.max_sessions_per_month is not None:
        existing_session_count = db.query(Session).filter(Session.league_id == league_id).count()
        if existing_session_count >= active_subscription.plan.max_sessions_per_month:
            raise HTTPException(status_code=403, detail="Current plan reached the session limit")
    item = Session(league_id=league_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{session_id}", response_model=SessionRead)
def update_session(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    payload: SessionUpdate,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    item = db.get(Session, session_id)
    if not item or item.league_id != league_id:
        raise HTTPException(status_code=404, detail="Session not found in this league")

    updates = payload.model_dump(exclude_unset=True)
    if "team_count" in updates and updates["team_count"] < 2:
        raise HTTPException(status_code=400, detail="Session must have at least 2 teams")

    for field, value in updates.items():
        setattr(item, field, value)

    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.get("/{session_id}/players", response_model=list[SessionPlayerRead])
def list_session_players(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    session = require_session(db, league_id, session_id)
    return (
        db.query(SessionPlayer)
        .filter(SessionPlayer.league_id == league_id, SessionPlayer.session_id == session_id)
        .all()
    )


@router.post("/{session_id}/players", response_model=SessionPlayerRead, status_code=status.HTTP_201_CREATED)
def add_session_player(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    payload: SessionPlayerCreate,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    session = require_session(db, league_id, session_id)
    sync_session_status(db, session)
    ensure_session_editable(session)

    player = db.get(LeaguePlayer, payload.player_id)
    if not player or player.league_id != league_id:
        raise HTTPException(status_code=404, detail="Player not found in this league")

    existing = (
        db.query(SessionPlayer)
        .filter(SessionPlayer.session_id == session_id, SessionPlayer.player_id == payload.player_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Player is already registered in this session")

    active_subscription = get_active_subscription(db, league_id)
    if active_subscription and active_subscription.plan.max_players is not None:
        confirmed_count = (
            db.query(SessionPlayer)
            .filter(SessionPlayer.session_id == session_id, SessionPlayer.is_confirmed.is_(True))
            .count()
        )
        incoming_confirmed = payload.is_confirmed or payload.attendance_status == "CONFIRMED"
        if incoming_confirmed and confirmed_count >= active_subscription.plan.max_players:
            raise HTTPException(status_code=403, detail="Current plan reached the player limit for the league")

    item = SessionPlayer(league_id=league_id, session_id=session_id, **payload.model_dump())
    db.add(item)
    db.flush()
    sync_session_status(db, session)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{session_id}/players/{session_player_id}", response_model=SessionPlayerRead)
def update_session_player(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    session_player_id: uuid.UUID,
    payload: SessionPlayerUpdate,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    session = require_session(db, league_id, session_id)
    ensure_session_editable(session)
    session_player = db.get(SessionPlayer, session_player_id)
    if not session_player or session_player.league_id != league_id or session_player.session_id != session_id:
        raise HTTPException(status_code=404, detail="Session player not found in this league session")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(session_player, field, value)
    if session_player.is_confirmed and session_player.attendance_status == "PENDING":
        session_player.attendance_status = "CONFIRMED"
    if not session_player.is_confirmed and session_player.attendance_status == "CONFIRMED":
        session_player.attendance_status = "PENDING"

    db.add(session_player)
    db.flush()
    sync_session_status(db, session)
    db.commit()
    db.refresh(session_player)
    return session_player


@router.delete("/{session_id}/players/{session_player_id}", response_model=MessageResponse)
def remove_session_player(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    session_player_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    session = require_session(db, league_id, session_id)
    ensure_session_editable(session)
    session_player = db.get(SessionPlayer, session_player_id)
    if not session_player or session_player.league_id != league_id or session_player.session_id != session_id:
        raise HTTPException(status_code=404, detail="Session player not found in this league session")

    db.query(SessionTeamPlayer).filter(SessionTeamPlayer.player_id == session_player.player_id).filter(
        SessionTeamPlayer.team_id.in_(
            db.query(SessionTeam.id).filter(SessionTeam.session_id == session_id)
        )
    ).delete(synchronize_session=False)

    db.delete(session_player)
    db.flush()
    sync_session_status(db, session)
    db.commit()
    return MessageResponse(message="Session player removed")


@router.post("/{session_id}/teams", response_model=SessionTeamRead, status_code=status.HTTP_201_CREATED)
def create_team(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    payload: SessionTeamCreate,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    session = require_session(db, league_id, session_id)
    ensure_session_editable(session)
    team = SessionTeam(league_id=league_id, session_id=session_id, **payload.model_dump())
    db.add(team)
    db.flush()
    sync_session_status(db, session)
    db.commit()
    db.refresh(team)
    return team


@router.delete("/{session_id}/teams/{team_id}", response_model=MessageResponse)
def delete_team(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    team_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    session = require_session(db, league_id, session_id)
    ensure_session_editable(session)
    team = db.get(SessionTeam, team_id)
    if not team or team.league_id != league_id or team.session_id != session_id:
        raise HTTPException(status_code=404, detail="Team not found in this session")

    db.delete(team)
    db.flush()
    sync_session_status(db, session)
    db.commit()
    return MessageResponse(message="Team removed")


@router.get("/{session_id}/teams", response_model=list[SessionTeamRead])
def list_teams(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    session = require_session(db, league_id, session_id)
    return (
        db.query(SessionTeam)
        .filter(SessionTeam.league_id == league_id, SessionTeam.session_id == session_id)
        .all()
    )


@router.post("/{session_id}/generate-teams", response_model=TeamGenerationResponse)
def generate_teams_for_session(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    payload: TeamGenerationRequest,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    try:
        mode = TeamGenerationMode(payload.mode)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Unsupported team generation mode") from exc
    buckets, comparison = generate_session_teams(
        db=db,
        league_id=league_id,
        session_id=session_id,
        team_count=payload.team_count,
        mode=mode,
    )
    db.commit()

    return TeamGenerationResponse(
        session_id=session_id,
        mode=mode.value,
        comparison=comparison,
        teams=[
            GeneratedTeamRead(
                **bucket,
            )
            for bucket in buckets
        ],
    )


@router.post("/{session_id}/teams/move-player", response_model=SessionTeamPlayerRead)
def move_player_between_teams(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    payload: SessionTeamPlayerMove,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    assignment = move_session_player(
        db,
        league_id=league_id,
        session_id=session_id,
        player_id=payload.player_id,
        target_team_id=payload.target_team_id,
        make_captain=payload.make_captain,
    )
    db.commit()
    db.refresh(assignment)
    return assignment


@router.post("/{session_id}/matches/generate", response_model=SessionBracketRead)
def generate_session_matches(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    matches = create_session_bracket(db, league_id, session_id)
    db.commit()
    session = require_session(db, league_id, session_id)
    return _serialize_session_bracket(db, session, matches)


@router.post("/{session_id}/matches/advance", response_model=SessionBracketRead)
def advance_matches(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    matches = advance_session_bracket(db, league_id, session_id)
    db.commit()
    session = require_session(db, league_id, session_id)
    return _serialize_session_bracket(db, session, matches)


@router.get("/{session_id}/matches", response_model=SessionBracketRead)
def list_session_matches(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    session = require_session(db, league_id, session_id)
    matches = ensure_session_bracket_generated(db, league_id, session_id)
    matches = SessionMatchFlowService(db).reconcile_session_flow(session_id)
    db.commit()
    session = require_session(db, league_id, session_id)
    return _serialize_session_bracket(db, session, matches)


@router.post("/{session_id}/finalize", response_model=SessionFinalizeRead)
def consolidate_session(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    result = finalize_session(db, league_id, session_id)
    db.commit()
    return SessionFinalizeRead.model_validate(result)


@router.post("/{session_id}/close", response_model=SessionFinalizeRead)
def close_session(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    result = finalize_session(db, league_id, session_id)
    db.commit()
    return SessionFinalizeRead.model_validate(result)


@router.get("/{session_id}/highlights", response_model=SessionHighlightsRead)
def get_session_highlights(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    require_session(db, league_id, session_id)
    payload = HighlightService(db).get_session_highlights_payload(session_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Session highlights not found")
    return SessionHighlightsRead.model_validate(payload)


@router.get("/{session_id}/summary", response_model=SessionSummaryRead)
def get_session_summary(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    require_session(db, league_id, session_id)
    payload = SessionClosingService(db).get_session_summary_payload(session_id)
    if not payload:
        raise HTTPException(status_code=404, detail="Session summary not found")
    return SessionSummaryRead.model_validate(payload)


@router.get("/{session_id}/teams/{team_id}/players", response_model=list[SessionTeamPlayerRead])
def list_team_players(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    team_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    session = require_session(db, league_id, session_id)
    team = db.get(SessionTeam, team_id)
    if not team or team.league_id != league_id or team.session_id != session_id:
        raise HTTPException(status_code=404, detail="Team not found in this session")
    return (
        db.query(SessionTeamPlayer)
        .filter(SessionTeamPlayer.league_id == league_id, SessionTeamPlayer.team_id == team_id)
        .all()
    )


@router.post(
    "/{session_id}/teams/{team_id}/players",
    response_model=SessionTeamPlayerRead,
    status_code=status.HTTP_201_CREATED,
)
def add_player_to_team(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    team_id: uuid.UUID,
    payload: SessionTeamPlayerCreate,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    session = require_session(db, league_id, session_id)
    ensure_session_editable(session)
    team = db.get(SessionTeam, team_id)
    if not team or team.league_id != league_id or team.session_id != session_id:
        raise HTTPException(status_code=404, detail="Team not found in this session")
    player = db.get(LeaguePlayer, payload.player_id)
    if not player or player.league_id != league_id:
        raise HTTPException(status_code=404, detail="Player not found in this league")

    session_player = (
        db.query(SessionPlayer)
        .filter(SessionPlayer.session_id == session_id, SessionPlayer.player_id == payload.player_id)
        .first()
    )
    if not session_player:
        raise HTTPException(status_code=400, detail="Player must be registered in the session before joining a team")

    existing = (
        db.query(SessionTeamPlayer)
        .filter(SessionTeamPlayer.team_id == team_id, SessionTeamPlayer.player_id == payload.player_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Player is already assigned to this team")

    assigned_in_session = (
        db.query(SessionTeamPlayer)
        .join(SessionTeam, SessionTeam.id == SessionTeamPlayer.team_id)
        .filter(
            SessionTeam.session_id == session_id,
            SessionTeamPlayer.player_id == payload.player_id,
        )
        .first()
    )
    if assigned_in_session:
        raise HTTPException(status_code=400, detail="Player is already assigned to another team in this session")

    item = SessionTeamPlayer(league_id=league_id, team_id=team_id, **payload.model_dump())
    db.add(item)
    db.flush()
    sync_session_status(db, require_session(db, league_id, session_id))
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{session_id}/teams/{team_id}/players/{team_player_id}", response_model=MessageResponse)
def remove_player_from_team(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    team_id: uuid.UUID,
    team_player_id: uuid.UUID,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    team = db.get(SessionTeam, team_id)
    if not team or team.league_id != league_id or team.session_id != session_id:
        raise HTTPException(status_code=404, detail="Team not found in this session")

    team_player = db.get(SessionTeamPlayer, team_player_id)
    if not team_player or team_player.league_id != league_id or team_player.team_id != team_id:
        raise HTTPException(status_code=404, detail="Team player not found in this session")

    db.delete(team_player)
    db.flush()
    sync_session_status(db, require_session(db, league_id, session_id))
    db.commit()
    return MessageResponse(message="Player removed from team")


@router.post("/{session_id}/substitutions", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
def create_substitution(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    payload: SessionSubstitutionCreate,
    db: DBSession = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    session = db.get(Session, session_id)
    if not session or session.league_id != league_id:
        raise HTTPException(status_code=404, detail="Session not found in this league")
    ensure_session_editable(session)
    player_out = db.get(LeaguePlayer, payload.player_out_id)
    player_in = db.get(LeaguePlayer, payload.player_in_id) if payload.player_in_id else None
    if not player_out or player_out.league_id != league_id:
        raise HTTPException(status_code=404, detail="Outgoing player not found in this league")
    if player_in and player_in.league_id != league_id:
        raise HTTPException(status_code=404, detail="Incoming player not found in this league")
    if payload.team_id:
        team = db.get(SessionTeam, payload.team_id)
        if not team or team.league_id != league_id or team.session_id != session_id:
            raise HTTPException(status_code=404, detail="Team not found in this session")
    db.add(SessionSubstitution(league_id=league_id, session_id=session_id, **payload.model_dump()))
    db.commit()
    return MessageResponse(message="Substitution recorded")
