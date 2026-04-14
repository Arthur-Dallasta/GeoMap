"""add areas table

Revision ID: 1493a0f2e111
Revises: 7064f49ca872
Create Date: 2026-04-13 14:09:27.626386

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geometry


# revision identifiers, used by Alembic.
revision: str = '1493a0f2e111'
down_revision: Union[str, None] = '7064f49ca872'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.create_table(
        'areas',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('property_id', sa.UUID(), nullable=False),
        sa.Column('type', sa.String(length=10), nullable=False),
        sa.Column(
            'geometry',
            Geometry(geometry_type='GEOMETRY', srid=4326),
            nullable=False,
        ),
        sa.Column(
            'created_at',
            sa.DateTime(timezone=True),
            server_default=sa.text('now()'),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(['property_id'], ['properties.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_areas_property_id'), 'areas', ['property_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_areas_property_id'), table_name='areas')
    op.drop_table('areas')
