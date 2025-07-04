"""add bukti setor

Revision ID: af1e60c82bf9
Revises: 
Create Date: 2025-06-26 22:12:05.034866

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'af1e60c82bf9'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.drop_table('dokumen_pajak')
    # ### end Alembic commands ###


def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.create_table('dokumen_pajak',
    sa.Column('id', sa.INTEGER(), autoincrement=True, nullable=False),
    sa.Column('dpp', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.Column('ppn', sa.VARCHAR(length=50), autoincrement=False, nullable=True),
    sa.PrimaryKeyConstraint('id', name=op.f('dokumen_pajak_pkey'))
    )
    # ### end Alembic commands ###
