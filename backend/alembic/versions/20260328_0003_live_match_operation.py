"""live match operation fields

Revision ID: 20260328_0003
Revises: 20260325_0002
Create Date: 2026-03-28 00:40:00
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "20260328_0003"
down_revision = "20260325_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("match_events", sa.Column("second", sa.Integer(), server_default="0", nullable=False))
    op.add_column("match_events", sa.Column("created_by", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("match_events", sa.Column("is_reverted", sa.Boolean(), server_default="false", nullable=False))
    op.create_foreign_key(
        "fk_match_events_created_by_users",
        "match_events",
        "users",
        ["created_by"],
        ["id"],
        ondelete="SET NULL",
    )

    op.execute("ALTER TYPE matcheventtype ADD VALUE IF NOT EXISTS 'MATCH_STARTED'")
    op.execute("ALTER TYPE matcheventtype ADD VALUE IF NOT EXISTS 'HALF_TIME'")
    op.execute("ALTER TYPE matcheventtype ADD VALUE IF NOT EXISTS 'SECOND_HALF_STARTED'")
    op.execute("ALTER TYPE matcheventtype ADD VALUE IF NOT EXISTS 'MATCH_FINISHED'")

    op.alter_column("match_events", "second", server_default=None)
    op.alter_column("match_events", "is_reverted", server_default=None)


def downgrade() -> None:
    op.drop_constraint("fk_match_events_created_by_users", "match_events", type_="foreignkey")
    op.drop_column("match_events", "is_reverted")
    op.drop_column("match_events", "created_by")
    op.drop_column("match_events", "second")
