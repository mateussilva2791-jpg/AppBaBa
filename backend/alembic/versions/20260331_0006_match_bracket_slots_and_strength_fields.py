"""match bracket slots and strength fields

Revision ID: 20260331_0006
Revises: 20260331_0005
Create Date: 2026-03-31 00:06:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260331_0006"
down_revision = "20260331_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("matches", "home_team_id", existing_type=sa.UUID(), nullable=True)
    op.alter_column("matches", "away_team_id", existing_type=sa.UUID(), nullable=True)
    op.add_column("matches", sa.Column("bracket_group", sa.String(length=40), nullable=True))
    op.add_column("matches", sa.Column("home_team_source_match_id", sa.UUID(), nullable=True))
    op.add_column("matches", sa.Column("away_team_source_match_id", sa.UUID(), nullable=True))
    op.add_column("matches", sa.Column("home_team_source_outcome", sa.String(length=20), nullable=True))
    op.add_column("matches", sa.Column("away_team_source_outcome", sa.String(length=20), nullable=True))
    op.create_foreign_key(
        "fk_matches_home_team_source_match_id_matches",
        "matches",
        "matches",
        ["home_team_source_match_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_matches_away_team_source_match_id_matches",
        "matches",
        "matches",
        ["away_team_source_match_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_matches_away_team_source_match_id_matches", "matches", type_="foreignkey")
    op.drop_constraint("fk_matches_home_team_source_match_id_matches", "matches", type_="foreignkey")
    op.drop_column("matches", "away_team_source_outcome")
    op.drop_column("matches", "home_team_source_outcome")
    op.drop_column("matches", "away_team_source_match_id")
    op.drop_column("matches", "home_team_source_match_id")
    op.drop_column("matches", "bracket_group")
    op.alter_column("matches", "away_team_id", existing_type=sa.UUID(), nullable=False)
    op.alter_column("matches", "home_team_id", existing_type=sa.UUID(), nullable=False)
