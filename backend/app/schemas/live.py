import uuid
from datetime import datetime

from app.schemas.common import ORMModel
from app.schemas.match import MatchEventRead, MatchRead
from app.schemas.session import SessionRead, SessionTeamRead


class LiveTeamPlayerRead(ORMModel):
    team_player_id: uuid.UUID
    player_id: uuid.UUID
    player_name: str
    player_nickname: str | None = None
    position: str | None = None
    overall: int = 0
    attack_rating: int = 0
    passing_rating: int = 0
    defense_rating: int = 0
    stamina_rating: int = 0
    is_captain: bool


class LiveTeamRead(ORMModel):
    id: uuid.UUID
    name: str
    color: str | None = None
    average_overall: int = 0
    total_strength: int = 0
    players: list[LiveTeamPlayerRead]


class LiveMatchCardRead(ORMModel):
    match: MatchRead
    home_team_name: str
    away_team_name: str
    home_team_color: str | None = None
    away_team_color: str | None = None
    last_event: MatchEventRead | None = None


class MatchEventDetailRead(MatchEventRead):
    second: int
    created_by: uuid.UUID | None = None
    is_reverted: bool
    team_name: str | None = None
    player_name: str | None = None
    related_player_name: str | None = None
    created_by_name: str | None = None


class SessionLiveStateRead(ORMModel):
    session: SessionRead
    matches: list[LiveMatchCardRead]
    queue: list[SessionTeamRead]
    current_match_id: uuid.UUID | None = None
    next_match_id: uuid.UUID | None = None
    current_staying_team_name: str | None = None
    challenger_team_name: str | None = None
    recent_events: list[MatchEventDetailRead]
    updated_at: datetime


class MatchLiveStateRead(ORMModel):
    session: SessionRead
    match: LiveMatchCardRead
    teams: list[LiveTeamRead]
    events: list[MatchEventDetailRead]
    updated_at: datetime
