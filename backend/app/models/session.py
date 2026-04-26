import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import SessionStatus
from app.models.mixins import LeagueScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class Session(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, Base):
    __tablename__ = "sessions"

    title: Mapped[str] = mapped_column(String(120), nullable=False)
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    team_count: Mapped[int] = mapped_column(Integer, nullable=False, default=2, server_default="2")
    team_size: Mapped[int | None] = mapped_column(Integer, nullable=True)
    flow_phase: Mapped[str] = mapped_column(String(40), nullable=False, default="INITIAL_STAGE", server_default="INITIAL_STAGE")
    current_staying_team_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("session_teams.id", ondelete="SET NULL"),
        nullable=True,
    )
    challenger_team_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("session_teams.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(40),
        nullable=False,
        default=SessionStatus.DRAFT.value,
        server_default=SessionStatus.DRAFT.value,
    )

    league = relationship("League", back_populates="sessions")
    players = relationship("SessionPlayer", back_populates="session", cascade="all, delete-orphan")
    teams = relationship("SessionTeam", back_populates="session", cascade="all, delete-orphan", foreign_keys="SessionTeam.session_id")
    matches = relationship("Match", back_populates="session", cascade="all, delete-orphan", foreign_keys="Match.session_id")
    substitutions = relationship("SessionSubstitution", back_populates="session", cascade="all, delete-orphan")
    current_staying_team = relationship("SessionTeam", foreign_keys=[current_staying_team_id], post_update=True)
    challenger_team = relationship("SessionTeam", foreign_keys=[challenger_team_id], post_update=True)
    highlights = relationship("SessionHighlight", back_populates="session", cascade="all, delete-orphan", uselist=False)
    team_of_the_week = relationship(
        "SessionTeamOfTheWeek",
        back_populates="session",
        cascade="all, delete-orphan",
        uselist=False,
    )
    summary = relationship("SessionSummary", back_populates="session", cascade="all, delete-orphan", uselist=False)


class SessionPlayer(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, Base):
    __tablename__ = "session_players"
    __table_args__ = (UniqueConstraint("session_id", "player_id", name="uq_session_players_session_player"),)

    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("league_players.id", ondelete="CASCADE"), nullable=False, index=True)
    is_confirmed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")
    attendance_status: Mapped[str] = mapped_column(
        String(40), nullable=False, default="PENDING", server_default="PENDING"
    )

    session = relationship("Session", back_populates="players")
    player = relationship("LeaguePlayer", back_populates="session_players")


class SessionTeam(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, Base):
    __tablename__ = "session_teams"
    __table_args__ = (UniqueConstraint("session_id", "name", name="uq_session_teams_session_name"),)

    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    color: Mapped[str | None] = mapped_column(String(40), nullable=True)
    queue_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    session = relationship("Session", back_populates="teams", foreign_keys=[session_id])
    players = relationship("SessionTeamPlayer", back_populates="team", cascade="all, delete-orphan")
    home_matches = relationship(
        "Match",
        foreign_keys="Match.home_team_id",
        back_populates="home_team",
    )
    away_matches = relationship(
        "Match",
        foreign_keys="Match.away_team_id",
        back_populates="away_team",
    )


class SessionTeamPlayer(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, Base):
    __tablename__ = "session_team_players"
    __table_args__ = (UniqueConstraint("team_id", "player_id", name="uq_session_team_players_team_player"),)

    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("session_teams.id", ondelete="CASCADE"), nullable=False, index=True)
    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("league_players.id", ondelete="CASCADE"), nullable=False, index=True)
    is_captain: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    team = relationship("SessionTeam", back_populates="players")
    player = relationship("LeaguePlayer", back_populates="team_assignments")


class SessionSubstitution(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, Base):
    __tablename__ = "session_substitutions"

    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    team_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("session_teams.id", ondelete="SET NULL"), nullable=True)
    player_out_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("league_players.id", ondelete="CASCADE"), nullable=False)
    player_in_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("league_players.id", ondelete="SET NULL"), nullable=True)
    minute: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    session = relationship("Session", back_populates="substitutions")
    team = relationship("SessionTeam")
    player_out = relationship("LeaguePlayer", foreign_keys=[player_out_id], back_populates="substitutions_out")
    player_in = relationship("LeaguePlayer", foreign_keys=[player_in_id], back_populates="substitutions_in")
