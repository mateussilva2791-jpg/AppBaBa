from enum import StrEnum


class LeagueRole(StrEnum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    OPERATOR = "OPERATOR"
    MEMBER = "MEMBER"
    REGISTRADOR = "REGISTRADOR"
    PLAYER = "PLAYER"


class SubscriptionPlanCode(StrEnum):
    FREE = "FREE"
    PRO = "PRO"


class SubscriptionStatus(StrEnum):
    TRIALING = "TRIALING"
    ACTIVE = "ACTIVE"
    PAST_DUE = "PAST_DUE"
    CANCELED = "CANCELED"
    EXPIRED = "EXPIRED"


class PaymentStatus(StrEnum):
    PENDING = "PENDING"
    PAID = "PAID"
    FAILED = "FAILED"
    REFUNDED = "REFUNDED"


class MatchEventType(StrEnum):
    MATCH_STARTED = "MATCH_STARTED"
    HALF_TIME = "HALF_TIME"
    SECOND_HALF_STARTED = "SECOND_HALF_STARTED"
    MATCH_FINISHED = "MATCH_FINISHED"
    GOAL = "GOAL"
    OWN_GOAL = "OWN_GOAL"
    ASSIST = "ASSIST"
    CARD = "CARD"
    FOUL = "FOUL"
    YELLOW_CARD = "YELLOW_CARD"
    RED_CARD = "RED_CARD"
    CLEAN_SHEET = "CLEAN_SHEET"
    SUBSTITUTION = "SUBSTITUTION"


class SessionStatus(StrEnum):
    DRAFT = "DRAFT"
    READY = "READY"
    IN_PROGRESS = "IN_PROGRESS"
    FINISHED = "FINISHED"


class MatchStatus(StrEnum):
    SCHEDULED = "SCHEDULED"
    LIVE = "LIVE"
    HALF_TIME = "HALF_TIME"
    FINISHED = "FINISHED"


class TeamGenerationMode(StrEnum):
    RANDOM = "RANDOM"
    BALANCED = "BALANCED"


class PlayerStatus(StrEnum):
    ACTIVE = "ACTIVE"
    UNAVAILABLE = "UNAVAILABLE"
    INJURED = "INJURED"
    SUSPENDED = "SUSPENDED"
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
