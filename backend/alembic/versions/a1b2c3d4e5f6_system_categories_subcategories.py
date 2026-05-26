# backend/alembic/versions/a1b2c3d4e5f6_system_categories_subcategories.py
"""system categories and subcategories

Revision ID: a1b2c3d4e5f6
Revises: e3f2a1b4c5d6
Create Date: 2026-05-15 18:00:00.000000
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, None] = "e3f2a1b4c5d6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Clear existing per-property category assignments (old data will be gone)
    op.execute("UPDATE areas SET category_id = NULL")

    # Drop FK from areas.category_id and old categories table
    op.drop_constraint("fk_areas_category_id", "areas", type_="foreignkey")
    op.drop_index("ix_categories_property_id", table_name="categories")
    op.drop_table("categories")

    # Create new global system categories table (no property_id)
    op.create_table(
        "categories",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("key", sa.String(50), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(7), nullable=False),
        sa.Column("description", sa.String(300), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("key", name="uq_categories_key"),
    )

    # Seed the 6 system categories
    op.execute(
        "INSERT INTO categories (id, key, name, color, description) VALUES "
        "('a0000000-0000-0000-0000-000000000001', 'app', 'Área de Proteção Permanente', '#FF4500', NULL), "
        "('a0000000-0000-0000-0000-000000000002', 'benfeitoria', 'Área de benfeitorias', '#FF00FF', NULL), "
        "('a0000000-0000-0000-0000-000000000003', 'producao_vegetal', 'Área de produção vegetal', '#FFFF00', NULL), "
        "('a0000000-0000-0000-0000-000000000004', 'producao_animal', 'Área de produção animal', '#FF0000', NULL), "
        "('a0000000-0000-0000-0000-000000000005', 'recurso_hidrico', 'Área de recurso hídrico', '#0000FF', NULL), "
        "('a0000000-0000-0000-0000-000000000006', 'outro', 'Outro', '#713600', NULL)"
    )

    # Re-add FK from areas.category_id → new categories.id
    op.create_foreign_key(
        "fk_areas_category_id",
        "areas",
        "categories",
        ["category_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # Create subcategories table (per-property, tied to a system category)
    op.create_table(
        "subcategories",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("category_id", sa.UUID(), nullable=False),
        sa.Column("property_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.String(300), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_subcategories_property_id", "subcategories", ["property_id"])

    # Add subcategory_id to areas
    op.add_column("areas", sa.Column("subcategory_id", sa.UUID(), nullable=True))
    op.create_foreign_key(
        "fk_areas_subcategory_id",
        "areas",
        "subcategories",
        ["subcategory_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint("fk_areas_subcategory_id", "areas", type_="foreignkey")
    op.drop_column("areas", "subcategory_id")
    op.drop_index("ix_subcategories_property_id", table_name="subcategories")
    op.drop_table("subcategories")
    op.drop_constraint("fk_areas_category_id", "areas", type_="foreignkey")
    op.drop_table("categories")
    # Restore original per-property categories table (data not restored)
    op.create_table(
        "categories",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("property_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("color", sa.String(7), nullable=False),
        sa.Column("description", sa.String(300), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["property_id"], ["properties.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_categories_property_id", "categories", ["property_id"])
    op.create_foreign_key(
        "fk_areas_category_id",
        "areas",
        "categories",
        ["category_id"],
        ["id"],
        ondelete="SET NULL",
    )
