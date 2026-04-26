from datetime import datetime

from pydantic import BaseModel


class SessionHistoryItem(BaseModel):
    id: str
    title: str
    scheduled_at: datetime
    location: str | None = None
    status: str


class MatchHistoryItem(BaseModel):
    id: str
    session_id: str
    home_team_id: str
    away_team_id: str
    home_score: int
    away_score: int
    status: str
    created_at: datetime


class HistorySummaryRead(BaseModel):
    plan: str
    is_limited: bool
    sessions: list[SessionHistoryItem]
    matches: list[MatchHistoryItem]


class LeagueReportSummaryRead(BaseModel):
    plan: str
    is_limited: bool
    total_players: int
    total_sessions: int
    total_matches: int
    finished_matches: int


class LeagueReportFullRead(LeagueReportSummaryRead):
    total_goals: int
    total_assists: int
    top_scorer_name: str | None = None
    top_scorer_goals: int = 0
    leader_name: str | None = None
    leader_points: int = 0
