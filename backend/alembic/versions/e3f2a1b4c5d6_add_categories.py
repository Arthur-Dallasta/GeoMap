# backend/alembic/versions/e3f2a1b4c5d6_add_categories.py
"""add categories table and area category_id

Revision ID: e3f2a1b4c5d6
Revises: 1493a0f2e111
Create Date: 2026-04-13 16:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "e3f2a1b4c5d6"
down_revision: Union[str, None] = "1493a0f2e111"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("property_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("color", sa.String(length=7), nullable=False),
        sa.Column("description", sa.String(length=300), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_categories_property_id"), "categories", ["property_id"], unique=False
    )
    op.add_column("areas", sa.Column("category_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_areas_category_id",
        "areas",
        "categories",
        ["category_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_areas_category_id", "areas", type_="foreignkey")
    op.drop_column("areas", "category_id")
    op.drop_index(op.f("ix_categories_property_id"), table_name="categories")
    op.drop_table("categories")
