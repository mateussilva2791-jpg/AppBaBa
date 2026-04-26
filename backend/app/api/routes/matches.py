import uuid
from datetime import UTC, datetime

import anyio
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_user_from_token, require_league_role
from app.db.session import SessionLocal, get_db
from app.live import live_manager, match_channel, session_channel
from app.models.enums import LeagueRole, MatchEventType, MatchStatus
from app.models.league import LeagueMember
from app.models.match import Match, MatchEvent
from app.models.player import LeaguePlayer
from app.models.session import Session as LeagueSession
from app.models.session import SessionPlayer, SessionTeam, SessionTeamPlayer
from app.schemas.live import (
    LiveMatchCardRead,
    LiveTeamPlayerRead,
    LiveTeamRead,
    MatchEventDetailRead,
    MatchLiveStateRead,
    SessionLiveStateRead,
)
from app.schemas.match import MatchCreate, MatchEventCreate, MatchEventUpdate, MatchFlowAction, MatchRead, MatchUpdate
from app.services.matches import (
    PRE_MATCH_STATUSES,
    apply_event_status_flow,
    close_match_and_update_stats,
    recompute_match_status_from_events,
    recompute_event_driven_stats,
    recompute_match_score,
    update_match_status,
)
from app.services.draw import compute_player_overall, player_balance_score
from app.services.ranking import recalculate_ranking
from app.services.sessions import sync_session_status
from app.services.session_match_flow import SessionMatchFlowService


router = APIRouter(prefix="/leagues/{league_id}/matches", tags=["matches"])

TEAM_REQUIRED_EVENTS = {
    MatchEventType.GOAL,
    MatchEventType.OWN_GOAL,
    MatchEventType.FOUL,
    MatchEventType.YELLOW_CARD,
    MatchEventType.RED_CARD,
    MatchEventType.SUBSTITUTION,
}

PLAYER_REQUIRED_EVENTS = {
    MatchEventType.GOAL,
    MatchEventType.ASSIST,
    MatchEventType.FOUL,
    MatchEventType.YELLOW_CARD,
    MatchEventType.RED_CARD,
    MatchEventType.SUBSTITUTION,
}


def _require_match(db: Session, league_id: uuid.UUID, match_id: uuid.UUID) -> Match:
    match = db.get(Match, match_id)
    if not match or match.league_id != league_id:
        raise HTTPException(status_code=404, detail="Match not found in this league")
    return match


def _require_session(db: Session, league_id: uuid.UUID, session_id: uuid.UUID) -> LeagueSession:
    session = db.get(LeagueSession, session_id)
    if not session or session.league_id != league_id:
        raise HTTPException(status_code=404, detail="Session not found in this league")
    return session


def _ensure_session_open(session: LeagueSession) -> None:
    if session.status == "FINISHED":
        raise HTTPException(status_code=400, detail="This session is already finished and locked for live operation")


def _team_map(db: Session, session_id: uuid.UUID) -> dict[uuid.UUID, SessionTeam]:
    teams = db.query(SessionTeam).filter(SessionTeam.session_id == session_id).all()
    return {team.id: team for team in teams}


def _player_map(db: Session, league_id: uuid.UUID) -> dict[uuid.UUID, LeaguePlayer]:
    players = db.query(LeaguePlayer).filter(LeaguePlayer.league_id == league_id).all()
    return {player.id: player for player in players}


def _team_player_ids(db: Session, team_id: uuid.UUID) -> set[uuid.UUID]:
    rows = db.query(SessionTeamPlayer.player_id).filter(SessionTeamPlayer.team_id == team_id).all()
    return {row[0] for row in rows}


def _validate_event_payload(
    db: Session,
    league_id: uuid.UUID,
    match: Match,
    *,
    event_type: MatchEventType,
    team_id: uuid.UUID | None,
    player_id: uuid.UUID | None,
    related_player_id: uuid.UUID | None,
) -> None:
    if match.home_team_id is None or match.away_team_id is None:
        raise HTTPException(status_code=400, detail="This match still has unresolved bracket slots")
    if match.status == MatchStatus.HALF_TIME.value and event_type not in {
        MatchEventType.SECOND_HALF_STARTED,
        MatchEventType.MATCH_FINISHED,
    }:
        raise HTTPException(status_code=400, detail="Only second-half or finish events can be recorded during half time")
    if match.status in PRE_MATCH_STATUSES and event_type not in {MatchEventType.MATCH_STARTED}:
        raise HTTPException(status_code=400, detail="Only a start event can be recorded before the match starts")
    if match.status == MatchStatus.FINISHED.value:
        raise HTTPException(status_code=400, detail="Finished matches are locked for editing")

    if team_id:
        team = db.get(SessionTeam, team_id)
        if not team or team.league_id != league_id or team.session_id != match.session_id:
            raise HTTPException(status_code=404, detail="Team not found in this match session")
        if team_id not in {match.home_team_id, match.away_team_id}:
            raise HTTPException(status_code=400, detail="Team is not part of this match")
    elif event_type in TEAM_REQUIRED_EVENTS:
        raise HTTPException(status_code=400, detail="Team is required for this event type")

    if player_id:
        player = db.get(LeaguePlayer, player_id)
        if not player or player.league_id != league_id:
            raise HTTPException(status_code=404, detail="Player not found in this league")
        session_player = (
            db.query(SessionPlayer)
            .filter(SessionPlayer.session_id == match.session_id, SessionPlayer.player_id == player_id)
            .first()
        )
        if not session_player:
            raise HTTPException(status_code=400, detail="Player is not registered in the match session")
        if team_id and player_id not in _team_player_ids(db, team_id):
            raise HTTPException(status_code=400, detail="Player is not assigned to the selected team")
    elif event_type in PLAYER_REQUIRED_EVENTS:
        raise HTTPException(status_code=400, detail="Player is required for this event type")

    if related_player_id:
        related_player = db.get(LeaguePlayer, related_player_id)
        if not related_player or related_player.league_id != league_id:
            raise HTTPException(status_code=404, detail="Related player not found in this league")
        if team_id and related_player_id not in _team_player_ids(db, team_id):
            raise HTTPException(status_code=400, detail="Related player is not assigned to the selected team")
    if event_type == MatchEventType.GOAL and related_player_id and related_player_id == player_id:
        raise HTTPException(status_code=400, detail="Goal scorer and assisting player must be different")
    if event_type == MatchEventType.SUBSTITUTION and not related_player_id:
        raise HTTPException(status_code=400, detail="Incoming player is required for substitution events")


def _build_event_detail(
    event: MatchEvent,
    team_lookup: dict[uuid.UUID, SessionTeam],
    player_lookup: dict[uuid.UUID, LeaguePlayer],
) -> MatchEventDetailRead:
    team = team_lookup.get(event.team_id) if event.team_id else None
    player = player_lookup.get(event.player_id) if event.player_id else None
    related_player = player_lookup.get(event.related_player_id) if event.related_player_id else None
    created_by = event.created_by_user
    return MatchEventDetailRead.model_validate(
        {
            "id": event.id,
            "created_at": event.created_at,
            "updated_at": event.updated_at,
            "league_id": event.league_id,
            "match_id": event.match_id,
            "team_id": event.team_id,
            "event_type": event.event_type,
            "player_id": event.player_id,
            "related_player_id": event.related_player_id,
            "minute": event.minute,
            "second": event.second,
            "notes": event.notes,
            "created_by": event.created_by,
            "is_reverted": event.is_reverted,
            "team_name": team.name if team else None,
            "player_name": player.name if player else None,
            "related_player_name": related_player.name if related_player else None,
            "created_by_name": created_by.full_name if created_by else None,
        }
    )


def _build_match_card(
    match: Match,
    team_lookup: dict[uuid.UUID, SessionTeam],
    player_lookup: dict[uuid.UUID, LeaguePlayer],
) -> LiveMatchCardRead:
    ordered_events = sorted(
        [item for item in match.events if not item.is_reverted],
        key=lambda item: (item.minute, item.second, item.created_at),
    )
    last_event = _build_event_detail(ordered_events[-1], team_lookup, player_lookup) if ordered_events else None
    home_team = team_lookup.get(match.home_team_id) if match.home_team_id else None
    away_team = team_lookup.get(match.away_team_id) if match.away_team_id else None
    home_slot = home_team.name if home_team else _resolve_match_slot(match.home_team_source_match, match.home_team_source_outcome)
    away_slot = away_team.name if away_team else _resolve_match_slot(match.away_team_source_match, match.away_team_source_outcome)
    return LiveMatchCardRead.model_validate(
        {
            "match": MatchRead.model_validate(match),
            "home_team_name": home_slot or "A definir",
            "away_team_name": away_slot or "A definir",
            "home_team_color": home_team.color if home_team else None,
            "away_team_color": away_team.color if away_team else None,
            "last_event": last_event,
        }
    )


def _resolve_match_slot(source_match: Match | None, outcome: str | None) -> str | None:
    if not source_match or not outcome:
        return None
    return f"{'Vencedor' if outcome == 'WINNER' else 'Perdedor'} {source_match.label or f'Jogo {source_match.sequence}'}"


def _build_live_teams(
    db: Session,
    session_id: uuid.UUID,
    player_lookup: dict[uuid.UUID, LeaguePlayer],
) -> list[LiveTeamRead]:
    teams = db.query(SessionTeam).filter(SessionTeam.session_id == session_id).order_by(SessionTeam.created_at.asc()).all()
    payload: list[LiveTeamRead] = []
    for team in teams:
        rows = (
            db.query(SessionTeamPlayer)
            .filter(SessionTeamPlayer.team_id == team.id)
            .order_by(SessionTeamPlayer.created_at.asc())
            .all()
        )
        team_players = [
            LiveTeamPlayerRead.model_validate(
                {
                    "team_player_id": row.id,
                    "player_id": row.player_id,
                    "player_name": player_lookup[row.player_id].name,
                    "player_nickname": player_lookup[row.player_id].nickname,
                    "position": player_lookup[row.player_id].position,
                    "overall": compute_player_overall(player_lookup[row.player_id]),
                    "attack_rating": player_lookup[row.player_id].attack_rating,
                    "passing_rating": player_lookup[row.player_id].passing_rating,
                    "defense_rating": player_lookup[row.player_id].defense_rating,
                    "stamina_rating": player_lookup[row.player_id].stamina_rating,
                    "is_captain": row.is_captain,
                }
            )
            for row in rows
            if row.player_id in player_lookup
        ]
        payload.append(
            LiveTeamRead.model_validate(
                {
                    "id": team.id,
                    "name": team.name,
                    "color": team.color,
                    "average_overall": round(sum(player.overall for player in team_players) / len(team_players)) if team_players else 0,
                    "total_strength": sum(player_balance_score(player_lookup[player.player_id]) for player in team_players),
                    "players": team_players,
                }
            )
        )
    return payload


def _build_session_live_state(db: Session, league_id: uuid.UUID, session_id: uuid.UUID) -> SessionLiveStateRead:
    session = _require_session(db, league_id, session_id)
    flow_service = SessionMatchFlowService(db)
    matches = flow_service.reconcile_session_flow(session_id)
    sync_session_status(db, session)
    team_lookup = _team_map(db, session_id)
    player_lookup = _player_map(db, league_id)
    recent_events = (
        db.query(MatchEvent)
        .join(Match, Match.id == MatchEvent.match_id)
        .filter(
            MatchEvent.league_id == league_id,
            Match.session_id == session_id,
            MatchEvent.is_reverted.is_(False),
        )
        .order_by(MatchEvent.created_at.desc())
        .limit(10)
        .all()
    )
    current_match = flow_service.get_current_match(session_id)
    next_match = flow_service.get_next_match(session_id)
    queue = flow_service.get_session_queue(session_id)
    current_staying_team = db.get(SessionTeam, session.current_staying_team_id) if session.current_staying_team_id else None
    challenger_team = db.get(SessionTeam, session.challenger_team_id) if session.challenger_team_id else None
    return SessionLiveStateRead.model_validate(
        {
            "session": session,
            "matches": [_build_match_card(match, team_lookup, player_lookup) for match in matches],
            "queue": queue,
            "current_match_id": current_match.id if current_match else None,
            "next_match_id": next_match.id if next_match else None,
            "current_staying_team_name": current_staying_team.name if current_staying_team else None,
            "challenger_team_name": challenger_team.name if challenger_team else None,
            "recent_events": [_build_event_detail(item, team_lookup, player_lookup) for item in recent_events],
            "updated_at": datetime.now(UTC),
        }
    )


def _build_match_live_state(db: Session, league_id: uuid.UUID, match_id: uuid.UUID) -> MatchLiveStateRead:
    match = _require_match(db, league_id, match_id)
    session = _require_session(db, league_id, match.session_id)
    team_lookup = _team_map(db, match.session_id)
    player_lookup = _player_map(db, league_id)
    events = (
        db.query(MatchEvent)
        .filter(MatchEvent.league_id == league_id, MatchEvent.match_id == match_id)
        .order_by(MatchEvent.minute.asc(), MatchEvent.second.asc(), MatchEvent.created_at.asc())
        .all()
    )
    return MatchLiveStateRead.model_validate(
        {
            "session": session,
            "match": _build_match_card(match, team_lookup, player_lookup),
            "teams": _build_live_teams(db, match.session_id, player_lookup),
            "events": [_build_event_detail(item, team_lookup, player_lookup) for item in events],
            "updated_at": datetime.now(UTC),
        }
    )


def _broadcast_live_updates(db: Session, league_id: uuid.UUID, match: Match) -> None:
    match_state = _build_match_live_state(db, league_id, match.id)
    session_state = _build_session_live_state(db, league_id, match.session_id)
    anyio.from_thread.run(
        live_manager.broadcast,
        match_channel(match.id),
        {"type": "match.snapshot", "payload": match_state.model_dump(mode="json")},
    )
    anyio.from_thread.run(
        live_manager.broadcast,
        session_channel(match.session_id),
        {"type": "session.snapshot", "payload": session_state.model_dump(mode="json")},
    )


def _ensure_websocket_member(db: Session, league_id: uuid.UUID, token: str | None) -> None:
    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication token")
    user = get_user_from_token(token, db)
    membership = (
        db.query(LeagueMember)
        .filter(LeagueMember.league_id == league_id, LeagueMember.user_id == user.id, LeagueMember.is_active.is_(True))
        .first()
    )
    if not membership:
        raise HTTPException(status_code=403, detail="User is not a member of this league")


async def _authenticate_websocket(websocket: WebSocket, db: Session, league_id: uuid.UUID) -> bool:
    """Authenticate WebSocket via first message to keep the token out of the URL."""
    import asyncio as _asyncio
    import json as _json

    try:
        raw = await _asyncio.wait_for(websocket.receive_text(), timeout=5.0)
        msg = _json.loads(raw)
        if msg.get("type") != "auth":
            await websocket.close(code=4001, reason="Expected auth message")
            return False
        _ensure_websocket_member(db, league_id, msg.get("token"))
        await websocket.send_json({"type": "auth.ok"})
        return True
    except _asyncio.TimeoutError:
        await websocket.close(code=4001, reason="Auth timeout")
        return False
    except HTTPException:
        await websocket.close(code=4003, reason="Unauthorized")
        return False
    except Exception:
        await websocket.close(code=4001, reason="Auth failed")
        return False


@router.get("", response_model=list[MatchRead])
def list_matches(
    league_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    return db.query(Match).filter(Match.league_id == league_id).order_by(Match.created_at.desc()).all()


@router.get("/session/{session_id}/live", response_model=SessionLiveStateRead)
def get_session_live_state(
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    return _build_session_live_state(db, league_id, session_id)


@router.get("/{match_id}", response_model=MatchRead)
def get_match(
    league_id: uuid.UUID,
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    return _require_match(db, league_id, match_id)


@router.get("/{match_id}/live", response_model=MatchLiveStateRead)
def get_match_live_state(
    league_id: uuid.UUID,
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    return _build_match_live_state(db, league_id, match_id)


@router.post("", response_model=MatchRead, status_code=status.HTTP_201_CREATED)
def create_match(
    league_id: uuid.UUID,
    payload: MatchCreate,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    session = _require_session(db, league_id, payload.session_id)
    _ensure_session_open(session)
    home_team = db.get(SessionTeam, payload.home_team_id) if payload.home_team_id else None
    away_team = db.get(SessionTeam, payload.away_team_id) if payload.away_team_id else None
    if payload.home_team_id and (not home_team or home_team.league_id != league_id or home_team.session_id != session.id):
        raise HTTPException(status_code=404, detail="Home team not found in this session")
    if payload.away_team_id and (not away_team or away_team.league_id != league_id or away_team.session_id != session.id):
        raise HTTPException(status_code=404, detail="Away team not found in this session")
    if payload.home_team_id and payload.away_team_id and payload.home_team_id == payload.away_team_id:
        raise HTTPException(status_code=400, detail="Home and away teams must be different")
    item = Match(league_id=league_id, **payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{match_id}", response_model=MatchRead)
def update_match(
    league_id: uuid.UUID,
    match_id: uuid.UUID,
    payload: MatchUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    match = _require_match(db, league_id, match_id)
    _ensure_session_open(_require_session(db, league_id, match.session_id))
    if match.status == MatchStatus.FINISHED.value:
        raise HTTPException(status_code=400, detail="Finished matches are locked for editing")

    updates = payload.model_dump(exclude_unset=True)
    target_status = updates.pop("status", None)
    for field, value in updates.items():
        setattr(match, field, value)

    if target_status == "FINISHED":
        close_match_and_update_stats(db, match)
    else:
        if target_status is not None:
            update_match_status(db, match, target_status)
        db.add(match)
        recalculate_ranking(db, league_id)

    db.commit()
    db.refresh(match)
    _broadcast_live_updates(db, league_id, match)
    return match


@router.post("/{match_id}/finish", response_model=MatchRead)
def finish_match(
    league_id: uuid.UUID,
    match_id: uuid.UUID,
    payload: MatchFlowAction | None = None,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
    current_user=Depends(get_current_user),
):
    match = _require_match(db, league_id, match_id)
    _ensure_session_open(_require_session(db, league_id, match.session_id))
    event = MatchEvent(
        league_id=league_id,
        match_id=match.id,
        event_type=MatchEventType.MATCH_FINISHED,
        minute=payload.minute if payload else 0,
        second=payload.second if payload else 0,
        notes="Match finished via control action",
        created_by=current_user.id,
    )
    db.add(event)
    db.flush()
    apply_event_status_flow(db, match, event)
    db.commit()
    db.refresh(match)
    _broadcast_live_updates(db, league_id, match)
    return match


@router.post("/{match_id}/start", response_model=MatchRead)
def start_match(
    league_id: uuid.UUID,
    match_id: uuid.UUID,
    payload: MatchFlowAction,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
    current_user=Depends(get_current_user),
):
    match = _require_match(db, league_id, match_id)
    _ensure_session_open(_require_session(db, league_id, match.session_id))
    event = MatchEvent(
        league_id=league_id,
        match_id=match_id,
        event_type=MatchEventType.MATCH_STARTED,
        minute=payload.minute,
        second=payload.second,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(event)
    db.flush()
    apply_event_status_flow(db, match, event)
    db.commit()
    db.refresh(match)
    _broadcast_live_updates(db, league_id, match)
    return match


@router.post("/{match_id}/half-time", response_model=MatchRead)
def half_time_match(
    league_id: uuid.UUID,
    match_id: uuid.UUID,
    payload: MatchFlowAction,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
    current_user=Depends(get_current_user),
):
    match = _require_match(db, league_id, match_id)
    _ensure_session_open(_require_session(db, league_id, match.session_id))
    event = MatchEvent(
        league_id=league_id,
        match_id=match_id,
        event_type=MatchEventType.HALF_TIME,
        minute=payload.minute,
        second=payload.second,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(event)
    db.flush()
    apply_event_status_flow(db, match, event)
    db.commit()
    db.refresh(match)
    _broadcast_live_updates(db, league_id, match)
    return match


@router.post("/{match_id}/second-half", response_model=MatchRead)
def second_half_match(
    league_id: uuid.UUID,
    match_id: uuid.UUID,
    payload: MatchFlowAction,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
    current_user=Depends(get_current_user),
):
    match = _require_match(db, league_id, match_id)
    _ensure_session_open(_require_session(db, league_id, match.session_id))
    event = MatchEvent(
        league_id=league_id,
        match_id=match_id,
        event_type=MatchEventType.SECOND_HALF_STARTED,
        minute=payload.minute,
        second=payload.second,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(event)
    db.flush()
    apply_event_status_flow(db, match, event)
    db.commit()
    db.refresh(match)
    _broadcast_live_updates(db, league_id, match)
    return match


@router.get("/{match_id}/events", response_model=list[MatchEventDetailRead])
def list_match_events(
    league_id: uuid.UUID,
    match_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
):
    match = _require_match(db, league_id, match_id)
    team_lookup = _team_map(db, match.session_id)
    player_lookup = _player_map(db, league_id)
    events = (
        db.query(MatchEvent)
        .filter(MatchEvent.league_id == league_id, MatchEvent.match_id == match_id)
        .order_by(MatchEvent.minute.asc(), MatchEvent.second.asc(), MatchEvent.created_at.asc())
        .all()
    )
    return [_build_event_detail(item, team_lookup, player_lookup) for item in events]


@router.post("/{match_id}/events", response_model=MatchEventDetailRead, status_code=status.HTTP_201_CREATED)
def create_match_event(
    league_id: uuid.UUID,
    match_id: uuid.UUID,
    payload: MatchEventCreate,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
    current_user=Depends(get_current_user),
):
    match = _require_match(db, league_id, match_id)
    _ensure_session_open(_require_session(db, league_id, match.session_id))
    if payload.minute < 0 or payload.second < 0 or payload.second > 59:
        raise HTTPException(status_code=400, detail="Invalid event clock value")

    _validate_event_payload(
        db,
        league_id,
        match,
        event_type=payload.event_type,
        team_id=payload.team_id,
        player_id=payload.player_id,
        related_player_id=payload.related_player_id,
    )

    event = MatchEvent(
        league_id=league_id,
        match_id=match_id,
        created_by=current_user.id,
        **payload.model_dump(),
    )
    db.add(event)
    db.flush()
    apply_event_status_flow(db, match, event)
    recompute_match_score(db, match)
    recompute_event_driven_stats(db, league_id)
    db.commit()
    db.refresh(event)
    db.refresh(match)
    _broadcast_live_updates(db, league_id, match)
    return _build_event_detail(event, _team_map(db, match.session_id), _player_map(db, league_id))


@router.patch("/{match_id}/events/{event_id}", response_model=MatchEventDetailRead)
def update_match_event(
    league_id: uuid.UUID,
    match_id: uuid.UUID,
    event_id: uuid.UUID,
    payload: MatchEventUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    match = _require_match(db, league_id, match_id)
    _ensure_session_open(_require_session(db, league_id, match.session_id))
    if match.status == MatchStatus.FINISHED.value:
        raise HTTPException(status_code=400, detail="Finished matches are locked for editing")

    event = db.get(MatchEvent, event_id)
    if not event or event.league_id != league_id or event.match_id != match_id:
        raise HTTPException(status_code=404, detail="Match event not found")

    updates = payload.model_dump(exclude_unset=True)
    candidate_team_id = updates.get("team_id", event.team_id)
    candidate_player_id = updates.get("player_id", event.player_id)
    candidate_related_player_id = updates.get("related_player_id", event.related_player_id)
    candidate_minute = updates.get("minute", event.minute)
    candidate_second = updates.get("second", event.second)
    if candidate_minute is not None and candidate_minute < 0:
        raise HTTPException(status_code=400, detail="Invalid event clock value")
    if candidate_second is not None and (candidate_second < 0 or candidate_second > 59):
        raise HTTPException(status_code=400, detail="Invalid event clock value")

    _validate_event_payload(
        db,
        league_id,
        match,
        event_type=event.event_type,
        team_id=candidate_team_id,
        player_id=candidate_player_id,
        related_player_id=candidate_related_player_id,
    )

    for field, value in updates.items():
        setattr(event, field, value)

    db.add(event)
    db.flush()
    recompute_match_score(db, match)
    recompute_match_status_from_events(db, match)
    recompute_event_driven_stats(db, league_id)
    db.commit()
    db.refresh(event)
    db.refresh(match)
    _broadcast_live_updates(db, league_id, match)
    return _build_event_detail(event, _team_map(db, match.session_id), _player_map(db, league_id))


@router.post("/{match_id}/events/{event_id}/revert", response_model=MatchEventDetailRead)
def revert_match_event(
    league_id: uuid.UUID,
    match_id: uuid.UUID,
    event_id: uuid.UUID,
    db: Session = Depends(get_db),
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR)),
):
    match = _require_match(db, league_id, match_id)
    _ensure_session_open(_require_session(db, league_id, match.session_id))
    if match.status == MatchStatus.FINISHED.value:
        raise HTTPException(status_code=400, detail="Finished matches are locked for editing")

    event = db.get(MatchEvent, event_id)
    if not event or event.league_id != league_id or event.match_id != match_id:
        raise HTTPException(status_code=404, detail="Match event not found")

    event.is_reverted = True
    db.add(event)
    db.flush()
    recompute_match_score(db, match)
    recompute_match_status_from_events(db, match)
    recompute_event_driven_stats(db, league_id)
    db.commit()
    db.refresh(event)
    db.refresh(match)
    _broadcast_live_updates(db, league_id, match)
    return _build_event_detail(event, _team_map(db, match.session_id), _player_map(db, league_id))


@router.websocket("/ws/session/{session_id}")
async def session_live_socket(league_id: uuid.UUID, session_id: uuid.UUID, websocket: WebSocket):
    db = SessionLocal()
    channel = session_channel(session_id)
    await websocket.accept()
    try:
        if not await _authenticate_websocket(websocket, db, league_id):
            return
        _require_session(db, league_id, session_id)
        await live_manager.join(channel, websocket)
        await websocket.send_json(
            {"type": "session.snapshot", "payload": _build_session_live_state(db, league_id, session_id).model_dump(mode="json")}
        )
        while True:
            await websocket.receive_text()
    except (HTTPException, WebSocketDisconnect):
        pass
    finally:
        live_manager.disconnect(channel, websocket)
        db.close()


@router.websocket("/ws/{match_id}")
async def match_live_socket(league_id: uuid.UUID, match_id: uuid.UUID, websocket: WebSocket):
    db = SessionLocal()
    channel = match_channel(match_id)
    await websocket.accept()
    try:
        if not await _authenticate_websocket(websocket, db, league_id):
            return
        _require_match(db, league_id, match_id)
        await live_manager.join(channel, websocket)
        await websocket.send_json(
            {"type": "match.snapshot", "payload": _build_match_live_state(db, league_id, match_id).model_dump(mode="json")}
        )
        while True:
            await websocket.receive_text()
    except (HTTPException, WebSocketDisconnect):
        pass
    finally:
        live_manager.disconnect(channel, websocket)
        db.close()
