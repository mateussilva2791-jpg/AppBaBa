import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import MatchEventType
from app.schemas.common import EntityResponse


class MatchCreate(BaseModel):
    session_id: uuid.UUID
    home_team_id: uuid.UUID | None = None
    away_team_id: uuid.UUID | None = None
    stage: str = "REGULAR"
    round_number: int = 1
    sequence: int = 1
    label: str | None = None
    bracket_group: str | None = None
    home_team_source_match_id: uuid.UUID | None = None
    away_team_source_match_id: uuid.UUID | None = None
    home_team_source_outcome: str | None = None
    away_team_source_outcome: str | None = None


class MatchUpdate(BaseModel):
    home_score: int | None = None
    away_score: int | None = None
    status: str | None = None


class MatchRead(EntityResponse):
    league_id: uuid.UUID
    session_id: uuid.UUID
    home_team_id: uuid.UUID | None = None
    away_team_id: uuid.UUID | None = None
    home_score: int
    away_score: int
    status: str
    stage: str
    round_number: int
    sequence: int
    label: str | None = None
    bracket_group: str | None = None
    current_period: str
    period_started_at: datetime | None = None
    elapsed_seconds: int
    is_clock_running: bool
    finished_at: datetime | None = None
    winner_team_id: uuid.UUID | None = None
    loser_team_id: uuid.UUID | None = None
    home_team_source_match_id: uuid.UUID | None = None
    away_team_source_match_id: uuid.UUID | None = None
    home_team_source_outcome: str | None = None
    away_team_source_outcome: str | None = None


class MatchEventRead(EntityResponse):
    league_id: uuid.UUID
    match_id: uuid.UUID
    team_id: uuid.UUID | None = None
    event_type: MatchEventType
    player_id: uuid.UUID | None = None
    related_player_id: uuid.UUID | None = None
    minute: int
    second: int
    notes: str | None = None
    created_by: uuid.UUID | None = None
    is_reverted: bool


class MatchEventCreate(BaseModel):
    team_id: uuid.UUID | None = None
    event_type: MatchEventType
    player_id: uuid.UUID | None = None
    related_player_id: uuid.UUID | None = None
    minute: int = 0
    second: int = 0
    notes: str | None = None


class MatchEventUpdate(BaseModel):
    team_id: uuid.UUID | None = None
    player_id: uuid.UUID | None = None
    related_player_id: uuid.UUID | None = None
    minute: int | None = None
    second: int | None = None
    notes: str | None = None
    is_reverted: bool | None = None


class MatchFlowAction(BaseModel):
    minute: int = 0
    second: int = 0
    notes: str | None = None
