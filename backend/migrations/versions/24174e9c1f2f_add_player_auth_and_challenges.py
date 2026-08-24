"""add_player_auth_and_challenges

Revision ID: 24174e9c1f2f
Revises: 2ba3d29f3e72
Create Date: 2026-08-24 19:47:45.832631

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

from app.auth.hash import hash_password
from sqlalchemy.dialects.postgresql import ENUM

# revision identifiers, used by Alembic.
revision: str = '24174e9c1f2f'
down_revision: Union[str, Sequence[str], None] = '2ba3d29f3e72'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # 1. Create challenge table
    op.create_table('challenge',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('sender_id', sa.Integer(), nullable=False),
        sa.Column('receiver_id', sa.Integer(), nullable=False),
        sa.Column('game_type', ENUM('RAPID', 'BLITZ', 'CLASSICAL', name='gametype', create_type=False), nullable=False),
        sa.Column('sender_color', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('scheduled_at', sa.DateTime(), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED', name='challengestatus'), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['receiver_id'], ['player.id'], ),
        sa.ForeignKeyConstraint(['sender_id'], ['player.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_challenge_game_type'), 'challenge', ['game_type'], unique=False)
    op.create_index(op.f('ix_challenge_receiver_id'), 'challenge', ['receiver_id'], unique=False)
    op.create_index(op.f('ix_challenge_sender_id'), 'challenge', ['sender_id'], unique=False)
    op.create_index(op.f('ix_challenge_status'), 'challenge', ['status'], unique=False)

    # 2. Add username and password_hash columns as nullable first
    op.add_column('player', sa.Column('username', sqlmodel.sql.sqltypes.AutoString(), nullable=True))
    op.add_column('player', sa.Column('password_hash', sqlmodel.sql.sqltypes.AutoString(), nullable=True))

    # 3. Populate credentials for existing players
    default_hash = hash_password("password123")
    connection = op.get_bind()
    players = connection.execute(sa.text("SELECT id, name FROM player")).fetchall()
    
    for p_id, p_name in players:
        normalized_username = p_name.lower().replace(" ", "")
        connection.execute(
            sa.text("UPDATE player SET username = :username, password_hash = :p_hash WHERE id = :id"),
            {"username": normalized_username, "p_hash": default_hash, "id": p_id}
        )

    # 4. Alter columns to NOT NULL and create index
    with op.batch_alter_table('player') as batch_op:
        batch_op.alter_column('username', nullable=False, existing_type=sa.String())
        batch_op.alter_column('password_hash', nullable=False, existing_type=sa.String())
        batch_op.create_index('ix_player_username', ['username'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    with op.batch_alter_table('player') as batch_op:
        batch_op.drop_index('ix_player_username')
        batch_op.drop_column('password_hash')
        batch_op.drop_column('username')

    op.drop_index(op.f('ix_challenge_status'), table_name='challenge')
    op.drop_index(op.f('ix_challenge_sender_id'), table_name='challenge')
    op.drop_index(op.f('ix_challenge_receiver_id'), table_name='challenge')
    op.drop_index(op.f('ix_challenge_game_type'), table_name='challenge')
    op.drop_table('challenge')
