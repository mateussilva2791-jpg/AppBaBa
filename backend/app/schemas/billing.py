import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import PaymentStatus, SubscriptionPlanCode, SubscriptionStatus
from app.schemas.common import EntityResponse


class SubscriptionPlanRead(EntityResponse):
    code: SubscriptionPlanCode
    name: str
    price_monthly: float
    max_players: int | None = None
    max_sessions_per_month: int | None = None
    features: dict
    is_active: bool


class SubscriptionCreate(BaseModel):
    plan_code: SubscriptionPlanCode


class SubscriptionRead(EntityResponse):
    league_id: uuid.UUID
    plan_id: uuid.UUID
    plan_code: SubscriptionPlanCode
    status: SubscriptionStatus
    started_at: datetime
    current_period_end: datetime | None = None
    cancel_at_period_end: bool


class PaymentEventRead(EntityResponse):
    league_id: uuid.UUID
    subscription_id: uuid.UUID
    provider: str
    external_reference: str | None = None
    amount: float
    currency: str
    status: PaymentStatus
    payload: dict


class FeatureAccessRead(BaseModel):
    plan: SubscriptionPlanCode
    features: dict[str, bool]
    premium_enabled: bool
