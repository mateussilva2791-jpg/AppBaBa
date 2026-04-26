import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import MatchEventType, MatchStatus
from app.models.mixins import LeagueScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Match(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, Base):
    __tablename__ = "matches"

    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    home_team_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("session_teams.id", ondelete="CASCADE"), nullable=True)
    away_team_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("session_teams.id", ondelete="CASCADE"), nullable=True)
    home_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    away_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default=MatchStatus.SCHEDULED.value,
        server_default=MatchStatus.SCHEDULED.value,
    )
    stage: Mapped[str] = mapped_column(String(40), nullable=False, default="REGULAR", server_default="REGULAR")
    round_number: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    sequence: Mapped[int] = mapped_column(Integer, nullable=False, default=1, server_default="1")
    label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    bracket_group: Mapped[str | None] = mapped_column(String(40), nullable=True)
    current_period: Mapped[str] = mapped_column(String(40), nullable=False, default="NOT_STARTED", server_default="NOT_STARTED")
    period_started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    elapsed_seconds: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    is_clock_running: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    winner_team_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("session_teams.id", ondelete="SET NULL"), nullable=True)
    loser_team_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("session_teams.id", ondelete="SET NULL"), nullable=True)
    home_team_source_match_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("matches.id", ondelete="SET NULL"),
        nullable=True,
    )
    away_team_source_match_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("matches.id", ondelete="SET NULL"),
        nullable=True,
    )
    home_team_source_outcome: Mapped[str | None] = mapped_column(String(20), nullable=True)
    away_team_source_outcome: Mapped[str | None] = mapped_column(String(20), nullable=True)

    session = relationship("Session", back_populates="matches")
    home_team = relationship("SessionTeam", foreign_keys=[home_team_id], back_populates="home_matches")
    away_team = relationship("SessionTeam", foreign_keys=[away_team_id], back_populates="away_matches")
    winner_team = relationship("SessionTeam", foreign_keys=[winner_team_id])
    loser_team = relationship("SessionTeam", foreign_keys=[loser_team_id])
    events = relationship("MatchEvent", back_populates="match", cascade="all, delete-orphan")
    home_team_source_match = relationship("Match", foreign_keys=[home_team_source_match_id], remote_side="Match.id")
    away_team_source_match = relationship("Match", foreign_keys=[away_team_source_match_id], remote_side="Match.id")


class MatchEvent(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, Base):
    __tablename__ = "match_events"

    match_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("matches.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("session_teams.id", ondelete="SET NULL"), nullable=True)
    event_type: Mapped[MatchEventType] = mapped_column(Enum(MatchEventType, native_enum=False), nullable=False)
    player_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("league_players.id", ondelete="SET NULL"), nullable=True)
    related_player_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("league_players.id", ondelete="SET NULL"), nullable=True)
    minute: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    second: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    notes: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    is_reverted: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    match = relationship("Match", back_populates="events")
    team = relationship("SessionTeam")
    player = relationship("LeaguePlayer", foreign_keys=[player_id], back_populates="match_events")
    related_player = relationship(
        "LeaguePlayer",
        foreign_keys=[related_player_id],
        back_populates="related_match_events",
    )
    created_by_user = relationship("User")
