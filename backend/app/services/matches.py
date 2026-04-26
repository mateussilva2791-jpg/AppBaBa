import uuid
from datetime import UTC, datetime, timedelta

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.enums import MatchEventType, MatchStatus
from app.models.match import Match, MatchEvent
from app.models.player import LeaguePlayerStats
from app.models.session import Session as LeagueSession
from app.models.session import SessionPlayer, SessionTeam, SessionTeamPlayer
from app.services.ranking import recalculate_ranking
from app.services.session_match_flow import SessionMatchFlowService
from app.services.sessions import KNOCKOUT_STAGES, sync_session_status


EVENT_STATUS_FLOW: dict[MatchEventType, str | None] = {
    MatchEventType.MATCH_STARTED: MatchStatus.LIVE.value,
    MatchEventType.HALF_TIME: MatchStatus.HALF_TIME.value,
    MatchEventType.SECOND_HALF_STARTED: MatchStatus.LIVE.value,
    MatchEventType.MATCH_FINISHED: MatchStatus.FINISHED.value,
}

PRE_MATCH_STATUSES = {MatchStatus.SCHEDULED.value, "NOT_STARTED"}
CLOCK_NOT_STARTED = "NOT_STARTED"
CLOCK_FIRST_HALF = "FIRST_HALF"
CLOCK_HALF_TIME = "HALF_TIME"
CLOCK_SECOND_HALF = "SECOND_HALF"
CLOCK_FINISHED = "FINISHED"


def _team_player_ids(db: Session, team_id: uuid.UUID) -> set[uuid.UUID]:
    rows = db.query(SessionTeamPlayer.player_id).filter(SessionTeamPlayer.team_id == team_id).all()
    return {row[0] for row in rows}


def get_clock_seconds_from_payload(minute: int, second: int) -> int:
    return max(0, minute) * 60 + max(0, second)


def get_match_clock_seconds(match: Match, now: datetime | None = None) -> int:
    total = match.elapsed_seconds or 0
    if match.is_clock_running and match.period_started_at:
        reference = now or datetime.now(UTC)
        total += max(0, int((reference - match.period_started_at).total_seconds()))
    return total


def _reset_match_clock(match: Match) -> None:
    match.current_period = CLOCK_NOT_STARTED
    match.period_started_at = None
    match.elapsed_seconds = 0
    match.is_clock_running = False
    match.finished_at = None


def _anchor_period_start(reference_time: datetime, total_seconds: int, base_elapsed: int) -> datetime:
    elapsed_in_period = max(0, total_seconds - base_elapsed)
    return reference_time - timedelta(seconds=elapsed_in_period)


def start_match_clock(match: Match, *, period: str, minute: int, second: int, now: datetime | None = None) -> Match:
    reference = now or datetime.now(UTC)
    requested_seconds = get_clock_seconds_from_payload(minute, second)
    base_elapsed = 0 if period == CLOCK_FIRST_HALF else max(match.elapsed_seconds, requested_seconds)
    match.elapsed_seconds = base_elapsed
    match.period_started_at = _anchor_period_start(reference, requested_seconds, base_elapsed)
    match.is_clock_running = True
    match.current_period = period
    if period != CLOCK_FINISHED:
        match.finished_at = None
    return match


def pause_match_clock(match: Match, *, minute: int, second: int, now: datetime | None = None) -> Match:
    reference = now or datetime.now(UTC)
    requested_seconds = get_clock_seconds_from_payload(minute, second)
    match.elapsed_seconds = max(get_match_clock_seconds(match, reference), requested_seconds)
    match.period_started_at = None
    match.is_clock_running = False
    match.current_period = CLOCK_HALF_TIME
    return match


def finish_match_clock(match: Match, *, minute: int, second: int, now: datetime | None = None) -> Match:
    reference = now or datetime.now(UTC)
    requested_seconds = get_clock_seconds_from_payload(minute, second)
    match.elapsed_seconds = max(get_match_clock_seconds(match, reference), requested_seconds)
    match.period_started_at = None
    match.is_clock_running = False
    match.current_period = CLOCK_FINISHED
    match.finished_at = reference
    return match


def _apply_clock_state_from_event(match: Match, event: MatchEvent) -> None:
    if event.event_type == MatchEventType.MATCH_STARTED:
        start_match_clock(match, period=CLOCK_FIRST_HALF, minute=event.minute, second=event.second, now=event.created_at)
    elif event.event_type == MatchEventType.HALF_TIME:
        pause_match_clock(match, minute=event.minute, second=event.second, now=event.created_at)
    elif event.event_type == MatchEventType.SECOND_HALF_STARTED:
        start_match_clock(match, period=CLOCK_SECOND_HALF, minute=event.minute, second=event.second, now=event.created_at)
    elif event.event_type == MatchEventType.MATCH_FINISHED:
        finish_match_clock(match, minute=event.minute, second=event.second, now=event.created_at)


def ensure_valid_match_transition(match: Match, next_status: str) -> None:
    valid_transitions = {
        MatchStatus.SCHEDULED.value: {MatchStatus.LIVE.value},
        "NOT_STARTED": {MatchStatus.LIVE.value},
        MatchStatus.LIVE.value: {MatchStatus.HALF_TIME.value, MatchStatus.FINISHED.value},
        MatchStatus.HALF_TIME.value: {MatchStatus.LIVE.value, MatchStatus.FINISHED.value},
        MatchStatus.FINISHED.value: set(),
    }
    if next_status not in valid_transitions.get(match.status, set()):
        raise HTTPException(status_code=400, detail=f"Invalid match status transition from {match.status} to {next_status}")


def update_match_status(db: Session, match: Match, next_status: str) -> Match:
    if match.status == MatchStatus.FINISHED.value:
        raise HTTPException(status_code=400, detail="Finished matches are locked for editing")
    ensure_valid_match_transition(match, next_status)
    match.status = next_status
    db.add(match)
    db.flush()
    session = db.get(LeagueSession, match.session_id)
    if session:
        sync_session_status(db, session)
    return match


def recompute_match_status_from_events(db: Session, match: Match) -> Match:
    ordered_events = (
        db.query(MatchEvent)
        .filter(MatchEvent.match_id == match.id, MatchEvent.is_reverted.is_(False))
        .order_by(MatchEvent.minute.asc(), MatchEvent.second.asc(), MatchEvent.created_at.asc())
        .all()
    )
    status = MatchStatus.SCHEDULED.value
    _reset_match_clock(match)
    for event in ordered_events:
        next_status = EVENT_STATUS_FLOW.get(event.event_type)
        _apply_clock_state_from_event(match, event)
        if next_status:
            status = next_status
    match.status = status
    db.add(match)
    db.flush()
    session = db.get(LeagueSession, match.session_id)
    if session:
        sync_session_status(db, session)
    return match


def recompute_match_score(db: Session, match: Match) -> Match:
    home_score = 0
    away_score = 0

    events = db.query(MatchEvent).filter(MatchEvent.match_id == match.id, MatchEvent.is_reverted.is_(False)).all()

    for event in events:
        if event.event_type == MatchEventType.GOAL:
            if event.team_id == match.away_team_id:
                away_score += 1
            else:
                home_score += 1
        elif event.event_type == MatchEventType.OWN_GOAL:
            if event.team_id == match.away_team_id:
                home_score += 1
            else:
                away_score += 1

    match.home_score = home_score
    match.away_score = away_score
    db.add(match)
    db.flush()
    return match


def recompute_event_driven_stats(db: Session, league_id: uuid.UUID) -> None:
    stats = db.query(LeaguePlayerStats).filter(LeaguePlayerStats.league_id == league_id).all()
    stats_by_player = {item.player_id: item for item in stats}

    confirmed_rows = (
        db.query(SessionPlayer.player_id)
        .filter(SessionPlayer.league_id == league_id, SessionPlayer.is_confirmed.is_(True))
        .all()
    )
    participation_rows = (
        db.query(SessionTeamPlayer.player_id)
        .join(SessionTeam, SessionTeam.id == SessionTeamPlayer.team_id)
        .join(Match, Match.session_id == SessionTeam.session_id)
        .filter(Match.league_id == league_id, Match.status == MatchStatus.FINISHED.value)
        .all()
    )

    for stat in stats:
        stat.goals = 0
        stat.assists = 0
        stat.fouls = 0
        stat.yellow_cards = 0
        stat.red_cards = 0
        stat.clean_sheets = 0
        stat.attendances = 0
        stat.participations = 0

    for player_id, in confirmed_rows:
        if player_id in stats_by_player:
            stats_by_player[player_id].attendances += 1

    for player_id, in participation_rows:
        if player_id in stats_by_player:
            stats_by_player[player_id].participations += 1

    events = db.query(MatchEvent).filter(MatchEvent.league_id == league_id, MatchEvent.is_reverted.is_(False)).all()
    for event in events:
        if event.event_type == MatchEventType.GOAL and event.player_id in stats_by_player:
            stats_by_player[event.player_id].goals += 1
        if event.event_type == MatchEventType.ASSIST and event.player_id in stats_by_player:
            stats_by_player[event.player_id].assists += 1
        if event.event_type == MatchEventType.GOAL and event.related_player_id in stats_by_player:
            stats_by_player[event.related_player_id].assists += 1
        if event.event_type == MatchEventType.FOUL and event.player_id in stats_by_player:
            stats_by_player[event.player_id].fouls += 1
        if event.event_type == MatchEventType.YELLOW_CARD and event.player_id in stats_by_player:
            stats_by_player[event.player_id].yellow_cards += 1
        if event.event_type == MatchEventType.RED_CARD and event.player_id in stats_by_player:
            stats_by_player[event.player_id].red_cards += 1

    finished_matches = db.query(Match).filter(Match.league_id == league_id, Match.status == MatchStatus.FINISHED.value).all()
    for match in finished_matches:
        if match.home_score == 0:
            for player_id in _team_player_ids(db, match.away_team_id):
                stat = stats_by_player.get(player_id)
                if stat:
                    stat.clean_sheets += 1
        if match.away_score == 0:
            for player_id in _team_player_ids(db, match.home_team_id):
                stat = stats_by_player.get(player_id)
                if stat:
                    stat.clean_sheets += 1

    recalculate_ranking(db, league_id)
    db.flush()


def close_match_and_update_stats(db: Session, match: Match) -> Match:
    if match.status == MatchStatus.FINISHED.value:
        raise HTTPException(status_code=400, detail="Match is already finished")
    if match.home_team_id is None or match.away_team_id is None:
        raise HTTPException(status_code=400, detail="This match still has pending bracket slots")
    if match.stage in KNOCKOUT_STAGES and match.home_score == match.away_score:
        raise HTTPException(status_code=400, detail="Knockout matches cannot end tied")

    home_player_ids = _team_player_ids(db, match.home_team_id)
    away_player_ids = _team_player_ids(db, match.away_team_id)

    if not home_player_ids or not away_player_ids:
        raise HTTPException(status_code=400, detail="Both teams must have players before closing the match")
    all_player_ids = home_player_ids | away_player_ids
    stats_by_player = {
        stat.player_id: stat
        for stat in db.query(LeaguePlayerStats)
        .filter(LeaguePlayerStats.league_id == match.league_id, LeaguePlayerStats.player_id.in_(all_player_ids))
        .all()
    }

    for player_id in all_player_ids:
        stat = stats_by_player.get(player_id)
        if stat:
            stat.matches_played += 1

    if match.home_score > match.away_score:
        winners = home_player_ids
        losers = away_player_ids
    elif match.away_score > match.home_score:
        winners = away_player_ids
        losers = home_player_ids
    else:
        winners = set()
        losers = set()

    for player_id in winners:
        stat = stats_by_player.get(player_id)
        if stat:
            stat.wins += 1

    for player_id in losers:
        stat = stats_by_player.get(player_id)
        if stat:
            stat.losses += 1

    if match.current_period != CLOCK_FINISHED or match.is_clock_running:
        finish_match_clock(match, minute=match.elapsed_seconds // 60, second=match.elapsed_seconds % 60)
    match.status = MatchStatus.FINISHED.value
    db.add(match)
    SessionMatchFlowService(db).finalize_match_and_schedule_next(match.id)
    recompute_event_driven_stats(db, match.league_id)
    session = db.get(LeagueSession, match.session_id)
    if session:
        sync_session_status(db, session)
    db.flush()
    return match


def apply_event_status_flow(db: Session, match: Match, event: MatchEvent) -> Match:
    next_status = EVENT_STATUS_FLOW.get(event.event_type)
    if not next_status:
        return match

    _apply_clock_state_from_event(match, event)

    if next_status == MatchStatus.FINISHED.value:
        close_match_and_update_stats(db, match)
        return match

    if match.status != next_status:
        update_match_status(db, match, next_status)
    return match
