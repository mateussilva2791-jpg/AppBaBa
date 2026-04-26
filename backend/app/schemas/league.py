import uuid

from pydantic import BaseModel, EmailStr, model_validator

from app.models.enums import LeagueRole
from app.schemas.common import EntityResponse


class LeagueCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None


class LeagueRead(EntityResponse):
    name: str
    slug: str
    description: str | None = None
    is_active: bool


class LeagueMemberRead(EntityResponse):
    league_id: uuid.UUID
    user_id: uuid.UUID
    role: LeagueRole
    is_active: bool


class LeagueMemberCreate(BaseModel):
    user_id: uuid.UUID | None = None
    email: EmailStr | None = None
    role: LeagueRole

    @model_validator(mode="after")
    def validate_target(self):
        if not self.user_id and not self.email:
            raise ValueError("user_id or email must be provided")
        return self


class LeagueMemberUpdate(BaseModel):
    role: LeagueRole | None = None
    is_active: bool | None = None
