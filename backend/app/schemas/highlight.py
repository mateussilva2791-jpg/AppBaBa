import uuid

from pydantic import BaseModel

from app.schemas.common import EntityResponse


class SessionPlayerScoreRead(EntityResponse):
    league_id: uuid.UUID
    session_id: uuid.UUID
    player_id: uuid.UUID
    player_name: str
    player_nickname: str | None = None
    goals: int
    assists: int
    fouls: int
    yellow_cards: int
    red_cards: int
    wins: int
    matches_played: int
    total_score: int
    average_score: int
    rank_position: int


class SessionHighlightPlayerRead(BaseModel):
    player_id: uuid.UUID
    player_name: str
    player_nickname: str | None = None
    goals: int
    assists: int
    fouls: int
    yellow_cards: int
    red_cards: int
    wins: int
    matches_played: int
    total_score: int
    average_score: int
    rank_position: int


class SessionTeamOfTheWeekPlayerRead(EntityResponse):
    team_id: uuid.UUID
    player_id: uuid.UUID
    player_name: str
    player_nickname: str | None = None
    score: int
    goals: int
    assists: int
    rank_position: int


class SessionTeamOfTheWeekRead(EntityResponse):
    league_id: uuid.UUID
    session_id: uuid.UUID
    highlight_id: uuid.UUID | None = None
    players: list[SessionTeamOfTheWeekPlayerRead]


class SessionHighlightsRead(EntityResponse):
    league_id: uuid.UUID
    session_id: uuid.UUID
    best_average_player_id: uuid.UUID | None = None
    top_scorer_id: uuid.UUID | None = None
    top_assist_player_id: uuid.UUID | None = None
    best_player_id: uuid.UUID | None = None
    best_average_player: SessionHighlightPlayerRead | None = None
    top_scorer: SessionHighlightPlayerRead | None = None
    top_assist_player: SessionHighlightPlayerRead | None = None
    best_player: SessionHighlightPlayerRead | None = None
    team_of_the_week: SessionTeamOfTheWeekRead | None = None
    player_scores: list[SessionPlayerScoreRead]
