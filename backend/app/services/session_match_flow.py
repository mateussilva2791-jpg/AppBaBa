import uuid
from collections.abc import Sequence
import logging

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.enums import MatchStatus
from app.models.match import Match
from app.models.session import Session as LeagueSession
from app.models.session import SessionTeam


INITIAL_FLOW_PHASE = "INITIAL_STAGE"
ROTATION_FLOW_PHASE = "ROTATION_STAGE"
FINISHED_FLOW_PHASE = "FINISHED"
PRE_MATCH_STATUSES = [MatchStatus.SCHEDULED.value, "NOT_STARTED"]
INITIAL_STAGE_MATCHES = {"INITIAL_MATCH", "SEMIFINAL"}
logger = logging.getLogger(__name__)


class SessionMatchFlowService:
    def __init__(self, db: Session):
        self.db = db

    def create_initial_matches(self, session_id: uuid.UUID) -> list[Match]:
        session = self._require_session(session_id)
        if self.db.query(Match).filter(Match.session_id == session_id).count():
            raise HTTPException(status_code=400, detail="This session already has generated matches")

        teams = self._ordered_teams(session_id)
        if len(teams) not in {2, 3, 4}:
            raise HTTPException(status_code=400, detail="Match generation requires 2, 3 or 4 teams")

        self._reset_queue_state(session, teams)
        matches: list[Match] = []

        if len(teams) == 4:
            matches.append(self._add_match(session, teams[0].id, teams[1].id, "INITIAL_MATCH", 1, 1, "Jogo 1"))
            matches.append(self._add_match(session, teams[2].id, teams[3].id, "INITIAL_MATCH", 1, 2, "Jogo 2"))
        elif len(teams) == 3:
            pairs = [
                (teams[0].id, teams[1].id, "Rodada 1", 1),
                (teams[1].id, teams[2].id, "Rodada 2", 2),
                (teams[0].id, teams[2].id, "Rodada 3", 3),
            ]
            for home_team_id, away_team_id, label, sequence in pairs:
                matches.append(self._add_match(session, home_team_id, away_team_id, "ROUND_ROBIN", 1, sequence, label))
        else:
            matches.append(self._add_match(session, teams[0].id, teams[1].id, "FINAL", 1, 1, "Final"))

        self.db.flush()
        return self._ordered_matches(session_id)

    def maybe_create_winners_match(self, session_id: uuid.UUID) -> Match | None:
        session = self._require_session(session_id)
        if session.team_count != 4 or session.flow_phase != INITIAL_FLOW_PHASE:
            return None

        if self.db.query(Match).filter(Match.session_id == session_id, Match.stage == "WINNERS_MATCH").first():
            return None

        initial_matches = (
            self.db.query(Match)
            .filter(Match.session_id == session_id, Match.stage.in_(INITIAL_STAGE_MATCHES))
            .order_by(Match.sequence.asc())
            .all()
        )
        logger.info(
            "Evaluating third match progression",
            extra={
                "session_id": str(session_id),
                "flow_phase": session.flow_phase,
                "initial_matches": len(initial_matches),
                "match1_finished": len(initial_matches) > 0 and initial_matches[0].status == MatchStatus.FINISHED.value,
                "match2_finished": len(initial_matches) > 1 and initial_matches[1].status == MatchStatus.FINISHED.value,
            },
        )
        if len(initial_matches) < 2 or any(match.status != MatchStatus.FINISHED.value for match in initial_matches):
            return None
        if any(match.winner_team_id is None for match in initial_matches):
            return None

        winners_match = self._add_match(
            session,
            initial_matches[0].winner_team_id,
            initial_matches[1].winner_team_id,
            "WINNERS_MATCH",
            1,
            3,
            "Jogo 3",
        )
        self.db.flush()
        logger.info(
            "Third match created successfully",
            extra={
                "session_id": str(session_id),
                "match_id": str(winners_match.id),
                "home_team_id": str(winners_match.home_team_id),
                "away_team_id": str(winners_match.away_team_id),
            },
        )
        return winners_match

    def finalize_match_and_schedule_next(self, match_id: uuid.UUID) -> list[Match]:
        match = self.db.get(Match, match_id)
        if not match:
            raise HTTPException(status_code=404, detail="Match not found")
        if match.home_team_id is None or match.away_team_id is None:
            raise HTTPException(status_code=400, detail="Match does not yet have both teams assigned")
        if match.home_score == match.away_score:
            raise HTTPException(status_code=400, detail="This match must have a winner")

        match.winner_team_id = match.home_team_id if match.home_score > match.away_score else match.away_team_id
        match.loser_team_id = match.away_team_id if match.winner_team_id == match.home_team_id else match.home_team_id
        self.db.add(match)
        self.db.flush()
        logger.info(
            "Match finalized for session progression",
            extra={
                "match_id": str(match.id),
                "session_id": str(match.session_id),
                "stage": match.stage,
                "winner_team_id": str(match.winner_team_id),
                "loser_team_id": str(match.loser_team_id),
            },
        )

        session = self._require_session(match.session_id)
        if session.team_count != 4:
            return self._ordered_matches(session.id)

        if session.flow_phase == INITIAL_FLOW_PHASE:
            if match.stage in INITIAL_STAGE_MATCHES:
                self.maybe_create_winners_match(session.id)
            elif match.stage == "WINNERS_MATCH":
                self.start_rotation_stage(session.id)
        elif session.flow_phase == ROTATION_FLOW_PHASE and match.stage == "ROTATION":
            self._advance_rotation_stage(session, match)

        self.db.flush()
        return self._ordered_matches(session.id)

    def start_rotation_stage(self, session_id: uuid.UUID) -> Match | None:
        session = self._require_session(session_id)
        winners_match = (
            self.db.query(Match)
            .filter(Match.session_id == session_id, Match.stage == "WINNERS_MATCH")
            .first()
        )
        if not winners_match or winners_match.status != MatchStatus.FINISHED.value or not winners_match.winner_team_id or not winners_match.loser_team_id:
            raise HTTPException(status_code=400, detail="The winners match must be finished before starting rotation")

        initial_matches = (
            self.db.query(Match)
            .filter(Match.session_id == session_id, Match.stage.in_(INITIAL_STAGE_MATCHES))
            .order_by(Match.sequence.asc())
            .all()
        )
        waiting_team_ids = [
            match.loser_team_id
            for match in initial_matches
            if match.loser_team_id and match.loser_team_id != winners_match.winner_team_id
        ]
        waiting_team_ids.append(winners_match.loser_team_id)
        session.flow_phase = ROTATION_FLOW_PHASE
        session.current_staying_team_id = winners_match.winner_team_id

        challenger_team_id = waiting_team_ids.pop(0) if waiting_team_ids else None
        session.challenger_team_id = challenger_team_id
        self._persist_queue(session.id, waiting_team_ids)
        self.db.add(session)
        self.db.flush()
        logger.info(
            "Rotation stage started",
            extra={
                "session_id": str(session_id),
                "current_staying_team_id": str(session.current_staying_team_id),
                "challenger_team_id": str(session.challenger_team_id) if session.challenger_team_id else None,
                "queue_size": len(waiting_team_ids),
            },
        )

        if challenger_team_id is None:
            return None
        return self._create_rotation_match(session, winners_match.winner_team_id, challenger_team_id)

    def get_session_queue(self, session_id: uuid.UUID) -> list[SessionTeam]:
        return (
            self.db.query(SessionTeam)
            .filter(SessionTeam.session_id == session_id, SessionTeam.queue_order > 0)
            .order_by(SessionTeam.queue_order.asc(), SessionTeam.created_at.asc())
            .all()
        )

    def get_current_match(self, session_id: uuid.UUID) -> Match | None:
        live_match = (
            self.db.query(Match)
            .filter(Match.session_id == session_id, Match.status.in_([MatchStatus.LIVE.value, MatchStatus.HALF_TIME.value]))
            .order_by(Match.sequence.asc(), Match.created_at.asc())
            .first()
        )
        if live_match:
            return live_match
        return (
            self.db.query(Match)
            .filter(Match.session_id == session_id, Match.status.in_(PRE_MATCH_STATUSES))
            .order_by(Match.sequence.asc(), Match.created_at.asc())
            .first()
        )

    def get_next_match(self, session_id: uuid.UUID) -> Match | None:
        return (
            self.db.query(Match)
            .filter(Match.session_id == session_id, Match.status.in_(PRE_MATCH_STATUSES))
            .order_by(Match.sequence.asc(), Match.created_at.asc())
            .first()
        )

    def reconcile_session_flow(self, session_id: uuid.UUID) -> list[Match]:
        session = self._require_session(session_id)
        if session.team_count != 4 or session.flow_phase == FINISHED_FLOW_PHASE:
            return self._ordered_matches(session_id)

        winners_match = (
            self.db.query(Match)
            .filter(Match.session_id == session_id, Match.stage == "WINNERS_MATCH")
            .first()
        )
        if session.flow_phase == INITIAL_FLOW_PHASE:
            if not winners_match:
                self.maybe_create_winners_match(session_id)
                winners_match = (
                    self.db.query(Match)
                    .filter(Match.session_id == session_id, Match.stage == "WINNERS_MATCH")
                    .first()
                )
            if winners_match and winners_match.status == MatchStatus.FINISHED.value and winners_match.winner_team_id and winners_match.loser_team_id:
                has_rotation_match = (
                    self.db.query(Match)
                    .filter(Match.session_id == session_id, Match.stage == "ROTATION")
                    .first()
                )
                if not has_rotation_match:
                    self.start_rotation_stage(session_id)

        self.db.flush()
        return self._ordered_matches(session_id)

    def _advance_rotation_stage(self, session: LeagueSession, match: Match) -> Match | None:
        waiting_team_ids = [team.id for team in self.get_session_queue(session.id)]
        waiting_team_ids.append(match.loser_team_id)

        next_challenger_team_id = waiting_team_ids.pop(0) if waiting_team_ids else None
        session.current_staying_team_id = match.winner_team_id
        session.challenger_team_id = next_challenger_team_id
        self._persist_queue(session.id, waiting_team_ids)
        self.db.add(session)
        self.db.flush()

        if next_challenger_team_id is None:
            return None
        return self._create_rotation_match(session, match.winner_team_id, next_challenger_team_id)

    def _create_rotation_match(self, session: LeagueSession, staying_team_id: uuid.UUID, challenger_team_id: uuid.UUID) -> Match:
        next_sequence = self._next_sequence(session.id)
        return self._add_match(
            session,
            staying_team_id,
            challenger_team_id,
            "ROTATION",
            2,
            next_sequence,
            f"Rotacao {next_sequence - 3}",
        )

    def _add_match(
        self,
        session: LeagueSession,
        home_team_id: uuid.UUID,
        away_team_id: uuid.UUID,
        stage: str,
        round_number: int,
        sequence: int,
        label: str,
    ) -> Match:
        match = Match(
            league_id=session.league_id,
            session_id=session.id,
            home_team_id=home_team_id,
            away_team_id=away_team_id,
            status=MatchStatus.SCHEDULED.value,
            stage=stage,
            round_number=round_number,
            sequence=sequence,
            label=label,
            bracket_group="ROTATION" if stage == "ROTATION" else "INITIAL",
        )
        self.db.add(match)
        self.db.flush()
        return match

    def _persist_queue(self, session_id: uuid.UUID, waiting_team_ids: Sequence[uuid.UUID | None]) -> None:
        queue_by_team_id = {team.id: team for team in self._ordered_teams(session_id)}
        for team in queue_by_team_id.values():
            team.queue_order = 0
            self.db.add(team)

        for index, team_id in enumerate([item for item in waiting_team_ids if item], start=1):
            team = queue_by_team_id.get(team_id)
            if team:
                team.queue_order = index
                self.db.add(team)
        self.db.flush()

    def _reset_queue_state(self, session: LeagueSession, teams: Sequence[SessionTeam]) -> None:
        session.flow_phase = INITIAL_FLOW_PHASE
        session.current_staying_team_id = None
        session.challenger_team_id = None
        self.db.add(session)
        for index, team in enumerate(teams, start=1):
            team.queue_order = index if session.team_count == 4 else 0
            self.db.add(team)
        self.db.flush()

    def _next_sequence(self, session_id: uuid.UUID) -> int:
        latest_match = (
            self.db.query(Match)
            .filter(Match.session_id == session_id)
            .order_by(Match.sequence.desc(), Match.created_at.desc())
            .first()
        )
        return (latest_match.sequence if latest_match else 0) + 1

    def _ordered_matches(self, session_id: uuid.UUID) -> list[Match]:
        return (
            self.db.query(Match)
            .filter(Match.session_id == session_id)
            .order_by(Match.round_number.asc(), Match.sequence.asc(), Match.created_at.asc())
            .all()
        )

    def _ordered_teams(self, session_id: uuid.UUID) -> list[SessionTeam]:
        return (
            self.db.query(SessionTeam)
            .filter(SessionTeam.session_id == session_id)
            .order_by(SessionTeam.created_at.asc(), SessionTeam.name.asc())
            .all()
        )

    def _require_session(self, session_id: uuid.UUID) -> LeagueSession:
        session = self.db.get(LeagueSession, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
