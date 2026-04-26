"""session summaries

Revision ID: 20260401_0011
Revises: 20260331_0010
Create Date: 2026-04-01 00:40:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260401_0011"
down_revision = "20260331_0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "session_summaries",
        sa.Column("session_id", sa.UUID(), nullable=False),
        sa.Column("total_goals", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("top_scorer_player_id", sa.UUID(), nullable=True),
        sa.Column("best_player_id", sa.UUID(), nullable=True),
        sa.Column("best_team_id", sa.UUID(), nullable=True),
        sa.Column("most_wins_team_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("league_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["best_player_id"], ["league_players.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["best_team_id"], ["session_teams.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE", name="fk_session_summaries_league_id_leagues"),
        sa.ForeignKeyConstraint(["most_wins_team_id"], ["session_teams.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["top_scorer_player_id"], ["league_players.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id", name="pk_session_summaries"),
        sa.UniqueConstraint("session_id", name="uq_session_summaries_session"),
    )
    op.create_index(op.f("ix_session_summaries_session_id"), "session_summaries", ["session_id"], unique=False)
    op.create_index(op.f("ix_session_summaries_top_scorer_player_id"), "session_summaries", ["top_scorer_player_id"], unique=False)
    op.create_index(op.f("ix_session_summaries_best_player_id"), "session_summaries", ["best_player_id"], unique=False)
    op.create_index(op.f("ix_session_summaries_best_team_id"), "session_summaries", ["best_team_id"], unique=False)
    op.create_index(op.f("ix_session_summaries_most_wins_team_id"), "session_summaries", ["most_wins_team_id"], unique=False)
    op.create_index(op.f("ix_session_summaries_league_id"), "session_summaries", ["league_id"], unique=False)

    op.create_table(
        "session_summary_players",
        sa.Column("session_summary_id", sa.UUID(), nullable=False),
        sa.Column("player_id", sa.UUID(), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("average_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("goals", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("assists", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("fouls", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("yellow_cards", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("red_cards", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("wins", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("matches_played", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rank_position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("league_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE", name="fk_session_summary_players_league_id_leagues"),
        sa.ForeignKeyConstraint(["player_id"], ["league_players.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_summary_id"], ["session_summaries.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_session_summary_players"),
        sa.UniqueConstraint("session_summary_id", "player_id", name="uq_session_summary_players_summary_player"),
    )
    op.create_index(op.f("ix_session_summary_players_session_summary_id"), "session_summary_players", ["session_summary_id"], unique=False)
    op.create_index(op.f("ix_session_summary_players_player_id"), "session_summary_players", ["player_id"], unique=False)
    op.create_index(op.f("ix_session_summary_players_league_id"), "session_summary_players", ["league_id"], unique=False)

    op.create_table(
        "session_summary_teams",
        sa.Column("session_summary_id", sa.UUID(), nullable=False),
        sa.Column("team_id", sa.UUID(), nullable=False),
        sa.Column("wins", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("losses", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("draws", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("matches_played", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("goals_for", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("goals_against", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("goal_difference", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("team_score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("rank_position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("league_id", sa.UUID(), nullable=False),
        sa.ForeignKeyConstraint(["league_id"], ["leagues.id"], ondelete="CASCADE", name="fk_session_summary_teams_league_id_leagues"),
        sa.ForeignKeyConstraint(["session_summary_id"], ["session_summaries.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["team_id"], ["session_teams.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id", name="pk_session_summary_teams"),
        sa.UniqueConstraint("session_summary_id", "team_id", name="uq_session_summary_teams_summary_team"),
    )
    op.create_index(op.f("ix_session_summary_teams_session_summary_id"), "session_summary_teams", ["session_summary_id"], unique=False)
    op.create_index(op.f("ix_session_summary_teams_team_id"), "session_summary_teams", ["team_id"], unique=False)
    op.create_index(op.f("ix_session_summary_teams_league_id"), "session_summary_teams", ["league_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_session_summary_teams_league_id"), table_name="session_summary_teams")
    op.drop_index(op.f("ix_session_summary_teams_team_id"), table_name="session_summary_teams")
    op.drop_index(op.f("ix_session_summary_teams_session_summary_id"), table_name="session_summary_teams")
    op.drop_table("session_summary_teams")

    op.drop_index(op.f("ix_session_summary_players_league_id"), table_name="session_summary_players")
    op.drop_index(op.f("ix_session_summary_players_player_id"), table_name="session_summary_players")
    op.drop_index(op.f("ix_session_summary_players_session_summary_id"), table_name="session_summary_players")
    op.drop_table("session_summary_players")

    op.drop_index(op.f("ix_session_summaries_league_id"), table_name="session_summaries")
    op.drop_index(op.f("ix_session_summaries_most_wins_team_id"), table_name="session_summaries")
    op.drop_index(op.f("ix_session_summaries_best_team_id"), table_name="session_summaries")
    op.drop_index(op.f("ix_session_summaries_best_player_id"), table_name="session_summaries")
    op.drop_index(op.f("ix_session_summaries_top_scorer_player_id"), table_name="session_summaries")
    op.drop_index(op.f("ix_session_summaries_session_id"), table_name="session_summaries")
    op.drop_table("session_summaries")
