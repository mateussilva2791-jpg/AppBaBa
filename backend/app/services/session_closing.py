import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.enums import MatchStatus, SessionStatus
from app.models.highlight import SessionPlayerScore
from app.models.match import Match
from app.models.player import LeaguePlayer
from app.models.session import Session as LeagueSession
from app.models.session import SessionTeam, SessionTeamPlayer
from app.models.session_summary import SessionSummary, SessionSummaryPlayer, SessionSummaryTeam
from app.services.highlights import HighlightService
from app.services.ranking import recalculate_ranking
from app.services.session_match_flow import FINISHED_FLOW_PHASE


class SessionClosingService:
    def __init__(self, db: Session):
        self.db = db
        self.highlight_service = HighlightService(db)

    def close_session(self, session_id: uuid.UUID, user_id: uuid.UUID | None = None) -> dict:
        session = self._require_session(session_id)
        if session.status == SessionStatus.FINISHED.value or session.flow_phase == FINISHED_FLOW_PHASE:
            raise HTTPException(status_code=400, detail="This session is already finished")

        matches = self._playable_matches(session_id)
        if not matches:
            raise HTTPException(status_code=400, detail="Session has no playable matches to close")

        unfinished_matches = (
            self.db.query(Match)
            .filter(
                Match.session_id == session_id,
                Match.home_team_id.is_not(None),
                Match.away_team_id.is_not(None),
                Match.status != MatchStatus.FINISHED.value,
            )
            .all()
        )
        locked_match_ids = self._lock_open_matches(unfinished_matches)

        recalculate_ranking(self.db, session.league_id)
        self.highlight_service.calculate_session_highlights(session_id)
        player_metrics = self.calculate_session_player_metrics(session_id)
        team_metrics = self.calculate_session_team_metrics(session_id, player_metrics)
        summary = self.persist_session_summary(session_id, player_metrics=player_metrics, team_metrics=team_metrics)

        session.status = SessionStatus.FINISHED.value
        session.flow_phase = FINISHED_FLOW_PHASE
        self.db.add(session)
        self.db.flush()

        return {
            "session": session,
            "matches_finished": len(self._finished_playable_matches(session_id)),
            "matches_locked": len(locked_match_ids),
            "total_goals": summary.total_goals,
            "champion_team_id": self._resolve_champion_team_id(team_metrics),
            "highlights": self.highlight_service.get_session_highlights_payload(session_id),
            "summary": self.get_session_summary_payload(session_id),
        }

    def calculate_session_player_metrics(self, session_id: uuid.UUID) -> list[SessionPlayerScore]:
        return self.highlight_service.calculate_player_scores(session_id)

    def calculate_session_team_metrics(
        self,
        session_id: uuid.UUID,
        player_metrics: Sequence[SessionPlayerScore] | None = None,
    ) -> list[dict]:
        session = self._require_session(session_id)
        player_metrics = list(player_metrics or self.calculate_session_player_metrics(session_id))
        player_score_map = {row.player_id: row for row in player_metrics}
        teams = (
            self.db.query(SessionTeam)
            .filter(SessionTeam.session_id == session_id)
            .order_by(SessionTeam.created_at.asc(), SessionTeam.name.asc())
            .all()
        )
        metrics_map: dict[uuid.UUID, dict] = {
            team.id: {
                "team_id": team.id,
                "team_name": team.name,
                "team_color": team.color,
                "wins": 0,
                "losses": 0,
                "draws": 0,
                "matches_played": 0,
                "goals_for": 0,
                "goals_against": 0,
                "goal_difference": 0,
                "team_score": 0,
                "points": 0,
                "rank_position": 0,
            }
            for team in teams
        }

        finished_matches = self._finished_playable_matches(session_id)
        for match in finished_matches:
            if match.home_team_id:
                home = metrics_map[match.home_team_id]
                home["matches_played"] += 1
                home["goals_for"] += match.home_score
                home["goals_against"] += match.away_score
                if match.home_score > match.away_score:
                    home["wins"] += 1
                    home["points"] += 3
                elif match.home_score < match.away_score:
                    home["losses"] += 1
                else:
                    home["draws"] += 1
                    home["points"] += 1
            if match.away_team_id:
                away = metrics_map[match.away_team_id]
                away["matches_played"] += 1
                away["goals_for"] += match.away_score
                away["goals_against"] += match.home_score
                if match.away_score > match.home_score:
                    away["wins"] += 1
                    away["points"] += 3
                elif match.away_score < match.home_score:
                    away["losses"] += 1
                else:
                    away["draws"] += 1
                    away["points"] += 1

        assignment_rows = (
            self.db.query(SessionTeamPlayer.team_id, SessionTeamPlayer.player_id)
            .join(SessionTeam, SessionTeam.id == SessionTeamPlayer.team_id)
            .filter(SessionTeam.session_id == session_id)
            .all()
        )
        for team_id, player_id in assignment_rows:
            metric = metrics_map.get(team_id)
            score_row = player_score_map.get(player_id)
            if metric and score_row:
                metric["team_score"] += score_row.total_score

        ranked = sorted(
            metrics_map.values(),
            key=lambda item: (
                item["wins"],
                item["goal_difference"],
                item["goals_for"],
                item["team_score"],
                -item["losses"],
            ),
            reverse=True,
        )
        for metric in ranked:
            metric["goal_difference"] = metric["goals_for"] - metric["goals_against"]
        ranked = sorted(
            metrics_map.values(),
            key=lambda item: (
                item["wins"],
                item["goal_difference"],
                item["goals_for"],
                item["team_score"],
                -item["losses"],
            ),
            reverse=True,
        )
        for index, metric in enumerate(ranked, start=1):
            metric["rank_position"] = index
        return ranked

    def get_top_scorer(self, player_metrics: Sequence[SessionPlayerScore]) -> SessionPlayerScore | None:
        if not player_metrics:
            return None
        ranked = sorted(
            player_metrics,
            key=lambda row: (
                row.goals,
                row.assists,
                -(row.yellow_cards + row.red_cards),
                row.average_score,
                row.total_score,
            ),
            reverse=True,
        )
        leader = ranked[0]
        return leader if leader.goals > 0 else None

    def get_best_player(self, player_metrics: Sequence[SessionPlayerScore]) -> SessionPlayerScore | None:
        if not player_metrics:
            return None
        ranked = sorted(
            player_metrics,
            key=lambda row: (
                row.total_score,
                row.average_score,
                row.goals,
                row.assists,
                -(row.yellow_cards + row.red_cards),
                row.wins,
            ),
            reverse=True,
        )
        leader = ranked[0]
        if leader.total_score <= 0 and not (leader.goals or leader.assists):
            return None
        return leader

    def get_best_team(self, team_metrics: Sequence[dict]) -> dict | None:
        if not team_metrics:
            return None
        ranked = sorted(
            team_metrics,
            key=lambda item: (
                item["wins"],
                item["goal_difference"],
                item["goals_for"],
                item["team_score"],
                -item["losses"],
            ),
            reverse=True,
        )
        return ranked[0]

    def get_team_with_most_wins(self, team_metrics: Sequence[dict]) -> dict | None:
        if not team_metrics:
            return None
        ranked = sorted(
            team_metrics,
            key=lambda item: (
                item["wins"],
                item["goal_difference"],
                item["goals_for"],
                -item["losses"],
                item["team_score"],
            ),
            reverse=True,
        )
        return ranked[0]

    def persist_session_summary(
        self,
        session_id: uuid.UUID,
        *,
        player_metrics: Sequence[SessionPlayerScore] | None = None,
        team_metrics: Sequence[dict] | None = None,
    ) -> SessionSummary:
        session = self._require_session(session_id)
        player_metrics = list(player_metrics or self.calculate_session_player_metrics(session_id))
        team_metrics = list(team_metrics or self.calculate_session_team_metrics(session_id, player_metrics))
        top_scorer = self.get_top_scorer(player_metrics)
        best_player = self.get_best_player(player_metrics)
        best_team = self.get_best_team(team_metrics)
        most_wins_team = self.get_team_with_most_wins(team_metrics)
        total_goals = sum(metric.goals for metric in player_metrics)

        summary = (
            self.db.query(SessionSummary)
            .filter(SessionSummary.session_id == session_id)
            .first()
        )
        if not summary:
            summary = SessionSummary(league_id=session.league_id, session_id=session_id)
            self.db.add(summary)
            self.db.flush()

        summary.total_goals = total_goals
        summary.top_scorer_player_id = top_scorer.player_id if top_scorer else None
        summary.best_player_id = best_player.player_id if best_player else None
        summary.best_team_id = best_team["team_id"] if best_team else None
        summary.most_wins_team_id = most_wins_team["team_id"] if most_wins_team else None
        self.db.add(summary)
        self.db.flush()

        self.db.query(SessionSummaryPlayer).filter(
            SessionSummaryPlayer.session_summary_id == summary.id
        ).delete(synchronize_session=False)
        self.db.query(SessionSummaryTeam).filter(
            SessionSummaryTeam.session_summary_id == summary.id
        ).delete(synchronize_session=False)
        self.db.flush()

        for row in player_metrics:
            self.db.add(
                SessionSummaryPlayer(
                    league_id=session.league_id,
                    session_summary_id=summary.id,
                    player_id=row.player_id,
                    score=row.total_score,
                    average_score=row.average_score,
                    goals=row.goals,
                    assists=row.assists,
                    fouls=row.fouls,
                    yellow_cards=row.yellow_cards,
                    red_cards=row.red_cards,
                    wins=row.wins,
                    matches_played=row.matches_played,
                    rank_position=row.rank_position,
                )
            )

        for row in team_metrics:
            self.db.add(
                SessionSummaryTeam(
                    league_id=session.league_id,
                    session_summary_id=summary.id,
                    team_id=row["team_id"],
                    wins=row["wins"],
                    losses=row["losses"],
                    draws=row["draws"],
                    matches_played=row["matches_played"],
                    goals_for=row["goals_for"],
                    goals_against=row["goals_against"],
                    goal_difference=row["goal_difference"],
                    team_score=row["team_score"],
                    points=row["points"],
                    rank_position=row["rank_position"],
                )
            )
        self.db.flush()
        return summary

    def get_session_summary_payload(self, session_id: uuid.UUID) -> dict | None:
        summary = (
            self.db.query(SessionSummary)
            .filter(SessionSummary.session_id == session_id)
            .first()
        )
        if not summary:
            return None

        player_rows = (
            self.db.query(SessionSummaryPlayer)
            .join(LeaguePlayer, LeaguePlayer.id == SessionSummaryPlayer.player_id)
            .filter(SessionSummaryPlayer.session_summary_id == summary.id)
            .order_by(SessionSummaryPlayer.rank_position.asc(), SessionSummaryPlayer.created_at.asc())
            .all()
        )
        team_rows = (
            self.db.query(SessionSummaryTeam)
            .join(SessionTeam, SessionTeam.id == SessionSummaryTeam.team_id)
            .filter(SessionSummaryTeam.session_summary_id == summary.id)
            .order_by(SessionSummaryTeam.rank_position.asc(), SessionSummaryTeam.created_at.asc())
            .all()
        )
        player_map = {row.player_id: row for row in player_rows}
        team_map = {row.team_id: row for row in team_rows}

        return {
            "id": summary.id,
            "created_at": summary.created_at,
            "updated_at": summary.updated_at,
            "league_id": summary.league_id,
            "session_id": summary.session_id,
            "total_goals": summary.total_goals,
            "top_scorer_player_id": summary.top_scorer_player_id,
            "best_player_id": summary.best_player_id,
            "best_team_id": summary.best_team_id,
            "most_wins_team_id": summary.most_wins_team_id,
            "top_scorer": self._serialize_summary_player_highlight(player_map.get(summary.top_scorer_player_id)),
            "best_player": self._serialize_summary_player_highlight(player_map.get(summary.best_player_id)),
            "best_team": self._serialize_summary_team_highlight(team_map.get(summary.best_team_id)),
            "most_wins_team": self._serialize_summary_team_highlight(team_map.get(summary.most_wins_team_id)),
            "players": [self._serialize_summary_player(row) for row in player_rows],
            "teams": [self._serialize_summary_team(row) for row in team_rows],
        }

    def _serialize_summary_player_highlight(self, row: SessionSummaryPlayer | None) -> dict | None:
        if not row:
            return None
        return {
            "id": row.id,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
            "player_id": row.player_id,
            "player_name": row.player.name,
            "player_nickname": row.player.nickname,
            "team_id": None,
            "team_name": None,
            "team_color": None,
            "score": row.score,
            "average_score": row.average_score,
            "goals": row.goals,
            "assists": row.assists,
            "wins": row.wins,
            "goal_difference": None,
            "points": None,
        }

    def _serialize_summary_team_highlight(self, row: SessionSummaryTeam | None) -> dict | None:
        if not row:
            return None
        return {
            "id": row.id,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
            "player_id": None,
            "player_name": None,
            "player_nickname": None,
            "team_id": row.team_id,
            "team_name": row.team.name,
            "team_color": row.team.color,
            "score": row.team_score,
            "average_score": None,
            "goals": row.goals_for,
            "assists": None,
            "wins": row.wins,
            "goal_difference": row.goal_difference,
            "points": row.points,
        }

    def _serialize_summary_player(self, row: SessionSummaryPlayer) -> dict:
        return {
            "id": row.id,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
            "session_summary_id": row.session_summary_id,
            "player_id": row.player_id,
            "player_name": row.player.name,
            "player_nickname": row.player.nickname,
            "score": row.score,
            "average_score": row.average_score,
            "goals": row.goals,
            "assists": row.assists,
            "fouls": row.fouls,
            "yellow_cards": row.yellow_cards,
            "red_cards": row.red_cards,
            "wins": row.wins,
            "matches_played": row.matches_played,
            "rank_position": row.rank_position,
        }

    def _serialize_summary_team(self, row: SessionSummaryTeam) -> dict:
        return {
            "id": row.id,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
            "session_summary_id": row.session_summary_id,
            "team_id": row.team_id,
            "team_name": row.team.name,
            "team_color": row.team.color,
            "wins": row.wins,
            "losses": row.losses,
            "draws": row.draws,
            "matches_played": row.matches_played,
            "goals_for": row.goals_for,
            "goals_against": row.goals_against,
            "goal_difference": row.goal_difference,
            "team_score": row.team_score,
            "points": row.points,
            "rank_position": row.rank_position,
        }

    def _finished_playable_matches(self, session_id: uuid.UUID) -> list[Match]:
        return (
            self.db.query(Match)
            .filter(
                Match.session_id == session_id,
                Match.home_team_id.is_not(None),
                Match.away_team_id.is_not(None),
                Match.status == MatchStatus.FINISHED.value,
            )
            .order_by(Match.round_number.asc(), Match.sequence.asc(), Match.created_at.asc())
            .all()
        )

    def _playable_matches(self, session_id: uuid.UUID) -> list[Match]:
        return (
            self.db.query(Match)
            .filter(
                Match.session_id == session_id,
                Match.home_team_id.is_not(None),
                Match.away_team_id.is_not(None),
            )
            .order_by(Match.round_number.asc(), Match.sequence.asc(), Match.created_at.asc())
            .all()
        )

    def _lock_open_matches(self, matches: Sequence[Match]) -> list[uuid.UUID]:
        locked_ids: list[uuid.UUID] = []
        now = datetime.now(UTC)
        for match in matches:
            match.is_clock_running = False
            match.period_started_at = None
            if match.status in {MatchStatus.LIVE.value, MatchStatus.HALF_TIME.value} and match.finished_at is None:
                match.finished_at = now
            self.db.add(match)
            locked_ids.append(match.id)
        self.db.flush()
        return locked_ids

    def _resolve_champion_team_id(self, team_metrics: Sequence[dict]) -> uuid.UUID | None:
        leader = self.get_best_team(team_metrics)
        return leader["team_id"] if leader else None

    def _require_session(self, session_id: uuid.UUID) -> LeagueSession:
        session = self.db.get(LeagueSession, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
        return session
