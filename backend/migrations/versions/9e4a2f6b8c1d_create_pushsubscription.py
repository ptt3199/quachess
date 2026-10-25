"""create_pushsubscription

Revision ID: 9e4a2f6b8c1d
Revises: 7c1d9f2a4b3e
Create Date: 2026-10-25 11:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

# revision identifiers, used by Alembic.
revision: str = '9e4a2f6b8c1d'
down_revision: Union[str, Sequence[str], None] = '7c1d9f2a4b3e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'pushsubscription',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('player_id', sa.Integer(), nullable=False),
        sa.Column('endpoint', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('p256dh', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('auth', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['player_id'], ['player.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('endpoint'),
    )
    op.create_index(op.f('ix_pushsubscription_player_id'), 'pushsubscription', ['player_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_pushsubscription_player_id'), table_name='pushsubscription')
    op.drop_table('pushsubscription')
