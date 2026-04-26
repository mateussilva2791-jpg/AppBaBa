import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, JSON, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import PaymentStatus, SubscriptionPlanCode, SubscriptionStatus
from app.models.mixins import TimestampMixin, UUIDPrimaryKeyMixin


class SubscriptionPlan(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "subscription_plans"

    code: Mapped[SubscriptionPlanCode] = mapped_column(
        Enum(SubscriptionPlanCode, native_enum=False), nullable=False, unique=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    price_monthly: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    max_players: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_sessions_per_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    features: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")

    subscriptions = relationship("Subscription", back_populates="plan")


class Subscription(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "subscriptions"

    league_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("leagues.id", ondelete="CASCADE"), nullable=False, index=True)
    plan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subscription_plans.id", ondelete="RESTRICT"), nullable=False)
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, native_enum=False), nullable=False, default=SubscriptionStatus.ACTIVE
    )
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancel_at_period_end: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default="false")

    league = relationship("League", back_populates="subscriptions")
    plan = relationship("SubscriptionPlan", back_populates="subscriptions")
    payment_events = relationship("PaymentEvent", back_populates="subscription", cascade="all, delete-orphan")


class PaymentEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "payment_events"

    league_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("leagues.id", ondelete="CASCADE"), nullable=False, index=True)
    subscription_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subscriptions.id", ondelete="CASCADE"), nullable=False, index=True)
    provider: Mapped[str] = mapped_column(String(50), nullable=False, default="internal")
    external_reference: Mapped[str | None] = mapped_column(String(120), nullable=True)
    amount: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(10), nullable=False, default="BRL")
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, native_enum=False), nullable=False, default=PaymentStatus.PENDING
    )
    payload: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    league = relationship("League", back_populates="payment_events")
    subscription = relationship("Subscription", back_populates="payment_events")
