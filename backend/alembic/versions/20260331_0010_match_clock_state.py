"""add persisted match clock state

Revision ID: 20260331_0010
Revises: 20260331_0009
Create Date: 2026-03-31 23:40:00.000000
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "20260331_0010"
down_revision: str | Sequence[str] | None = "20260331_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("matches", sa.Column("current_period", sa.String(length=40), nullable=False, server_default="NOT_STARTED"))
    op.add_column("matches", sa.Column("period_started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("matches", sa.Column("elapsed_seconds", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("matches", sa.Column("is_clock_running", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("matches", sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True))

    op.execute(
        """
        UPDATE matches
        SET current_period = CASE
            WHEN status = 'HALF_TIME' THEN 'HALF_TIME'
            WHEN status = 'FINISHED' THEN 'FINISHED'
            WHEN status = 'LIVE' THEN 'FIRST_HALF'
            ELSE 'NOT_STARTED'
        END,
        is_clock_running = CASE WHEN status = 'LIVE' THEN true ELSE false END
        """
    )


def downgrade() -> None:
    op.drop_column("matches", "finished_at")
    op.drop_column("matches", "is_clock_running")
    op.drop_column("matches", "elapsed_seconds")
    op.drop_column("matches", "period_started_at")
    op.drop_column("matches", "current_period")
