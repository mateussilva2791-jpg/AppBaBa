import uuid
from collections.abc import Sequence

from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models.enums import MatchStatus, SessionStatus, TeamGenerationMode
from app.models.match import Match, MatchEvent
from app.models.player import LeaguePlayer
from app.models.session import Session as LeagueSession
from app.models.session import SessionPlayer, SessionTeam, SessionTeamPlayer
from app.services.draw import TeamDrawService, compute_player_overall, player_balance_score
from app.services.highlights import HighlightService
from app.services.ranking import recalculate_ranking
from app.services.session_closing import SessionClosingService
from app.services.session_match_flow import FINISHED_FLOW_PHASE, INITIAL_FLOW_PHASE, ROTATION_FLOW_PHASE, SessionMatchFlowService


TEAM_COLORS = ["#15d18f", "#1fb7ff", "#ff9f43", "#ff5f7a", "#e8edf4", "#222b36"]
AUTO_BRACKET_STAGES = {"SEMIFINAL", "WINNERS_FINAL", "LOSERS_FINAL", "FINAL", "THIRD_PLACE"}
KNOCKOUT_STAGES = {"SEMIFINAL", "WINNERS_FINAL", "LOSERS_FINAL", "FINAL", "THIRD_PLACE", "INITIAL_MATCH", "WINNERS_MATCH", "ROTATION"}


def require_session(db: Session, league_id: uuid.UUID, session_id: uuid.UUID) -> LeagueSession:
    session = db.get(LeagueSession, session_id)
    if not session or session.league_id != league_id:
        raise HTTPException(status_code=404, detail="Session not found in this league")
    return session


def get_confirmed_session_players(db: Session, league_id: uuid.UUID, session_id: uuid.UUID) -> list[LeaguePlayer]:
    return (
        db.query(LeaguePlayer)
        .join(SessionPlayer, SessionPlayer.player_id == LeaguePlayer.id)
        .filter(
            SessionPlayer.league_id == league_id,
            SessionPlayer.session_id == session_id,
            SessionPlayer.is_confirmed.is_(True),
        )
        .order_by(
            LeaguePlayer.skill_level.desc(),
            LeaguePlayer.ovr.desc(),
            LeaguePlayer.attack_rating.desc(),
            LeaguePlayer.defense_rating.desc(),
            LeaguePlayer.name.asc(),
        )
        .all()
    )


def ensure_session_editable(session: LeagueSession) -> None:
    if session.status == SessionStatus.FINISHED.value:
        raise HTTPException(status_code=400, detail="Finished sessions are locked for editing")


def _clear_session_assignments(db: Session, session_id: uuid.UUID) -> None:
    existing_teams = db.query(SessionTeam).filter(SessionTeam.session_id == session_id).all()
    for team in existing_teams:
        db.delete(team)
    db.flush()


def _persist_team_players(db: Session, league_id: uuid.UUID, buckets: list[dict]) -> None:
    for bucket in buckets:
        ranked_players = sorted(
            bucket["players"],
            key=lambda player: (compute_player_overall(player), player.skill_level, player.attack_rating),
            reverse=True,
        )
        for idx, player in enumerate(ranked_players):
            db.add(
                SessionTeamPlayer(
                    league_id=league_id,
                    team_id=bucket["team"].id,
                    player_id=player.id,
                    is_captain=idx == 0,
                )
            )
    db.flush()


def _bucket_strength_payload(bucket) -> dict:
    return {
        "total_strength": bucket.total_skill,
        "average_overall": bucket.average_overall,
        "attack_total": bucket.total_attack,
        "passing_total": bucket.total_passing,
        "defense_total": bucket.total_defense,
        "stamina_total": bucket.total_stamina,
    }


def _comparison_payload(buckets: Sequence) -> dict:
    strengths = [bucket.total_skill for bucket in buckets]
    if not strengths:
        return {
            "strongest_team_id": None,
            "weakest_team_id": None,
            "strength_gap": 0,
            "average_strength": 0,
            "balance_state": "BALANCED",
        }

    strongest = max(buckets, key=lambda item: item.total_skill)
    weakest = min(buckets, key=lambda item: item.total_skill)
    gap = strongest.total_skill - weakest.total_skill
    average_strength = round(sum(strengths) / len(strengths))
    balance_state = "BALANCED" if gap <= 24 else "WARNING" if gap <= 60 else "UNBALANCED"

    return {
        "strongest_team_id": strongest.team_id,
        "weakest_team_id": weakest.team_id,
        "strength_gap": gap,
        "average_strength": average_strength,
        "balance_state": balance_state,
    }


def sync_session_status(db: Session, session: LeagueSession) -> LeagueSession:
    matches = (
        db.query(Match)
        .filter(Match.session_id == session.id)
        .order_by(Match.round_number.asc(), Match.sequence.asc(), Match.created_at.asc())
        .all()
    )
    confirmed_count = (
        db.query(SessionPlayer)
        .filter(
            SessionPlayer.session_id == session.id,
            SessionPlayer.is_confirmed.is_(True),
        )
        .count()
    )
    teams_count = db.query(SessionTeam).filter(SessionTeam.session_id == session.id).count()

    playable_matches = [match for match in matches if match.home_team_id and match.away_team_id]
    uses_rotation_flow = session.team_count == 4 and (
        session.flow_phase in {INITIAL_FLOW_PHASE, ROTATION_FLOW_PHASE}
        or any(match.stage in {"INITIAL_MATCH", "WINNERS_MATCH", "ROTATION", "SEMIFINAL"} for match in matches)
    )

    if session.flow_phase == FINISHED_FLOW_PHASE:
        session.status = SessionStatus.FINISHED.value
    elif uses_rotation_flow:
        if any(match.status in {MatchStatus.LIVE.value, MatchStatus.HALF_TIME.value} for match in matches):
            session.status = SessionStatus.IN_PROGRESS.value
        elif matches or (confirmed_count and teams_count >= 2):
            session.status = SessionStatus.READY.value
        else:
            session.status = SessionStatus.DRAFT.value
    elif playable_matches and all(match.status == MatchStatus.FINISHED.value for match in playable_matches):
        session.status = SessionStatus.FINISHED.value
    elif any(match.status in {MatchStatus.LIVE.value, MatchStatus.HALF_TIME.value} for match in matches):
        session.status = SessionStatus.IN_PROGRESS.value
    elif matches:
        session.status = SessionStatus.READY.value
    elif confirmed_count and teams_count >= 2:
        session.status = SessionStatus.READY.value
    else:
        session.status = SessionStatus.DRAFT.value

    db.add(session)
    db.flush()
    return session


def _persist_generated_buckets(
    db: Session,
    *,
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    buckets: Sequence,
) -> list[dict]:
    persisted_buckets: list[dict] = []
    for bucket in buckets:
        team = SessionTeam(
            league_id=league_id,
            session_id=session_id,
            name=bucket.name,
            color=bucket.color,
        )
        db.add(team)
        db.flush()
        bucket.team_id = team.id
        persisted_buckets.append(
            {
                "team": team,
                "players": list(bucket.players),
                "total_skill": bucket.total_skill,
                "strength": _bucket_strength_payload(bucket),
                "average_overall": bucket.average_overall,
            }
        )
    _persist_team_players(db, league_id, persisted_buckets)
    return persisted_buckets


def _serialize_bucket_payloads(buckets: Sequence) -> list[dict]:
    comparison = _comparison_payload(buckets)
    average_strength = comparison["average_strength"] or 0
    payloads: list[dict] = []
    for bucket in buckets:
        balance_delta = abs(bucket.total_skill - average_strength)
        balance_state = "BALANCED" if balance_delta <= 12 else "WARNING" if balance_delta <= 30 else "UNBALANCED"
        payloads.append(
            {
                "team_id": bucket.team_id,
                "name": bucket.name,
                "color": bucket.color,
                "total_skill": bucket.total_skill,
                "balance_delta": balance_delta,
                "balance_state": balance_state,
                "strength": _bucket_strength_payload(bucket),
                "players": [
                    {
                        "player_id": player.id,
                        "player_name": player.name,
                        "position": player.position,
                        "ovr": player.ovr,
                        "overall": compute_player_overall(player),
                        "balance_score": player_balance_score(player),
                        "attack_rating": player.attack_rating,
                        "passing_rating": player.passing_rating,
                        "defense_rating": player.defense_rating,
                        "stamina_rating": player.stamina_rating,
                        "relative_speed": player.relative_speed,
                        "relative_strength": player.relative_strength,
                        "skill_level": player.skill_level,
                    }
                    for player in bucket.players
                ],
            }
        )
    return payloads


def build_generated_team_payloads(db: Session, session_id: uuid.UUID) -> tuple[list[dict], dict]:
    teams = _ordered_session_teams(db, session_id)
    player_map = {
        player.id: player
        for player in (
            db.query(LeaguePlayer)
            .join(SessionTeamPlayer, SessionTeamPlayer.player_id == LeaguePlayer.id)
            .join(SessionTeam, SessionTeam.id == SessionTeamPlayer.team_id)
            .filter(SessionTeam.session_id == session_id)
            .all()
        )
    }

    buckets = []
    for team in teams:
        rows = (
            db.query(SessionTeamPlayer)
            .filter(SessionTeamPlayer.team_id == team.id)
            .order_by(SessionTeamPlayer.created_at.asc())
            .all()
        )
        service_bucket = TeamDrawService()._build_buckets(team_count=1, team_names=[team.name], team_colors=[team.color])[0]
        service_bucket.team_id = team.id
        for row in rows:
            player = player_map.get(row.player_id)
            if player:
                service_bucket.add_player(player)
        buckets.append(service_bucket)

    return _serialize_bucket_payloads(buckets), _comparison_payload(buckets)


def generate_session_teams(
    db: Session,
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    team_count: int,
    mode: TeamGenerationMode,
) -> tuple[list[dict], dict]:
    if team_count < 2 or team_count > 4:
        raise HTTPException(status_code=400, detail="Team count must be between 2 and 4")

    session = require_session(db, league_id, session_id)
    ensure_session_editable(session)

    if db.query(Match).filter(Match.session_id == session_id).count():
        raise HTTPException(
            status_code=400,
            detail="Cannot regenerate teams after matches have been created for this session",
        )

    available_players = get_confirmed_session_players(db, league_id, session_id)
    if len(available_players) < team_count:
        raise HTTPException(status_code=400, detail="Not enough confirmed players to generate teams")

    _clear_session_assignments(db, session_id)
    draw_service = TeamDrawService()
    generated_buckets = draw_service.generate(
        players=available_players,
        team_count=team_count,
        mode=mode,
        team_names=[f"Esquadra {index + 1}" for index in range(team_count)],
        team_colors=[TEAM_COLORS[index % len(TEAM_COLORS)] for index in range(team_count)],
    )
    _persist_generated_buckets(
        db,
        league_id=league_id,
        session_id=session_id,
        buckets=generated_buckets,
    )
    session.team_count = team_count
    sync_session_status(db, session)
    create_session_bracket(db, league_id, session_id)
    return _serialize_bucket_payloads(generated_buckets), _comparison_payload(generated_buckets)


def _ordered_session_teams(db: Session, session_id: uuid.UUID) -> list[SessionTeam]:
    return (
        db.query(SessionTeam)
        .filter(SessionTeam.session_id == session_id)
        .order_by(SessionTeam.created_at.asc(), SessionTeam.name.asc())
        .all()
    )


def _create_match(
    *,
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    stage: str,
    round_number: int,
    sequence: int,
    label: str,
    home_team_id: uuid.UUID | None = None,
    away_team_id: uuid.UUID | None = None,
    bracket_group: str | None = None,
    home_team_source_match_id: uuid.UUID | None = None,
    away_team_source_match_id: uuid.UUID | None = None,
    home_team_source_outcome: str | None = None,
    away_team_source_outcome: str | None = None,
) -> Match:
    return Match(
        league_id=league_id,
        session_id=session_id,
        home_team_id=home_team_id,
        away_team_id=away_team_id,
        status=MatchStatus.SCHEDULED.value,
        stage=stage,
        round_number=round_number,
        sequence=sequence,
        label=label,
        bracket_group=bracket_group,
        home_team_source_match_id=home_team_source_match_id,
        away_team_source_match_id=away_team_source_match_id,
        home_team_source_outcome=home_team_source_outcome,
        away_team_source_outcome=away_team_source_outcome,
    )


def create_session_bracket(db: Session, league_id: uuid.UUID, session_id: uuid.UUID) -> list[Match]:
    session = require_session(db, league_id, session_id)
    ensure_session_editable(session)

    if db.query(Match).filter(Match.session_id == session_id).count():
        raise HTTPException(status_code=400, detail="This session already has generated matches")

    teams = _ordered_session_teams(db, session_id)
    if len(teams) not in {2, 3, 4}:
        raise HTTPException(status_code=400, detail="Bracket generation requires 2, 3 or 4 teams")

    if len(teams) == 4:
        session.team_count = 4
        session.flow_phase = INITIAL_FLOW_PHASE
        db.add(session)
        db.flush()
        matches = SessionMatchFlowService(db).create_initial_matches(session_id)
        sync_session_status(db, session)
        return matches

    matches: list[Match] = []
    if len(teams) == 2:
        matches.append(
            _create_match(
                league_id=league_id,
                session_id=session_id,
                home_team_id=teams[0].id,
                away_team_id=teams[1].id,
                stage="FINAL",
                round_number=1,
                sequence=1,
                label="Final",
                bracket_group="WINNERS",
            )
        )
    elif len(teams) == 3:
        pairs = [
            (teams[0], teams[1], "Rodada 1", 1),
            (teams[1], teams[2], "Rodada 2", 2),
            (teams[0], teams[2], "Rodada 3", 3),
        ]
        for home_team, away_team, label, sequence in pairs:
            matches.append(
                _create_match(
                    league_id=league_id,
                    session_id=session_id,
                    home_team_id=home_team.id,
                    away_team_id=away_team.id,
                    stage="ROUND_ROBIN",
                    round_number=1,
                    sequence=sequence,
                    label=label,
                    bracket_group="GROUP",
                )
            )
    else:
        semifinal_1 = _create_match(
            league_id=league_id,
            session_id=session_id,
            home_team_id=teams[0].id,
            away_team_id=teams[1].id,
            stage="SEMIFINAL",
            round_number=1,
            sequence=1,
            label="Semifinal 1",
            bracket_group="WINNERS",
        )
        semifinal_2 = _create_match(
            league_id=league_id,
            session_id=session_id,
            home_team_id=teams[2].id,
            away_team_id=teams[3].id,
            stage="SEMIFINAL",
            round_number=1,
            sequence=2,
            label="Semifinal 2",
            bracket_group="WINNERS",
        )
        db.add(semifinal_1)
        db.add(semifinal_2)
        db.flush()
        matches.extend([semifinal_1, semifinal_2])
        matches.append(
            _create_match(
                league_id=league_id,
                session_id=session_id,
                stage="LOSERS_FINAL",
                round_number=2,
                sequence=1,
                label="Final da chave de perdedores",
                bracket_group="LOSERS",
                home_team_source_match_id=semifinal_1.id,
                away_team_source_match_id=semifinal_2.id,
                home_team_source_outcome="LOSER",
                away_team_source_outcome="LOSER",
            )
        )
        matches.append(
            _create_match(
                league_id=league_id,
                session_id=session_id,
                stage="WINNERS_FINAL",
                round_number=2,
                sequence=2,
                label="Final da chave de vencedores",
                bracket_group="WINNERS",
                home_team_source_match_id=semifinal_1.id,
                away_team_source_match_id=semifinal_2.id,
                home_team_source_outcome="WINNER",
                away_team_source_outcome="WINNER",
            )
        )

    for match in matches:
        if match.id is None:
            db.add(match)

    db.flush()
    sync_session_status(db, session)
    return (
        db.query(Match)
        .filter(Match.session_id == session_id)
        .order_by(Match.round_number.asc(), Match.sequence.asc(), Match.created_at.asc())
        .all()
    )


def ensure_session_bracket_generated(db: Session, league_id: uuid.UUID, session_id: uuid.UUID) -> list[Match]:
    session = require_session(db, league_id, session_id)
    matches = (
        db.query(Match)
        .filter(Match.session_id == session_id)
        .order_by(Match.round_number.asc(), Match.sequence.asc(), Match.created_at.asc())
        .all()
    )
    if matches:
        return matches
    if session.status == SessionStatus.FINISHED.value:
        return matches

    teams = _ordered_session_teams(db, session_id)
    if len(teams) not in {2, 3, 4}:
        return matches

    return create_session_bracket(db, league_id, session_id)


def advance_session_bracket(db: Session, league_id: uuid.UUID, session_id: uuid.UUID) -> list[Match]:
    session = require_session(db, league_id, session_id)
    matches = (
        db.query(Match)
        .filter(Match.session_id == session_id)
        .order_by(Match.round_number.asc(), Match.sequence.asc(), Match.created_at.asc())
        .all()
    )
    sync_session_status(db, session)
    return matches


def resolve_match_outcome(match: Match, outcome: str) -> uuid.UUID:
    if match.home_team_id is None or match.away_team_id is None:
        raise HTTPException(status_code=400, detail="Match does not yet have both teams assigned")
    if match.home_score == match.away_score:
        raise HTTPException(status_code=400, detail="Knockout matches cannot end tied")
    is_home_winner = match.home_score > match.away_score
    if outcome == "WINNER":
        return match.home_team_id if is_home_winner else match.away_team_id
    if outcome == "LOSER":
        return match.away_team_id if is_home_winner else match.home_team_id
    raise HTTPException(status_code=400, detail="Unsupported bracket outcome")


def propagate_match_result(db: Session, match: Match) -> list[Match]:
    dependents = (
        db.query(Match)
        .filter(
            Match.session_id == match.session_id,
            (Match.home_team_source_match_id == match.id) | (Match.away_team_source_match_id == match.id),
        )
        .all()
    )
    updated: list[Match] = []
    for dependent in dependents:
        if dependent.home_team_source_match_id == match.id and dependent.home_team_source_outcome:
            dependent.home_team_id = resolve_match_outcome(match, dependent.home_team_source_outcome)
            dependent.home_score = 0
        if dependent.away_team_source_match_id == match.id and dependent.away_team_source_outcome:
            dependent.away_team_id = resolve_match_outcome(match, dependent.away_team_source_outcome)
            dependent.away_score = 0
        db.add(dependent)
        updated.append(dependent)
    db.flush()
    return updated


def move_session_player(
    db: Session,
    *,
    league_id: uuid.UUID,
    session_id: uuid.UUID,
    player_id: uuid.UUID,
    target_team_id: uuid.UUID,
    make_captain: bool = False,
) -> SessionTeamPlayer:
    session = require_session(db, league_id, session_id)
    ensure_session_editable(session)
    if _session_team_edits_locked(db, session_id):
        raise HTTPException(status_code=400, detail="Team assignments are locked after the round has started")

    target_team = db.get(SessionTeam, target_team_id)
    if not target_team or target_team.league_id != league_id or target_team.session_id != session_id:
        raise HTTPException(status_code=404, detail="Target team not found in this session")

    session_player = (
        db.query(SessionPlayer)
        .filter(SessionPlayer.session_id == session_id, SessionPlayer.player_id == player_id)
        .first()
    )
    if not session_player:
        raise HTTPException(status_code=400, detail="Player must belong to the session before being moved")

    current_assignment = (
        db.query(SessionTeamPlayer)
        .join(SessionTeam, SessionTeam.id == SessionTeamPlayer.team_id)
        .filter(SessionTeam.session_id == session_id, SessionTeamPlayer.player_id == player_id)
        .first()
    )
    if current_assignment:
        current_assignment.team_id = target_team_id
        current_assignment.is_captain = make_captain
        assignment = current_assignment
    else:
        assignment = SessionTeamPlayer(
            league_id=league_id,
            team_id=target_team_id,
            player_id=player_id,
            is_captain=make_captain,
        )
        db.add(assignment)

    if make_captain:
        db.query(SessionTeamPlayer).filter(
            SessionTeamPlayer.team_id == target_team_id,
            SessionTeamPlayer.player_id != player_id,
        ).update({"is_captain": False}, synchronize_session=False)

    db.flush()
    sync_session_status(db, session)
    return assignment


def _session_team_edits_locked(db: Session, session_id: uuid.UUID) -> bool:
    has_started_match = (
        db.query(Match)
        .filter(
            Match.session_id == session_id,
            or_(
                Match.status != MatchStatus.SCHEDULED.value,
                Match.home_score > 0,
                Match.away_score > 0,
            ),
        )
        .count()
        > 0
    )
    if has_started_match:
        return True

    has_events = (
        db.query(MatchEvent)
        .join(Match, Match.id == MatchEvent.match_id)
        .filter(Match.session_id == session_id, MatchEvent.is_reverted.is_(False))
        .count()
        > 0
    )
    return has_events


def finalize_session(db: Session, league_id: uuid.UUID, session_id: uuid.UUID) -> dict:
    require_session(db, league_id, session_id)
    return SessionClosingService(db).close_session(session_id)


def _resolve_session_champion(matches: Sequence[Match]) -> uuid.UUID | None:
    latest_rotation = next((match for match in reversed(matches) if match.stage == "ROTATION" and match.winner_team_id), None)
    if latest_rotation:
        return latest_rotation.winner_team_id

    winners_match = next((match for match in reversed(matches) if match.stage == "WINNERS_MATCH" and match.winner_team_id), None)
    if winners_match:
        return winners_match.winner_team_id

    winners_final = next((match for match in matches if match.stage == "WINNERS_FINAL"), None)
    final_match = winners_final or next((match for match in matches if match.stage == "FINAL"), None)
    if final_match and final_match.home_score != final_match.away_score and final_match.home_team_id and final_match.away_team_id:
        return final_match.home_team_id if final_match.home_score > final_match.away_score else final_match.away_team_id

    if len(matches) == 1 and matches[0].home_score != matches[0].away_score:
        only_match = matches[0]
        return only_match.home_team_id if only_match.home_score > only_match.away_score else only_match.away_team_id

    standings: dict[uuid.UUID, tuple[int, int]] = {}
    for match in matches:
        if match.home_team_id is None or match.away_team_id is None:
            continue
        home_points = 3 if match.home_score > match.away_score else 1 if match.home_score == match.away_score else 0
        away_points = 3 if match.away_score > match.home_score else 1 if match.home_score == match.away_score else 0
        standings[match.home_team_id] = (
            standings.get(match.home_team_id, (0, 0))[0] + home_points,
            standings.get(match.home_team_id, (0, 0))[1] + (match.home_score - match.away_score),
        )
        standings[match.away_team_id] = (
            standings.get(match.away_team_id, (0, 0))[0] + away_points,
            standings.get(match.away_team_id, (0, 0))[1] + (match.away_score - match.home_score),
        )

    if not standings:
        return None
    return max(standings.items(), key=lambda item: (item[1][0], item[1][1]))[0]


def build_session_workflow(db: Session, league_id: uuid.UUID, session_id: uuid.UUID) -> dict:
    session = require_session(db, league_id, session_id)
    confirmed_players = (
        db.query(SessionPlayer)
        .filter(SessionPlayer.league_id == league_id, SessionPlayer.session_id == session_id, SessionPlayer.is_confirmed.is_(True))
        .count()
    )
    teams_created = db.query(SessionTeam).filter(SessionTeam.session_id == session_id).count()
    matches_created = db.query(Match).filter(Match.session_id == session_id).count()
    active_or_pending_matches = (
        db.query(Match)
        .filter(
            Match.session_id == session_id,
            Match.home_team_id.is_not(None),
            Match.away_team_id.is_not(None),
            Match.status != MatchStatus.FINISHED.value,
        )
        .count()
    )
    return {
        "session": session,
        "confirmed_players": confirmed_players,
        "teams_created": teams_created,
        "matches_created": matches_created,
        "ready_for_draw": confirmed_players >= max(session.team_count, 2),
        "ready_for_matches": teams_created in {2, 3, 4} and matches_created == 0,
        "can_finalize": session.status != SessionStatus.FINISHED.value and matches_created > 0,
        "has_open_matches": active_or_pending_matches > 0,
    }
