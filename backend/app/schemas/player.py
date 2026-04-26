import uuid

from pydantic import BaseModel, Field

from app.models.enums import PlayerStatus
from app.schemas.common import EntityResponse


class PlayerCreate(BaseModel):
    name: str
    nickname: str | None = None
    status: PlayerStatus = PlayerStatus.ACTIVE
    attack_rating: int = Field(default=50, ge=0, le=100)
    passing_rating: int = Field(default=50, ge=0, le=100)
    defense_rating: int = Field(default=50, ge=0, le=100)
    stamina_rating: int = Field(default=50, ge=0, le=100)


class PlayerUpdate(BaseModel):
    name: str | None = None
    nickname: str | None = None
    status: PlayerStatus | None = None
    attack_rating: int | None = Field(default=None, ge=0, le=100)
    passing_rating: int | None = Field(default=None, ge=0, le=100)
    defense_rating: int | None = Field(default=None, ge=0, le=100)
    stamina_rating: int | None = Field(default=None, ge=0, le=100)


class PlayerRead(EntityResponse):
    league_id: uuid.UUID
    name: str
    nickname: str | None = None
    position: str | None = None
    status: PlayerStatus
    attack_rating: int
    passing_rating: int
    defense_rating: int
    stamina_rating: int
    ovr: int
    relative_speed: int
    relative_strength: int
    skill_level: int
    is_active: bool


class PlayerStatsRead(EntityResponse):
    league_id: uuid.UUID
    player_id: uuid.UUID
    matches_played: int
    wins: int
    losses: int
    goals: int
    assists: int
    fouls: int
    yellow_cards: int
    red_cards: int
    clean_sheets: int
    attendances: int
    participations: int
    ranking_points: int


class RankingEntryRead(PlayerStatsRead):
    player_name: str
    player_nickname: str | None = None


class RankingSummaryItem(BaseModel):
    player_id: uuid.UUID | None = None
    player_name: str | None = None
    value: int = 0


class RankingSummaryRead(BaseModel):
    overall_leader: RankingSummaryItem
    top_scorer: RankingSummaryItem
    top_assist_provider: RankingSummaryItem
    best_attendance: RankingSummaryItem
    best_defense: RankingSummaryItem
