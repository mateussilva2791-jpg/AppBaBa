from pydantic import BaseModel

from app.schemas.league import LeagueRead


class ActiveLeagueResolutionRead(BaseModel):
    league: LeagueRead | None
    available_leagues: list[LeagueRead]
    fallback_reason: str | None = None
