"""initial schema

Revision ID: 20260325_0001
Revises:
Create Date: 2026-03-25 00:00:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260325_0001"
down_revision = None
branch_labels = None
depends_on = None


league_role_enum = sa.Enum("OWNER", "ADMIN", "REGISTRADOR", "PLAYER", name="leaguerole")
subscription_plan_code_enum = sa.Enum("FREE", "PRO", name="subscriptionplancode")
subscription_status_enum = sa.Enum(
    "TRIALING", "ACTIVE", "PAST_DUE", "CANCELED", "EXPIRED", name="subscriptionstatus"
)
payment_status_enum = sa.Enum("PENDING", "PAID", "FAILED", "REFUNDED", name="paymentstatus")
match_event_type_enum = sa.Enum(
    "GOAL", "OWN_GOAL", "ASSIST", "CARD", "SUBSTITUTION", name="matcheventtype"
)


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=255), nullable=False),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("password_reset_token", sa.String(length=255), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_users"),
        sa.UniqueConstraint("email", name="uq_users_email"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=False)

    op.create_table(
        "leagues",
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("description", sa.String(length=500), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_leagues"),
        sa.UniqueConstraint("slug", name="uq_leagues_slug"),
    )
    op.create_index("ix_leagues_slug", "leagues", ["slug"], unique=False)

    op.create_table(
        "subscription_plans",
        sa.Column("code", subscription_plan_code_enum, nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("price_monthly", sa.Numeric(10, 2), nullable=False),
        sa.Column("max_players", sa.Integer(), nullable=True),
        sa.Column("max_sessions_per_month", sa.Integer(), nullable=True),
        sa.Column("features", sa.JSON(), nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id", name="pk_subscription_plans"),
        sa.UniqueConstraint("code", name="uq_subscription_plans_code"),
    )

    op.create_table(
        "league_members",
        sa.Column("league_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", league_role_enum, nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE", name="fk_league_members_league_id_leagues"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE", name="fk_league_members_user_id_users"),
        sa.PrimaryKeyConstraint("id", name="pk_league_members"),
        sa.UniqueConstraint("league_id", "user_id", name="uq_league_members_league_user"),
    )
    op.create_index("ix_league_members_league_id", "league_members", ["league_id"], unique=False)
    op.create_index("ix_league_members_user_id", "league_members", ["user_id"], unique=False)

    op.create_table(
        "league_players",
        sa.Column("league_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("nickname", sa.String(length=120), nullable=True),
        sa.Column("position", sa.String(length=50), nullable=True),
        sa.Column("skill_level", sa.Integer(), server_default="5", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE", name="fk_league_players_league_id_leagues"),
        sa.PrimaryKeyConstraint("id", name="pk_league_players"),
        sa.UniqueConstraint("league_id", "name", name="uq_league_players_league_name"),
    )
    op.create_index("ix_league_players_league_id", "league_players", ["league_id"], unique=False)

    op.create_table(
        "sessions",
        sa.Column("league_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=40), server_default="OPEN", nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE", name="fk_sessions_league_id_leagues"),
        sa.PrimaryKeyConstraint("id", name="pk_sessions"),
    )
    op.create_index("ix_sessions_league_id", "sessions", ["league_id"], unique=False)

    op.create_table(
        "session_players",
        sa.Column("league_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("player_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_confirmed", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("attendance_status", sa.String(length=40), server_default="PENDING", nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE", name="fk_session_players_league_id_leagues"),
        sa.ForeignKeyConstraint(["player_id"], ["league_players.id"], ondelete="CASCADE", name="fk_session_players_player_id_league_players"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE", name="fk_session_players_session_id_sessions"),
        sa.PrimaryKeyConstraint("id", name="pk_session_players"),
        sa.UniqueConstraint("session_id", "player_id", name="uq_session_players_session_player"),
    )
    op.create_index("ix_session_players_league_id", "session_players", ["league_id"], unique=False)
    op.create_index("ix_session_players_player_id", "session_players", ["player_id"], unique=False)
    op.create_index("ix_session_players_session_id", "session_players", ["session_id"], unique=False)

    op.create_table(
        "session_teams",
        sa.Column("league_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("color", sa.String(length=40), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE", name="fk_session_teams_league_id_leagues"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE", name="fk_session_teams_session_id_sessions"),
        sa.PrimaryKeyConstraint("id", name="pk_session_teams"),
        sa.UniqueConstraint("session_id", "name", name="uq_session_teams_session_name"),
    )
    op.create_index("ix_session_teams_league_id", "session_teams", ["league_id"], unique=False)
    op.create_index("ix_session_teams_session_id", "session_teams", ["session_id"], unique=False)

    op.create_table(
        "subscriptions",
        sa.Column("league_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("plan_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", subscription_status_enum, nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancel_at_period_end", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE", name="fk_subscriptions_league_id_leagues"),
        sa.ForeignKeyConstraint(["plan_id"], ["subscription_plans.id"], ondelete="RESTRICT", name="fk_subscriptions_plan_id_subscription_plans"),
        sa.PrimaryKeyConstraint("id", name="pk_subscriptions"),
    )
    op.create_index("ix_subscriptions_league_id", "subscriptions", ["league_id"], unique=False)

    op.create_table(
        "league_player_stats",
        sa.Column("league_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("player_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("matches_played", sa.Integer(), server_default="0", nullable=False),
        sa.Column("wins", sa.Integer(), server_default="0", nullable=False),
        sa.Column("losses", sa.Integer(), server_default="0", nullable=False),
        sa.Column("goals", sa.Integer(), server_default="0", nullable=False),
        sa.Column("assists", sa.Integer(), server_default="0", nullable=False),
        sa.Column("ranking_points", sa.Integer(), server_default="0", nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE", name="fk_league_player_stats_league_id_leagues"),
        sa.ForeignKeyConstraint(["player_id"], ["league_players.id"], ondelete="CASCADE", name="fk_league_player_stats_player_id_league_players"),
        sa.PrimaryKeyConstraint("id", name="pk_league_player_stats"),
        sa.UniqueConstraint("league_id", "player_id", name="uq_league_player_stats_league_player"),
    )
    op.create_index("ix_league_player_stats_league_id", "league_player_stats", ["league_id"], unique=False)
    op.create_index("ix_league_player_stats_player_id", "league_player_stats", ["player_id"], unique=False)

    op.create_table(
        "session_team_players",
        sa.Column("league_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("player_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("is_captain", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE", name="fk_session_team_players_league_id_leagues"),
        sa.ForeignKeyConstraint(["player_id"], ["league_players.id"], ondelete="CASCADE", name="fk_session_team_players_player_id_league_players"),
        sa.ForeignKeyConstraint(["team_id"], ["session_teams.id"], ondelete="CASCADE", name="fk_session_team_players_team_id_session_teams"),
        sa.PrimaryKeyConstraint("id", name="pk_session_team_players"),
        sa.UniqueConstraint("team_id", "player_id", name="uq_session_team_players_team_player"),
    )
    op.create_index("ix_session_team_players_league_id", "session_team_players", ["league_id"], unique=False)
    op.create_index("ix_session_team_players_player_id", "session_team_players", ["player_id"], unique=False)
    op.create_index("ix_session_team_players_team_id", "session_team_players", ["team_id"], unique=False)

    op.create_table(
        "matches",
        sa.Column("league_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("home_team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("away_team_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("home_score", sa.Integer(), server_default="0", nullable=False),
        sa.Column("away_score", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.String(length=40), server_default="SCHEDULED", nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["away_team_id"], ["session_teams.id"], ondelete="CASCADE", name="fk_matches_away_team_id_session_teams"),
        sa.ForeignKeyConstraint(["home_team_id"], ["session_teams.id"], ondelete="CASCADE", name="fk_matches_home_team_id_session_teams"),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE", name="fk_matches_league_id_leagues"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE", name="fk_matches_session_id_sessions"),
        sa.PrimaryKeyConstraint("id", name="pk_matches"),
    )
    op.create_index("ix_matches_league_id", "matches", ["league_id"], unique=False)
    op.create_index("ix_matches_session_id", "matches", ["session_id"], unique=False)

    op.create_table(
        "session_substitutions",
        sa.Column("league_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("session_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("player_out_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("player_in_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("minute", sa.Integer(), server_default="0", nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE", name="fk_session_substitutions_league_id_leagues"),
        sa.ForeignKeyConstraint(["player_in_id"], ["league_players.id"], ondelete="CASCADE", name="fk_session_substitutions_player_in_id_league_players"),
        sa.ForeignKeyConstraint(["player_out_id"], ["league_players.id"], ondelete="CASCADE", name="fk_session_substitutions_player_out_id_league_players"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE", name="fk_session_substitutions_session_id_sessions"),
        sa.PrimaryKeyConstraint("id", name="pk_session_substitutions"),
    )
    op.create_index("ix_session_substitutions_league_id", "session_substitutions", ["league_id"], unique=False)
    op.create_index("ix_session_substitutions_session_id", "session_substitutions", ["session_id"], unique=False)

    op.create_table(
        "match_events",
        sa.Column("league_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("match_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("event_type", match_event_type_enum, nullable=False),
        sa.Column("player_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("related_player_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("minute", sa.Integer(), server_default="0", nullable=False),
        sa.Column("notes", sa.String(length=255), nullable=True),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE", name="fk_match_events_league_id_leagues"),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"], ondelete="CASCADE", name="fk_match_events_match_id_matches"),
        sa.ForeignKeyConstraint(["player_id"], ["league_players.id"], ondelete="SET NULL", name="fk_match_events_player_id_league_players"),
        sa.ForeignKeyConstraint(["related_player_id"], ["league_players.id"], ondelete="SET NULL", name="fk_match_events_related_player_id_league_players"),
        sa.PrimaryKeyConstraint("id", name="pk_match_events"),
    )
    op.create_index("ix_match_events_league_id", "match_events", ["league_id"], unique=False)
    op.create_index("ix_match_events_match_id", "match_events", ["match_id"], unique=False)

    op.create_table(
        "payment_events",
        sa.Column("league_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("subscription_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("provider", sa.String(length=50), nullable=False),
        sa.Column("external_reference", sa.String(length=120), nullable=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False),
        sa.Column("status", payment_status_enum, nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE", name="fk_payment_events_league_id_leagues"),
        sa.ForeignKeyConstraint(["subscription_id"], ["subscriptions.id"], ondelete="CASCADE", name="fk_payment_events_subscription_id_subscriptions"),
        sa.PrimaryKeyConstraint("id", name="pk_payment_events"),
    )
    op.create_index("ix_payment_events_league_id", "payment_events", ["league_id"], unique=False)
    op.create_index("ix_payment_events_subscription_id", "payment_events", ["subscription_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_payment_events_league_id", table_name="payment_events")
    op.drop_index("ix_payment_events_subscription_id", table_name="payment_events")
    op.drop_table("payment_events")
    op.drop_index("ix_match_events_match_id", table_name="match_events")
    op.drop_index("ix_match_events_league_id", table_name="match_events")
    op.drop_table("match_events")
    op.drop_index("ix_session_substitutions_session_id", table_name="session_substitutions")
    op.drop_index("ix_session_substitutions_league_id", table_name="session_substitutions")
    op.drop_table("session_substitutions")
    op.drop_index("ix_matches_session_id", table_name="matches")
    op.drop_index("ix_matches_league_id", table_name="matches")
    op.drop_table("matches")
    op.drop_index("ix_session_team_players_team_id", table_name="session_team_players")
    op.drop_index("ix_session_team_players_player_id", table_name="session_team_players")
    op.drop_index("ix_session_team_players_league_id", table_name="session_team_players")
    op.drop_table("session_team_players")
    op.drop_index("ix_session_players_session_id", table_name="session_players")
    op.drop_index("ix_session_players_player_id", table_name="session_players")
    op.drop_index("ix_session_players_league_id", table_name="session_players")
    op.drop_table("session_players")
    op.drop_index("ix_league_player_stats_player_id", table_name="league_player_stats")
    op.drop_index("ix_league_player_stats_league_id", table_name="league_player_stats")
    op.drop_table("league_player_stats")
    op.drop_index("ix_subscriptions_league_id", table_name="subscriptions")
    op.drop_table("subscriptions")
    op.drop_index("ix_session_teams_session_id", table_name="session_teams")
    op.drop_index("ix_session_teams_league_id", table_name="session_teams")
    op.drop_table("session_teams")
    op.drop_index("ix_sessions_league_id", table_name="sessions")
    op.drop_table("sessions")
    op.drop_index("ix_league_players_league_id", table_name="league_players")
    op.drop_table("league_players")
    op.drop_index("ix_league_members_user_id", table_name="league_members")
    op.drop_index("ix_league_members_league_id", table_name="league_members")
    op.drop_table("league_members")
    op.drop_table("subscription_plans")
    op.drop_index("ix_leagues_slug", table_name="leagues")
    op.drop_table("leagues")
    op.drop_index("ix_users_email", table_name="users")
    op.drop_table("users")
