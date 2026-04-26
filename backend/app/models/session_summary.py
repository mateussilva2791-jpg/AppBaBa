import uuid

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import LeagueScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class SessionSummary(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, Base):
    __tablename__ = "session_summaries"
    __table_args__ = (UniqueConstraint("session_id", name="uq_session_summaries_session"),)

    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    total_goals: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    top_scorer_player_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("league_players.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    best_player_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("league_players.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    best_team_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("session_teams.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    most_wins_team_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("session_teams.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    session = relationship("Session", back_populates="summary")
    top_scorer_player = relationship("LeaguePlayer", foreign_keys=[top_scorer_player_id])
    best_player = relationship("LeaguePlayer", foreign_keys=[best_player_id])
    best_team = relationship("SessionTeam", foreign_keys=[best_team_id])
    most_wins_team = relationship("SessionTeam", foreign_keys=[most_wins_team_id])
    players = relationship(
        "SessionSummaryPlayer",
        back_populates="summary",
        cascade="all, delete-orphan",
        order_by="SessionSummaryPlayer.rank_position.asc()",
    )
    teams = relationship(
        "SessionSummaryTeam",
        back_populates="summary",
        cascade="all, delete-orphan",
        order_by="SessionSummaryTeam.rank_position.asc()",
    )


class SessionSummaryPlayer(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, Base):
    __tablename__ = "session_summary_players"
    __table_args__ = (UniqueConstraint("session_summary_id", "player_id", name="uq_session_summary_players_summary_player"),)

    session_summary_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("session_summaries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("league_players.id", ondelete="CASCADE"), nullable=False, index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    average_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    goals: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    assists: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    fouls: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    yellow_cards: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    red_cards: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    matches_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    rank_position: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    summary = relationship("SessionSummary", back_populates="players")
    player = relationship("LeaguePlayer")


class SessionSummaryTeam(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, Base):
    __tablename__ = "session_summary_teams"
    __table_args__ = (UniqueConstraint("session_summary_id", "team_id", name="uq_session_summary_teams_summary_team"),)

    session_summary_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("session_summaries.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("session_teams.id", ondelete="CASCADE"), nullable=False, index=True)
    wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    losses: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    draws: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    matches_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    goals_for: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    goals_against: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    goal_difference: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    team_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    points: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    rank_position: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    summary = relationship("SessionSummary", back_populates="teams")
    team = relationship("SessionTeam")
