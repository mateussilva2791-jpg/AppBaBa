import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import require_league_role
from app.db.session import get_db
from app.models.billing import PaymentEvent, Subscription, SubscriptionPlan
from app.models.enums import LeagueRole, PaymentStatus, SubscriptionPlanCode, SubscriptionStatus
from app.schemas.billing import (
    FeatureAccessRead,
    PaymentEventRead,
    SubscriptionCreate,
    SubscriptionPlanRead,
    SubscriptionRead,
)
from app.services.billing import (
    PLAN_FEATURES,
    get_active_subscription,
    get_plan_code_for_league,
    has_feature,
)


router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/plans", response_model=list[SubscriptionPlanRead])
def list_plans(db: Session = Depends(get_db)):
    return db.query(SubscriptionPlan).filter(SubscriptionPlan.is_active.is_(True)).all()


@router.get("/leagues/{league_id}/subscription", response_model=SubscriptionRead | None)
def get_subscription(
    league_id: uuid.UUID,
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN)),
    db: Session = Depends(get_db),
):
    subscription = (
        db.query(Subscription)
        .filter(Subscription.league_id == league_id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    if not subscription:
        return None
    return SubscriptionRead(
        id=subscription.id,
        created_at=subscription.created_at,
        updated_at=subscription.updated_at,
        league_id=subscription.league_id,
        plan_id=subscription.plan_id,
        plan_code=subscription.plan.code,
        status=subscription.status,
        started_at=subscription.started_at,
        current_period_end=subscription.current_period_end,
        cancel_at_period_end=subscription.cancel_at_period_end,
    )


@router.post("/leagues/{league_id}/subscription", response_model=SubscriptionRead, status_code=status.HTTP_201_CREATED)
def create_subscription(
    league_id: uuid.UUID,
    payload: SubscriptionCreate,
    _=Depends(require_league_role(LeagueRole.OWNER)),
    db: Session = Depends(get_db),
):
    plan = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == payload.plan_code).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    current_active = (
        db.query(Subscription)
        .with_for_update()
        .filter(Subscription.league_id == league_id, Subscription.status == SubscriptionStatus.ACTIVE)
        .all()
    )
    for current in current_active:
        current.status = SubscriptionStatus.CANCELED
        current.cancel_at_period_end = True
        db.add(current)

    subscription = Subscription(
        league_id=league_id,
        plan_id=plan.id,
        status=SubscriptionStatus.ACTIVE,
        started_at=datetime.now(UTC),
        current_period_end=datetime.now(UTC) + timedelta(days=30),
    )
    db.add(subscription)
    db.flush()
    db.add(
        PaymentEvent(
            league_id=league_id,
            subscription_id=subscription.id,
            provider="internal",
            amount=plan.price_monthly,
            currency="BRL",
            status=PaymentStatus.PENDING if plan.code == SubscriptionPlanCode.PRO else PaymentStatus.PAID,
            payload={"plan_code": plan.code.value},
        )
    )
    db.commit()
    db.refresh(subscription)
    return SubscriptionRead(
        id=subscription.id,
        created_at=subscription.created_at,
        updated_at=subscription.updated_at,
        league_id=subscription.league_id,
        plan_id=subscription.plan_id,
        plan_code=subscription.plan.code,
        status=subscription.status,
        started_at=subscription.started_at,
        current_period_end=subscription.current_period_end,
        cancel_at_period_end=subscription.cancel_at_period_end,
    )


@router.get("/leagues/{league_id}/payment-events", response_model=list[PaymentEventRead])
def list_payment_events(
    league_id: uuid.UUID,
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN)),
    db: Session = Depends(get_db),
):
    return (
        db.query(PaymentEvent)
        .join(Subscription, Subscription.id == PaymentEvent.subscription_id)
        .filter(Subscription.league_id == league_id)
        .all()
    )


@router.get("/leagues/{league_id}/features", response_model=FeatureAccessRead)
def get_feature_access(
    league_id: uuid.UUID,
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
    db: Session = Depends(get_db),
):
    plan_code = get_plan_code_for_league(db, league_id)
    return FeatureAccessRead(
        plan=plan_code,
        features=PLAN_FEATURES[plan_code],
        premium_enabled=has_feature(plan_code, "full_history"),
    )


@router.get("/leagues/{league_id}/features/{feature_key}")
def check_feature_access(
    league_id: uuid.UUID,
    feature_key: str,
    _=Depends(require_league_role(LeagueRole.OWNER, LeagueRole.ADMIN, LeagueRole.OPERATOR, LeagueRole.REGISTRADOR, LeagueRole.MEMBER, LeagueRole.PLAYER)),
    db: Session = Depends(get_db),
):
    subscription = get_active_subscription(db, league_id)
    plan_code = subscription.plan.code if subscription else SubscriptionPlanCode.FREE
    return {
        "feature": feature_key,
        "allowed": has_feature(plan_code, feature_key),
        "plan": plan_code,
    }
