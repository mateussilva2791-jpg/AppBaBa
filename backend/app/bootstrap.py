from sqlalchemy.orm import Session

from app.models.billing import SubscriptionPlan
from app.models.enums import SubscriptionPlanCode
from app.services.billing import PLAN_FEATURES


def seed_subscription_plans(db: Session) -> None:
    existing_plans = {plan.code: plan for plan in db.query(SubscriptionPlan).all()}
    defaults = [
        {
            "code": SubscriptionPlanCode.FREE,
            "name": "Free",
            "price_monthly": 0,
            "max_players": 25,
            "max_sessions_per_month": 8,
            "features": PLAN_FEATURES[SubscriptionPlanCode.FREE],
            "is_active": True,
        },
        {
            "code": SubscriptionPlanCode.PRO,
            "name": "Pro",
            "price_monthly": 49.90,
            "max_players": None,
            "max_sessions_per_month": None,
            "features": PLAN_FEATURES[SubscriptionPlanCode.PRO],
            "is_active": True,
        },
    ]
    changed = False
    for item in defaults:
        existing = existing_plans.get(item["code"])
        if not existing:
            db.add(SubscriptionPlan(**item))
            changed = True
            continue

        for field in ("name", "price_monthly", "max_players", "max_sessions_per_month", "features", "is_active"):
            if getattr(existing, field) != item.get(field):
                setattr(existing, field, item[field])
                changed = True
    if changed:
        db.commit()
