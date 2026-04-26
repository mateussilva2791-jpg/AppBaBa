import uuid

from app.schemas.common import EntityResponse


class SessionSummaryPlayerRead(EntityResponse):
    session_summary_id: uuid.UUID
    player_id: uuid.UUID
    player_name: str
    player_nickname: str | None = None
    score: int
    average_score: int
    goals: int
    assists: int
    fouls: int
    yellow_cards: int
    red_cards: int
    wins: int
    matches_played: int
    rank_position: int


class SessionSummaryTeamRead(EntityResponse):
    session_summary_id: uuid.UUID
    team_id: uuid.UUID
    team_name: str
    team_color: str | None = None
    wins: int
    losses: int
    draws: int
    matches_played: int
    goals_for: int
    goals_against: int
    goal_difference: int
    team_score: int
    points: int
    rank_position: int


class SessionSummaryHighlightRead(EntityResponse):
    player_id: uuid.UUID | None = None
    player_name: str | None = None
    player_nickname: str | None = None
    team_id: uuid.UUID | None = None
    team_name: str | None = None
    team_color: str | None = None
    score: int | None = None
    average_score: int | None = None
    goals: int | None = None
    assists: int | None = None
    wins: int | None = None
    goal_difference: int | None = None
    points: int | None = None


class SessionSummaryRead(EntityResponse):
    league_id: uuid.UUID
    session_id: uuid.UUID
    total_goals: int
    top_scorer_player_id: uuid.UUID | None = None
    best_player_id: uuid.UUID | None = None
    best_team_id: uuid.UUID | None = None
    most_wins_team_id: uuid.UUID | None = None
    top_scorer: SessionSummaryHighlightRead | None = None
    best_player: SessionSummaryHighlightRead | None = None
    best_team: SessionSummaryHighlightRead | None = None
    most_wins_team: SessionSummaryHighlightRead | None = None
    players: list[SessionSummaryPlayerRead]
    teams: list[SessionSummaryTeamRead]
