"""player status and attribute fields

Revision ID: 20260331_0005
Revises: 20260331_0004
Create Date: 2026-03-31 00:05:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260331_0005"
down_revision = "20260331_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("league_players", sa.Column("status", sa.String(length=40), server_default="ACTIVE", nullable=False))
    op.add_column("league_players", sa.Column("attack_rating", sa.Integer(), server_default="50", nullable=False))
    op.add_column("league_players", sa.Column("passing_rating", sa.Integer(), server_default="50", nullable=False))
    op.add_column("league_players", sa.Column("defense_rating", sa.Integer(), server_default="50", nullable=False))
    op.add_column("league_players", sa.Column("stamina_rating", sa.Integer(), server_default="50", nullable=False))

    op.execute(
        """
        UPDATE league_players
        SET
            status = CASE
                WHEN is_active IS TRUE THEN 'ACTIVE'
                ELSE 'UNAVAILABLE'
            END,
            attack_rating = LEAST(100, GREATEST(0, ovr)),
            passing_rating = LEAST(100, GREATEST(0, ovr)),
            defense_rating = LEAST(100, GREATEST(0, relative_strength)),
            stamina_rating = LEAST(100, GREATEST(0, relative_speed))
        """
    )

    op.alter_column("league_players", "status", server_default=None)
    op.alter_column("league_players", "attack_rating", server_default=None)
    op.alter_column("league_players", "passing_rating", server_default=None)
    op.alter_column("league_players", "defense_rating", server_default=None)
    op.alter_column("league_players", "stamina_rating", server_default=None)


def downgrade() -> None:
    op.drop_column("league_players", "stamina_rating")
    op.drop_column("league_players", "defense_rating")
    op.drop_column("league_players", "passing_rating")
    op.drop_column("league_players", "attack_rating")
    op.drop_column("league_players", "status")
