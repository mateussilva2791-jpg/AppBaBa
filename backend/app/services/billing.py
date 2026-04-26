import uuid

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.billing import Subscription, SubscriptionPlan
from app.models.enums import SubscriptionPlanCode, SubscriptionStatus


PLAN_FEATURES = {
    SubscriptionPlanCode.FREE: {
        "full_ranking": False,
        "full_history": False,
        "automatic_ranking": False,
        "full_reports": False,
        "more_players": False,
        "more_sessions": False,
        "advanced_live": False,
        "advanced_stats": False,
        "public_dashboard": False,
        "multi_league": False,
    },
    SubscriptionPlanCode.PRO: {
        "full_ranking": True,
        "full_history": True,
        "automatic_ranking": True,
        "full_reports": True,
        "more_players": True,
        "more_sessions": True,
        "advanced_live": True,
        "advanced_stats": True,
        "public_dashboard": True,
        "multi_league": True,
    },
}


def has_feature(plan_code: SubscriptionPlanCode, feature_key: str) -> bool:
    return bool(PLAN_FEATURES.get(plan_code, {}).get(feature_key, False))


def get_active_subscription(db: Session, league_id: uuid.UUID) -> Subscription | None:
    return (
        db.query(Subscription)
        .join(SubscriptionPlan, SubscriptionPlan.id == Subscription.plan_id)
        .filter(Subscription.league_id == league_id, Subscription.status == SubscriptionStatus.ACTIVE)
        .order_by(Subscription.created_at.desc())
        .first()
    )


def get_plan_code_for_league(db: Session, league_id: uuid.UUID) -> SubscriptionPlanCode:
    subscription = get_active_subscription(db, league_id)
    return subscription.plan.code if subscription else SubscriptionPlanCode.FREE


def get_feature_flags_for_league(db: Session, league_id: uuid.UUID) -> dict[str, bool]:
    plan_code = get_plan_code_for_league(db, league_id)
    return PLAN_FEATURES[plan_code]


def ensure_feature_access(db: Session, league_id: uuid.UUID, feature_key: str) -> SubscriptionPlanCode:
    plan_code = get_plan_code_for_league(db, league_id)
    if not has_feature(plan_code, feature_key):
        raise HTTPException(
            status_code=403,
            detail=f"This feature requires the PRO plan: {feature_key}",
        )
    return plan_code
