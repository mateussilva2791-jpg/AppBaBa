import uuid

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.mixins import LeagueScopedMixin, TimestampMixin, UUIDPrimaryKeyMixin


class SessionPlayerScore(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, Base):
    __tablename__ = "session_player_scores"
    __table_args__ = (UniqueConstraint("session_id", "player_id", name="uq_session_player_scores_session_player"),)

    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("league_players.id", ondelete="CASCADE"), nullable=False, index=True)
    goals: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    assists: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    fouls: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    yellow_cards: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    red_cards: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    matches_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    total_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    average_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    rank_position: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    session = relationship("Session")
    player = relationship("LeaguePlayer", back_populates="session_scores")


class SessionHighlight(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, Base):
    __tablename__ = "session_highlights"
    __table_args__ = (UniqueConstraint("session_id", name="uq_session_highlights_session"),)

    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    best_average_player_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("league_players.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    top_scorer_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("league_players.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    top_assist_player_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("league_players.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    best_player_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("league_players.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    session = relationship("Session", back_populates="highlights")
    best_average_player = relationship("LeaguePlayer", foreign_keys=[best_average_player_id])
    top_scorer = relationship("LeaguePlayer", foreign_keys=[top_scorer_id])
    top_assist_player = relationship("LeaguePlayer", foreign_keys=[top_assist_player_id])
    best_player = relationship("LeaguePlayer", foreign_keys=[best_player_id])
    team_of_the_week = relationship(
        "SessionTeamOfTheWeek",
        back_populates="highlight",
        cascade="all, delete-orphan",
        uselist=False,
    )


class SessionTeamOfTheWeek(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, Base):
    __tablename__ = "session_team_of_the_week"
    __table_args__ = (UniqueConstraint("session_id", name="uq_session_team_of_the_week_session"),)

    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    highlight_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("session_highlights.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    session = relationship("Session", back_populates="team_of_the_week")
    highlight = relationship("SessionHighlight", back_populates="team_of_the_week")
    players = relationship(
        "SessionTeamOfTheWeekPlayer",
        back_populates="team",
        cascade="all, delete-orphan",
        order_by="SessionTeamOfTheWeekPlayer.rank_position.asc()",
    )


class SessionTeamOfTheWeekPlayer(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, Base):
    __tablename__ = "session_team_of_the_week_players"
    __table_args__ = (UniqueConstraint("team_id", "player_id", name="uq_session_team_of_the_week_players_team_player"),)

    team_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("session_team_of_the_week.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("league_players.id", ondelete="CASCADE"), nullable=False, index=True)
    score: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    goals: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    assists: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    rank_position: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    team = relationship("SessionTeamOfTheWeek", back_populates="players")
    player = relationship("LeaguePlayer")
