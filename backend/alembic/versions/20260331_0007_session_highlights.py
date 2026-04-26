"""session highlights and round awards

Revision ID: 20260331_0007
Revises: 20260331_0006
Create Date: 2026-03-31 00:07:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260331_0007"
down_revision = "20260331_0006"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "session_player_scores",
        sa.Column("session_id", sa.UUID(), nullable=False),
        sa.Column("player_id", sa.UUID(), nullable=False),
        sa.Column("goals", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("assists", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("fouls", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("yellow_cards", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("red_cards", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rank_position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("league_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["player_id"], ["league_players.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", "player_id", name="uq_session_player_scores_session_player"),
    )
    op.create_index(op.f("ix_session_player_scores_session_id"), "session_player_scores", ["session_id"], unique=False)
    op.create_index(op.f("ix_session_player_scores_player_id"), "session_player_scores", ["player_id"], unique=False)

    op.create_table(
        "session_highlights",
        sa.Column("session_id", sa.UUID(), nullable=False),
        sa.Column("top_scorer_id", sa.UUID(), nullable=True),
        sa.Column("best_player_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("league_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["best_player_id"], ["league_players.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["top_scorer_id"], ["league_players.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", name="uq_session_highlights_session"),
    )
    op.create_index(op.f("ix_session_highlights_session_id"), "session_highlights", ["session_id"], unique=False)
    op.create_index(op.f("ix_session_highlights_top_scorer_id"), "session_highlights", ["top_scorer_id"], unique=False)
    op.create_index(op.f("ix_session_highlights_best_player_id"), "session_highlights", ["best_player_id"], unique=False)

    op.create_table(
        "session_team_of_the_week",
        sa.Column("session_id", sa.UUID(), nullable=False),
        sa.Column("highlight_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("league_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["highlight_id"], ["session_highlights.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", name="uq_session_team_of_the_week_session"),
    )
    op.create_index(op.f("ix_session_team_of_the_week_session_id"), "session_team_of_the_week", ["session_id"], unique=False)
    op.create_index(op.f("ix_session_team_of_the_week_highlight_id"), "session_team_of_the_week", ["highlight_id"], unique=False)

    op.create_table(
        "session_team_of_the_week_players",
        sa.Column("team_id", sa.UUID(), nullable=False),
        sa.Column("player_id", sa.UUID(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("goals", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("assists", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rank_position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("league_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["player_id"], ["league_players.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["session_team_of_the_week.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("team_id", "player_id", name="uq_session_team_of_the_week_players_team_player"),
    )
    op.create_index(op.f("ix_session_team_of_the_week_players_team_id"), "session_team_of_the_week_players", ["team_id"], unique=False)
    op.create_index(op.f("ix_session_team_of_the_week_players_player_id"), "session_team_of_the_week_players", ["player_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_session_team_of_the_week_players_player_id"), table_name="session_team_of_the_week_players")
    op.drop_index(op.f("ix_session_team_of_the_week_players_team_id"), table_name="session_team_of_the_week_players")
    op.drop_table("session_team_of_the_week_players")

    op.drop_index(op.f("ix_session_team_of_the_week_highlight_id"), table_name="session_team_of_the_week")
    op.drop_index(op.f("ix_session_team_of_the_week_session_id"), table_name="session_team_of_the_week")
    op.drop_table("session_team_of_the_week")

    op.drop_index(op.f("ix_session_highlights_best_player_id"), table_name="session_highlights")
    op.drop_index(op.f("ix_session_highlights_top_scorer_id"), table_name="session_highlights")
    op.drop_index(op.f("ix_session_highlights_session_id"), table_name="session_highlights")
    op.drop_table("session_highlights")

    op.drop_index(op.f("ix_session_player_scores_player_id"), table_name="session_player_scores")
    op.drop_index(op.f("ix_session_player_scores_session_id"), table_name="session_player_scores")
    op.drop_table("session_player_scores")
