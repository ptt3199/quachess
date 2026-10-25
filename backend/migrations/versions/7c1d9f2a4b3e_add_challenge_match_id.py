"""add_challenge_match_id

Revision ID: 7c1d9f2a4b3e
Revises: 24174e9c1f2f
Create Date: 2026-10-25 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7c1d9f2a4b3e'
down_revision: Union[str, Sequence[str], None] = '24174e9c1f2f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('challenge', sa.Column('match_id', sa.Integer(), nullable=True))
    # SQLite cannot ALTER in FK constraints; FK enforcement there is optional anyway.
    if op.get_bind().dialect.name != 'sqlite':
        op.create_foreign_key('fk_challenge_match_id', 'challenge', 'match', ['match_id'], ['id'])


def downgrade() -> None:
    """Downgrade schema."""
    if op.get_bind().dialect.name != 'sqlite':
        op.drop_constraint('fk_challenge_match_id', 'challenge', type_='foreignkey')
    op.drop_column('challenge', 'match_id')
