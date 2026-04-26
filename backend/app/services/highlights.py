import uuid
from collections.abc import Sequence

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.enums import MatchEventType
from app.models.highlight import SessionHighlight, SessionPlayerScore, SessionTeamOfTheWeek, SessionTeamOfTheWeekPlayer
from app.models.match import Match, MatchEvent
from app.models.player import LeaguePlayer
from app.models.session import Session as LeagueSession
from app.models.session import SessionPlayer, SessionTeam, SessionTeamPlayer


SCORE_RULES = {
    MatchEventType.GOAL: 5,
    MatchEventType.ASSIST: 3,
    MatchEventType.FOUL: -1,
    MatchEventType.YELLOW_CARD: -2,
    MatchEventType.RED_CARD: -5,
}
WIN_BONUS = 1


def _empty_score_row(*, league_id: uuid.UUID, session_id: uuid.UUID, player_id: uuid.UUID) -> dict:
    return {
        "league_id": league_id,
        "session_id": session_id,
        "player_id": player_id,
        "goals": 0,
        "assists": 0,
        "fouls": 0,
        "yellow_cards": 0,
        "red_cards": 0,
        "wins": 0,
        "matches_played": 0,
        "total_score": 0,
        "average_score": 0,
        "rank_position": 0,
    }


class HighlightService:
    def __init__(self, db: Session):
        self.db = db

    def calculate_session_highlights(self, session_id: uuid.UUID) -> SessionHighlight:
        session = self.db.get(LeagueSession, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        player_scores = self.calculate_player_scores(session_id)
        top_scorer = self.get_top_scorer(player_scores)
        top_assist = self.get_top_assist_player(player_scores)
        best_average = self.get_best_average_player(player_scores)
        best_player = best_average or self.get_best_player(player_scores)
        team_of_the_week_players = self.get_team_of_the_week(session, player_scores)

        highlight = (
            self.db.query(SessionHighlight)
            .filter(SessionHighlight.session_id == session_id)
            .first()
        )
        if not highlight:
            highlight = SessionHighlight(
                league_id=session.league_id,
                session_id=session.id,
            )
            self.db.add(highlight)
            self.db.flush()

        highlight.best_average_player_id = best_average.player_id if best_average else None
        highlight.top_scorer_id = top_scorer.player_id if top_scorer else None
        highlight.top_assist_player_id = top_assist.player_id if top_assist else None
        highlight.best_player_id = best_player.player_id if best_player else None
        self.db.add(highlight)
        self.db.flush()

        self._persist_team_of_the_week(
            session=session,
            highlight=highlight,
            players=team_of_the_week_players,
        )
        self.db.flush()
        return highlight

    def calculate_player_scores(self, session_id: uuid.UUID) -> list[SessionPlayerScore]:
        session = self.db.get(LeagueSession, session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")

        confirmed_rows = (
            self.db.query(SessionPlayer.player_id)
            .filter(
                SessionPlayer.session_id == session_id,
                SessionPlayer.is_confirmed.is_(True),
            )
            .all()
        )
        aggregate_map: dict[uuid.UUID, dict] = {
            player_id: _empty_score_row(
                league_id=session.league_id,
                session_id=session_id,
                player_id=player_id,
            )
            for player_id, in confirmed_rows
        }
        team_by_player_id = self._get_session_team_by_player(session_id)
        finished_matches = (
            self.db.query(Match)
            .filter(Match.session_id == session_id, Match.status == "FINISHED")
            .all()
        )
        for match in finished_matches:
            if not match.home_team_id or not match.away_team_id:
                continue
            winner_team_id = match.winner_team_id
            for player_id, team_id in team_by_player_id.items():
                if team_id not in {match.home_team_id, match.away_team_id}:
                    continue
                row = aggregate_map.setdefault(
                    player_id,
                    _empty_score_row(league_id=session.league_id, session_id=session_id, player_id=player_id),
                )
                row["matches_played"] += 1
                if winner_team_id and team_id == winner_team_id:
                    row["wins"] += 1
                    row["total_score"] += WIN_BONUS

        events = (
            self.db.query(MatchEvent)
            .join(Match, Match.id == MatchEvent.match_id)
            .filter(
                Match.session_id == session_id,
                MatchEvent.is_reverted.is_(False),
            )
            .all()
        )

        for event in events:
            if event.event_type == MatchEventType.GOAL and event.player_id:
                row = aggregate_map.setdefault(
                    event.player_id,
                    _empty_score_row(league_id=session.league_id, session_id=session_id, player_id=event.player_id),
                )
                row["goals"] += 1
                row["total_score"] += SCORE_RULES[MatchEventType.GOAL]
            if event.event_type == MatchEventType.ASSIST and event.player_id:
                row = aggregate_map.setdefault(
                    event.player_id,
                    _empty_score_row(league_id=session.league_id, session_id=session_id, player_id=event.player_id),
                )
                row["assists"] += 1
                row["total_score"] += SCORE_RULES[MatchEventType.ASSIST]
            if event.event_type == MatchEventType.GOAL and event.related_player_id:
                row = aggregate_map.setdefault(
                    event.related_player_id,
                    _empty_score_row(league_id=session.league_id, session_id=session_id, player_id=event.related_player_id),
                )
                row["assists"] += 1
                row["total_score"] += SCORE_RULES[MatchEventType.ASSIST]
            if event.event_type == MatchEventType.FOUL and event.player_id:
                row = aggregate_map.setdefault(
                    event.player_id,
                    _empty_score_row(league_id=session.league_id, session_id=session_id, player_id=event.player_id),
                )
                row["fouls"] += 1
                row["total_score"] += SCORE_RULES[MatchEventType.FOUL]
            if event.event_type in {MatchEventType.CARD, MatchEventType.YELLOW_CARD} and event.player_id:
                row = aggregate_map.setdefault(
                    event.player_id,
                    _empty_score_row(league_id=session.league_id, session_id=session_id, player_id=event.player_id),
                )
                row["yellow_cards"] += 1
                row["total_score"] += SCORE_RULES[MatchEventType.YELLOW_CARD]
            if event.event_type == MatchEventType.RED_CARD and event.player_id:
                row = aggregate_map.setdefault(
                    event.player_id,
                    _empty_score_row(league_id=session.league_id, session_id=session_id, player_id=event.player_id),
                )
                row["red_cards"] += 1
                row["total_score"] += SCORE_RULES[MatchEventType.RED_CARD]

        for row in aggregate_map.values():
            row["average_score"] = round(row["total_score"] / row["matches_played"]) if row["matches_played"] else 0
        ranked_rows = sorted(
            aggregate_map.values(),
            key=lambda row: (
                row["total_score"],
                row["average_score"],
                row["goals"],
                row["assists"],
                -(row["yellow_cards"] + row["red_cards"]),
            ),
            reverse=True,
        )
        persisted_rows = self._persist_player_scores(session, ranked_rows)
        return persisted_rows

    def get_best_average_player(self, player_scores: Sequence[SessionPlayerScore]) -> SessionPlayerScore | None:
        eligible = [row for row in player_scores if row.matches_played > 0]
        if not eligible:
            return None
        ranked = sorted(
            eligible,
            key=lambda row: (
                row.average_score,
                row.total_score,
                row.goals,
                row.assists,
                -(row.yellow_cards + row.red_cards),
            ),
            reverse=True,
        )
        return ranked[0]

    def get_top_scorer(self, player_scores: Sequence[SessionPlayerScore]) -> SessionPlayerScore | None:
        if not player_scores:
            return None
        ranked = sorted(
            player_scores,
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

    def get_top_assist_player(self, player_scores: Sequence[SessionPlayerScore]) -> SessionPlayerScore | None:
        if not player_scores:
            return None
        ranked = sorted(
            player_scores,
            key=lambda row: (
                row.assists,
                row.goals,
                -(row.yellow_cards + row.red_cards),
                row.average_score,
                row.total_score,
            ),
            reverse=True,
        )
        leader = ranked[0]
        return leader if leader.assists > 0 else None

    def get_best_player(self, player_scores: Sequence[SessionPlayerScore]) -> SessionPlayerScore | None:
        if not player_scores:
            return None
        ranked = sorted(
            player_scores,
            key=lambda row: (
                row.total_score,
                row.average_score,
                row.goals,
                row.assists,
                -(row.yellow_cards + row.red_cards),
            ),
            reverse=True,
        )
        leader = ranked[0]
        if leader.total_score <= 0 and not (leader.goals or leader.assists):
            return None
        return leader

    def get_team_of_the_week(
        self,
        session: LeagueSession,
        player_scores: Sequence[SessionPlayerScore],
    ) -> list[SessionPlayerScore]:
        if not player_scores:
            return []

        confirmed_count = (
            self.db.query(SessionPlayer)
            .filter(SessionPlayer.session_id == session.id, SessionPlayer.is_confirmed.is_(True))
            .count()
        )
        selection_size = session.team_size or max(5, round(confirmed_count / max(session.team_count, 1)))
        selection_size = max(1, min(selection_size, len(player_scores)))
        ranked = sorted(
            player_scores,
            key=lambda row: (
                row.total_score,
                row.average_score,
                row.goals,
                row.assists,
                -(row.yellow_cards + row.red_cards),
            ),
            reverse=True,
        )
        return list(ranked[:selection_size])

    def get_session_highlights(self, session_id: uuid.UUID) -> SessionHighlight | None:
        return (
            self.db.query(SessionHighlight)
            .filter(SessionHighlight.session_id == session_id)
            .first()
        )

    def get_latest_session_highlights(self, league_id: uuid.UUID) -> SessionHighlight | None:
        return (
            self.db.query(SessionHighlight)
            .join(LeagueSession, LeagueSession.id == SessionHighlight.session_id)
            .filter(SessionHighlight.league_id == league_id)
            .order_by(LeagueSession.scheduled_at.desc(), SessionHighlight.created_at.desc())
            .first()
        )

    def get_session_highlights_payload(self, session_id: uuid.UUID) -> dict | None:
        highlight = self.get_session_highlights(session_id)
        if not highlight:
            return None
        return self._build_highlights_payload(highlight)

    def get_latest_session_highlights_payload(self, league_id: uuid.UUID) -> dict | None:
        highlight = self.get_latest_session_highlights(league_id)
        if not highlight:
            return None
        return self._build_highlights_payload(highlight)

    def _persist_player_scores(
        self,
        session: LeagueSession,
        ranked_rows: Sequence[dict],
    ) -> list[SessionPlayerScore]:
        existing_rows = {
            item.player_id: item
            for item in (
                self.db.query(SessionPlayerScore)
                .filter(SessionPlayerScore.session_id == session.id)
                .all()
            )
        }
        seen_player_ids: set[uuid.UUID] = set()
        persisted: list[SessionPlayerScore] = []

        for index, row in enumerate(ranked_rows, start=1):
            payload = dict(row)
            payload["rank_position"] = index
            seen_player_ids.add(payload["player_id"])
            existing = existing_rows.get(payload["player_id"])
            if existing:
                for field, value in payload.items():
                    setattr(existing, field, value)
                score_row = existing
            else:
                score_row = SessionPlayerScore(**payload)
                self.db.add(score_row)
            persisted.append(score_row)

        for player_id, item in existing_rows.items():
            if player_id not in seen_player_ids:
                self.db.delete(item)

        self.db.flush()
        return (
            self.db.query(SessionPlayerScore)
            .filter(SessionPlayerScore.session_id == session.id)
            .order_by(SessionPlayerScore.rank_position.asc(), SessionPlayerScore.created_at.asc())
            .all()
        )

    def _persist_team_of_the_week(
        self,
        *,
        session: LeagueSession,
        highlight: SessionHighlight,
        players: Sequence[SessionPlayerScore],
    ) -> SessionTeamOfTheWeek:
        team = (
            self.db.query(SessionTeamOfTheWeek)
            .filter(SessionTeamOfTheWeek.session_id == session.id)
            .first()
        )
        if not team:
            team = SessionTeamOfTheWeek(
                league_id=session.league_id,
                session_id=session.id,
            )
            self.db.add(team)
            self.db.flush()

        team.highlight_id = highlight.id
        self.db.add(team)
        self.db.flush()

        self.db.query(SessionTeamOfTheWeekPlayer).filter(
            SessionTeamOfTheWeekPlayer.team_id == team.id
        ).delete(synchronize_session=False)
        self.db.flush()

        for index, player_score in enumerate(players, start=1):
            self.db.add(
                SessionTeamOfTheWeekPlayer(
                    league_id=session.league_id,
                    team_id=team.id,
                    player_id=player_score.player_id,
                    score=player_score.total_score,
                    goals=player_score.goals,
                    assists=player_score.assists,
                    rank_position=index,
                )
            )
        self.db.flush()
        return team

    def _build_highlights_payload(self, highlight: SessionHighlight) -> dict:
        player_scores = (
            self.db.query(SessionPlayerScore)
            .join(LeaguePlayer, LeaguePlayer.id == SessionPlayerScore.player_id)
            .filter(SessionPlayerScore.session_id == highlight.session_id)
            .order_by(SessionPlayerScore.rank_position.asc(), SessionPlayerScore.created_at.asc())
            .all()
        )
        score_map = {row.player_id: row for row in player_scores}
        team = (
            self.db.query(SessionTeamOfTheWeek)
            .filter(SessionTeamOfTheWeek.session_id == highlight.session_id)
            .first()
        )
        team_players = (
            self.db.query(SessionTeamOfTheWeekPlayer)
            .join(LeaguePlayer, LeaguePlayer.id == SessionTeamOfTheWeekPlayer.player_id)
            .filter(SessionTeamOfTheWeekPlayer.team_id == team.id)
            .order_by(SessionTeamOfTheWeekPlayer.rank_position.asc(), SessionTeamOfTheWeekPlayer.created_at.asc())
            .all()
        ) if team else []

        return {
            "id": highlight.id,
            "created_at": highlight.created_at,
            "updated_at": highlight.updated_at,
            "league_id": highlight.league_id,
            "session_id": highlight.session_id,
            "best_average_player_id": highlight.best_average_player_id,
            "top_scorer_id": highlight.top_scorer_id,
            "top_assist_player_id": highlight.top_assist_player_id,
            "best_player_id": highlight.best_player_id,
            "best_average_player": self._serialize_highlight_player(score_map.get(highlight.best_average_player_id)) if highlight.best_average_player_id else None,
            "top_scorer": self._serialize_highlight_player(score_map.get(highlight.top_scorer_id)) if highlight.top_scorer_id else None,
            "top_assist_player": self._serialize_highlight_player(score_map.get(highlight.top_assist_player_id)) if highlight.top_assist_player_id else None,
            "best_player": self._serialize_highlight_player(score_map.get(highlight.best_player_id)) if highlight.best_player_id else None,
            "team_of_the_week": {
                "id": team.id,
                "created_at": team.created_at,
                "updated_at": team.updated_at,
                "league_id": team.league_id,
                "session_id": team.session_id,
                "highlight_id": team.highlight_id,
                "players": [
                    {
                        "id": item.id,
                        "created_at": item.created_at,
                        "updated_at": item.updated_at,
                        "team_id": item.team_id,
                        "player_id": item.player_id,
                        "player_name": item.player.name,
                        "player_nickname": item.player.nickname,
                        "score": item.score,
                        "goals": item.goals,
                        "assists": item.assists,
                        "rank_position": item.rank_position,
                    }
                    for item in team_players
                ],
            } if team else None,
            "player_scores": [self._serialize_score_row(item) for item in player_scores],
        }

    def _serialize_highlight_player(self, row: SessionPlayerScore | None) -> dict | None:
        if not row:
            return None
        return {
            "player_id": row.player_id,
            "player_name": row.player.name,
            "player_nickname": row.player.nickname,
            "goals": row.goals,
            "assists": row.assists,
            "fouls": row.fouls,
            "yellow_cards": row.yellow_cards,
            "red_cards": row.red_cards,
            "wins": row.wins,
            "matches_played": row.matches_played,
            "total_score": row.total_score,
            "average_score": row.average_score,
            "rank_position": row.rank_position,
        }

    def _serialize_score_row(self, row: SessionPlayerScore) -> dict:
        return {
            "id": row.id,
            "created_at": row.created_at,
            "updated_at": row.updated_at,
            "league_id": row.league_id,
            "session_id": row.session_id,
            "player_id": row.player_id,
            "player_name": row.player.name,
            "player_nickname": row.player.nickname,
            "goals": row.goals,
            "assists": row.assists,
            "fouls": row.fouls,
            "yellow_cards": row.yellow_cards,
            "red_cards": row.red_cards,
            "wins": row.wins,
            "matches_played": row.matches_played,
            "total_score": row.total_score,
            "average_score": row.average_score,
            "rank_position": row.rank_position,
        }

    def _get_session_team_by_player(self, session_id: uuid.UUID) -> dict[uuid.UUID, uuid.UUID]:
        rows = (
            self.db.query(SessionTeamPlayer.player_id, SessionTeamPlayer.team_id)
            .join(SessionTeam, SessionTeam.id == SessionTeamPlayer.team_id)
            .filter(SessionTeam.session_id == session_id)
            .all()
        )
        return {player_id: team_id for player_id, team_id in rows}
