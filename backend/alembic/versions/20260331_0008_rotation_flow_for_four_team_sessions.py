"""rotation flow for four-team sessions

Revision ID: 20260331_0008
Revises: 20260331_0007
Create Date: 2026-03-31 00:08:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260331_0008"
down_revision = "20260331_0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sessions", sa.Column("flow_phase", sa.String(length=40), nullable=False, server_default="INITIAL_STAGE"))
    op.add_column("sessions", sa.Column("current_staying_team_id", sa.UUID(), nullable=True))
    op.add_column("sessions", sa.Column("challenger_team_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_sessions_current_staying_team_id_session_teams",
        "sessions",
        "session_teams",
        ["current_staying_team_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_sessions_challenger_team_id_session_teams",
        "sessions",
        "session_teams",
        ["challenger_team_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column("session_teams", sa.Column("queue_order", sa.Integer(), nullable=False, server_default="0"))

    op.add_column("matches", sa.Column("winner_team_id", sa.UUID(), nullable=True))
    op.add_column("matches", sa.Column("loser_team_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_matches_winner_team_id_session_teams",
        "matches",
        "session_teams",
        ["winner_team_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_matches_loser_team_id_session_teams",
        "matches",
        "session_teams",
        ["loser_team_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_matches_loser_team_id_session_teams", "matches", type_="foreignkey")
    op.drop_constraint("fk_matches_winner_team_id_session_teams", "matches", type_="foreignkey")
    op.drop_column("matches", "loser_team_id")
    op.drop_column("matches", "winner_team_id")

    op.drop_column("session_teams", "queue_order")

    op.drop_constraint("fk_sessions_challenger_team_id_session_teams", "sessions", type_="foreignkey")
    op.drop_constraint("fk_sessions_current_staying_team_id_session_teams", "sessions", type_="foreignkey")
    op.drop_column("sessions", "challenger_team_id")
    op.drop_column("sessions", "current_staying_team_id")
    op.drop_column("sessions", "flow_phase")
