"""users last_seen_at column

Revision ID: 20260425_0013
Revises: 20260425_0012
Create Date: 2026-04-25 00:00:00
"""

from alembic import op
import sqlalchemy as sa


revision = "20260425_0013"
down_revision = "20260425_0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "last_seen_at")
