"""session workflow and extended stats

Revision ID: 20260331_0004
Revises: 20260328_0003
Create Date: 2026-03-31 09:45:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260331_0004"
down_revision = "20260328_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TYPE leaguerole ADD VALUE IF NOT EXISTS 'OPERATOR'")
    op.execute("ALTER TYPE leaguerole ADD VALUE IF NOT EXISTS 'MEMBER'")

    op.add_column("matches", sa.Column("stage", sa.String(length=40), server_default="REGULAR", nullable=False))
    op.add_column("matches", sa.Column("round_number", sa.Integer(), server_default="1", nullable=False))
    op.add_column("matches", sa.Column("sequence", sa.Integer(), server_default="1", nullable=False))
    op.add_column("matches", sa.Column("label", sa.String(length=120), nullable=True))

    op.add_column("league_player_stats", sa.Column("fouls", sa.Integer(), server_default="0", nullable=False))
    op.add_column("league_player_stats", sa.Column("yellow_cards", sa.Integer(), server_default="0", nullable=False))
    op.add_column("league_player_stats", sa.Column("red_cards", sa.Integer(), server_default="0", nullable=False))
    op.add_column("league_player_stats", sa.Column("attendances", sa.Integer(), server_default="0", nullable=False))
    op.add_column("league_player_stats", sa.Column("participations", sa.Integer(), server_default="0", nullable=False))

    op.execute("UPDATE sessions SET status = 'DRAFT' WHERE status = 'OPEN'")

    op.alter_column("sessions", "status", server_default="DRAFT")
    op.alter_column("matches", "status", server_default="SCHEDULED")
    op.alter_column("matches", "stage", server_default=None)
    op.alter_column("matches", "round_number", server_default=None)
    op.alter_column("matches", "sequence", server_default=None)
    op.alter_column("league_player_stats", "fouls", server_default=None)
    op.alter_column("league_player_stats", "yellow_cards", server_default=None)
    op.alter_column("league_player_stats", "red_cards", server_default=None)
    op.alter_column("league_player_stats", "attendances", server_default=None)
    op.alter_column("league_player_stats", "participations", server_default=None)


def downgrade() -> None:
    op.drop_column("league_player_stats", "participations")
    op.drop_column("league_player_stats", "attendances")
    op.drop_column("league_player_stats", "red_cards")
    op.drop_column("league_player_stats", "yellow_cards")
    op.drop_column("league_player_stats", "fouls")

    op.drop_column("matches", "label")
    op.drop_column("matches", "sequence")
    op.drop_column("matches", "round_number")
    op.drop_column("matches", "stage")
