import uuid

from sqlalchemy import Boolean, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import LeagueRole
from app.models.mixins import NameMixin, TimestampMixin, UUIDPrimaryKeyMixin


class League(UUIDPrimaryKeyMixin, TimestampMixin, NameMixin, Base):
    __tablename__ = "leagues"

    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    members = relationship("LeagueMember", back_populates="league", cascade="all, delete-orphan")
    players = relationship("LeaguePlayer", back_populates="league", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="league", cascade="all, delete-orphan")
    player_stats = relationship("LeaguePlayerStats", back_populates="league", cascade="all, delete-orphan")
    subscriptions = relationship("Subscription", back_populates="league", cascade="all, delete-orphan")
    payment_events = relationship("PaymentEvent", back_populates="league", cascade="all, delete-orphan")


class LeagueMember(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "league_members"
    __table_args__ = (UniqueConstraint("league_id", "user_id", name="uq_league_members_league_user"),)

    league_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("leagues.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    role: Mapped[LeagueRole] = mapped_column(Enum(LeagueRole, native_enum=False), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    league = relationship("League", back_populates="members")
    user = relationship("User", back_populates="league_memberships")
