import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PlayerStatus
from app.models.mixins import LeagueScopedMixin, NameMixin, TimestampMixin, UUIDPrimaryKeyMixin


class LeaguePlayer(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, NameMixin, Base):
    __tablename__ = "league_players"
    __table_args__ = (UniqueConstraint("league_id", "name", name="uq_league_players_league_name"),)

    nickname: Mapped[str | None] = mapped_column(String(120), nullable=True)
    position: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False, default=PlayerStatus.ACTIVE.value, server_default=PlayerStatus.ACTIVE.value)
    attack_rating: Mapped[int] = mapped_column(Integer, nullable=False, default=50, server_default="50")
    passing_rating: Mapped[int] = mapped_column(Integer, nullable=False, default=50, server_default="50")
    defense_rating: Mapped[int] = mapped_column(Integer, nullable=False, default=50, server_default="50")
    stamina_rating: Mapped[int] = mapped_column(Integer, nullable=False, default=50, server_default="50")
    ovr: Mapped[int] = mapped_column(Integer, nullable=False, default=50, server_default="50")
    relative_speed: Mapped[int] = mapped_column(Integer, nullable=False, default=50, server_default="50")
    relative_strength: Mapped[int] = mapped_column(Integer, nullable=False, default=50, server_default="50")
    skill_level: Mapped[int] = mapped_column(Integer, nullable=False, default=5, server_default="5")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    league = relationship("League", back_populates="players")
    stats = relationship("LeaguePlayerStats", back_populates="player", cascade="all, delete-orphan")
    session_players = relationship("SessionPlayer", back_populates="player", cascade="all, delete-orphan")
    team_assignments = relationship("SessionTeamPlayer", back_populates="player", cascade="all, delete-orphan")
    session_scores = relationship("SessionPlayerScore", back_populates="player", cascade="all, delete-orphan")
    match_events = relationship(
        "MatchEvent",
        foreign_keys="MatchEvent.player_id",
        back_populates="player",
    )
    related_match_events = relationship(
        "MatchEvent",
        foreign_keys="MatchEvent.related_player_id",
        back_populates="related_player",
    )
    substitutions_in = relationship(
        "SessionSubstitution",
        foreign_keys="SessionSubstitution.player_in_id",
        back_populates="player_in",
    )
    substitutions_out = relationship(
        "SessionSubstitution",
        foreign_keys="SessionSubstitution.player_out_id",
        back_populates="player_out",
    )


class LeaguePlayerStats(UUIDPrimaryKeyMixin, TimestampMixin, LeagueScopedMixin, Base):
    __tablename__ = "league_player_stats"
    __table_args__ = (UniqueConstraint("league_id", "player_id", name="uq_league_player_stats_league_player"),)

    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("league_players.id", ondelete="CASCADE"), nullable=False, index=True)
    matches_played: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    losses: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    goals: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    assists: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    fouls: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    yellow_cards: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    red_cards: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    clean_sheets: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    attendances: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    participations: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    ranking_points: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")

    league = relationship("League", back_populates="player_stats")
    player = relationship("LeaguePlayer", back_populates="stats")


Player = LeaguePlayer
