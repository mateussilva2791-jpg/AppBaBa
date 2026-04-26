import uuid
from datetime import datetime

from pydantic import BaseModel

from app.schemas.highlight import SessionHighlightsRead
from app.schemas.common import EntityResponse
from app.schemas.session_summary import SessionSummaryRead


class SessionCreate(BaseModel):
    title: str
    scheduled_at: datetime
    location: str | None = None
    team_count: int = 2
    team_size: int | None = None


class SessionUpdate(BaseModel):
    title: str | None = None
    scheduled_at: datetime | None = None
    location: str | None = None
    team_count: int | None = None
    team_size: int | None = None
    status: str | None = None


class SessionRead(EntityResponse):
    league_id: uuid.UUID
    title: str
    scheduled_at: datetime
    location: str | None = None
    team_count: int
    team_size: int | None = None
    flow_phase: str
    current_staying_team_id: uuid.UUID | None = None
    challenger_team_id: uuid.UUID | None = None
    status: str


class SessionWorkflowRead(BaseModel):
    session: SessionRead
    confirmed_players: int
    teams_created: int
    matches_created: int
    ready_for_draw: bool
    ready_for_matches: bool
    can_finalize: bool
    has_open_matches: bool


class SessionPlayerCreate(BaseModel):
    player_id: uuid.UUID
    is_confirmed: bool = False
    attendance_status: str = "PENDING"


class SessionPlayerUpdate(BaseModel):
    is_confirmed: bool | None = None
    attendance_status: str | None = None


class SessionPlayerRead(EntityResponse):
    league_id: uuid.UUID
    session_id: uuid.UUID
    player_id: uuid.UUID
    is_confirmed: bool
    attendance_status: str


class SessionTeamCreate(BaseModel):
    name: str
    color: str | None = None


class SessionTeamRead(EntityResponse):
    league_id: uuid.UUID
    session_id: uuid.UUID
    name: str
    color: str | None = None
    queue_order: int


class SessionTeamPlayerCreate(BaseModel):
    player_id: uuid.UUID
    is_captain: bool = False


class SessionTeamPlayerRead(EntityResponse):
    league_id: uuid.UUID
    team_id: uuid.UUID
    player_id: uuid.UUID
    is_captain: bool


class SessionTeamPlayerMove(BaseModel):
    player_id: uuid.UUID
    target_team_id: uuid.UUID
    make_captain: bool = False


class TeamGenerationRequest(BaseModel):
    team_count: int = 2
    mode: str = "BALANCED"


class GeneratedTeamPlayer(BaseModel):
    player_id: uuid.UUID
    player_name: str
    position: str | None = None
    ovr: int
    overall: int
    balance_score: int
    attack_rating: int
    passing_rating: int
    defense_rating: int
    stamina_rating: int
    relative_speed: int
    relative_strength: int
    skill_level: int


class TeamStrengthRead(BaseModel):
    total_strength: int
    average_overall: int
    attack_total: int
    passing_total: int
    defense_total: int
    stamina_total: int


class GeneratedTeamRead(BaseModel):
    team_id: uuid.UUID
    name: str
    color: str | None = None
    total_skill: int
    balance_delta: int = 0
    balance_state: str = "BALANCED"
    strength: TeamStrengthRead
    players: list[GeneratedTeamPlayer]


class TeamComparisonRead(BaseModel):
    strongest_team_id: uuid.UUID | None = None
    weakest_team_id: uuid.UUID | None = None
    strength_gap: int = 0
    average_strength: int = 0
    balance_state: str = "BALANCED"


class TeamGenerationResponse(BaseModel):
    session_id: uuid.UUID
    mode: str
    comparison: TeamComparisonRead
    teams: list[GeneratedTeamRead]


class BracketSourceRead(BaseModel):
    match_id: uuid.UUID | None = None
    label: str | None = None
    outcome: str | None = None


class SessionBracketMatchRead(BaseModel):
    id: uuid.UUID
    home_team_id: uuid.UUID | None = None
    away_team_id: uuid.UUID | None = None
    home_team_name: str | None = None
    away_team_name: str | None = None
    stage: str
    round_number: int
    sequence: int
    label: str | None = None
    status: str
    bracket_group: str | None = None
    winner_team_id: uuid.UUID | None = None
    loser_team_id: uuid.UUID | None = None
    home_score: int
    away_score: int
    home_slot_label: str | None = None
    away_slot_label: str | None = None
    home_source: BracketSourceRead | None = None
    away_source: BracketSourceRead | None = None


class SessionBracketRead(BaseModel):
    session_id: uuid.UUID
    flow_phase: str = "INITIAL_STAGE"
    current_staying_team_id: uuid.UUID | None = None
    current_staying_team_name: str | None = None
    challenger_team_id: uuid.UUID | None = None
    challenger_team_name: str | None = None
    current_match_id: uuid.UUID | None = None
    next_match_id: uuid.UUID | None = None
    queue: list[SessionTeamRead] = []
    matches: list[SessionBracketMatchRead]


class SessionSubstitutionCreate(BaseModel):
    team_id: uuid.UUID | None = None
    player_out_id: uuid.UUID
    player_in_id: uuid.UUID | None = None
    minute: int
    reason: str | None = None


class MessageResponse(BaseModel):
    message: str


class SessionFinalizeRead(BaseModel):
    session: SessionRead
    matches_finished: int
    matches_locked: int = 0
    total_goals: int
    champion_team_id: uuid.UUID | None = None
    highlights: SessionHighlightsRead | None = None
    summary: SessionSummaryRead | None = None
