"""gameplay fields and richer events

Revision ID: 20260325_0002
Revises: 20260325_0001
Create Date: 2026-03-25 00:30:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260325_0002"
down_revision = "20260325_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("league_players", sa.Column("ovr", sa.Integer(), server_default="50", nullable=False))
    op.add_column("league_players", sa.Column("relative_speed", sa.Integer(), server_default="50", nullable=False))
    op.add_column("league_players", sa.Column("relative_strength", sa.Integer(), server_default="50", nullable=False))

    op.add_column("league_player_stats", sa.Column("clean_sheets", sa.Integer(), server_default="0", nullable=False))

    op.add_column("sessions", sa.Column("team_count", sa.Integer(), server_default="2", nullable=False))
    op.add_column("sessions", sa.Column("team_size", sa.Integer(), nullable=True))

    op.add_column("session_substitutions", sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.alter_column("session_substitutions", "player_in_id", existing_type=postgresql.UUID(as_uuid=True), nullable=True)
    op.create_foreign_key(
        "fk_session_substitutions_team_id_session_teams",
        "session_substitutions",
        "session_teams",
        ["team_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column("match_events", sa.Column("team_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        "fk_match_events_team_id_session_teams",
        "match_events",
        "session_teams",
        ["team_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.execute("ALTER TYPE matcheventtype ADD VALUE IF NOT EXISTS 'FOUL'")
    op.execute("ALTER TYPE matcheventtype ADD VALUE IF NOT EXISTS 'YELLOW_CARD'")
    op.execute("ALTER TYPE matcheventtype ADD VALUE IF NOT EXISTS 'RED_CARD'")
    op.execute("ALTER TYPE matcheventtype ADD VALUE IF NOT EXISTS 'CLEAN_SHEET'")

    op.alter_column("league_players", "ovr", server_default=None)
    op.alter_column("league_players", "relative_speed", server_default=None)
    op.alter_column("league_players", "relative_strength", server_default=None)
    op.alter_column("league_player_stats", "clean_sheets", server_default=None)
    op.alter_column("sessions", "team_count", server_default=None)


def downgrade() -> None:
    op.drop_constraint("fk_match_events_team_id_session_teams", "match_events", type_="foreignkey")
    op.drop_column("match_events", "team_id")

    op.drop_constraint("fk_session_substitutions_team_id_session_teams", "session_substitutions", type_="foreignkey")
    op.alter_column("session_substitutions", "player_in_id", existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.drop_column("session_substitutions", "team_id")

    op.drop_column("sessions", "team_size")
    op.drop_column("sessions", "team_count")

    op.drop_column("league_player_stats", "clean_sheets")

    op.drop_column("league_players", "relative_strength")
    op.drop_column("league_players", "relative_speed")
    op.drop_column("league_players", "ovr")
