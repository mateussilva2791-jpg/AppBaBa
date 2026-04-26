"""session closure highlight expansion

Revision ID: 20260331_0009
Revises: 20260331_0008
Create Date: 2026-03-31 00:09:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260331_0009"
down_revision = "20260331_0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("session_player_scores", sa.Column("wins", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("session_player_scores", sa.Column("matches_played", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("session_player_scores", sa.Column("average_score", sa.Integer(), nullable=False, server_default="0"))

    op.add_column("session_highlights", sa.Column("best_average_player_id", sa.UUID(), nullable=True))
    op.add_column("session_highlights", sa.Column("top_assist_player_id", sa.UUID(), nullable=True))
    op.create_index(op.f("ix_session_highlights_best_average_player_id"), "session_highlights", ["best_average_player_id"], unique=False)
    op.create_index(op.f("ix_session_highlights_top_assist_player_id"), "session_highlights", ["top_assist_player_id"], unique=False)
    op.create_foreign_key(
        "fk_session_highlights_best_average_player_id_league_players",
        "session_highlights",
        "league_players",
        ["best_average_player_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_session_highlights_top_assist_player_id_league_players",
        "session_highlights",
        "league_players",
        ["top_assist_player_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_session_highlights_top_assist_player_id_league_players", "session_highlights", type_="foreignkey")
    op.drop_constraint("fk_session_highlights_best_average_player_id_league_players", "session_highlights", type_="foreignkey")
    op.drop_index(op.f("ix_session_highlights_top_assist_player_id"), table_name="session_highlights")
    op.drop_index(op.f("ix_session_highlights_best_average_player_id"), table_name="session_highlights")
    op.drop_column("session_highlights", "top_assist_player_id")
    op.drop_column("session_highlights", "best_average_player_id")

    op.drop_column("session_player_scores", "average_score")
    op.drop_column("session_player_scores", "matches_played")
    op.drop_column("session_player_scores", "wins")
