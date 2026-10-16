"""add_virtual_card_table

Revision ID: ee132f190ac7
Revises: e29a278de3cb
Create Date: 2025-06-20 10:00:00.000000

NOTE: this revision was referenced by 25f03231638b (add_ratelimit_log_table) but was missing from the
repository, which made `alembic upgrade head` abort with "Can't locate revision ee132f190ac7".
It is reconstructed from backend/app/virtual_card/models.py so the migration chain is complete again.
"""

from typing import Sequence, Union

import sqlalchemy as sa
import sqlmodel
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "ee132f190ac7"
down_revision: Union[str, None] = "e29a278de3cb"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "virtualcard",
        sa.Column(
            "card_type",
            sa.Enum("Debit", "Credit", name="virtualcardtypeenum"),
            nullable=False,
        ),
        sa.Column(
            "card_brand", sa.Enum("Visa", name="virtualcardbrandenum"), nullable=False
        ),
        sa.Column(
            "currency",
            sa.Enum("USD", "EUR", "GBP", "KES", name="virtualcardcurrencyenum"),
            nullable=False,
        ),
        sa.Column(
            "card_status",
            sa.Enum(
                "Active",
                "Inactive",
                "Pending",
                "Blocked",
                "Expired",
                name="virtualcardstatusenum",
            ),
            nullable=False,
        ),
        sa.Column("daily_limit", sa.Float(), nullable=False),
        sa.Column("monthly_limit", sa.Float(), nullable=False),
        sa.Column(
            "name_on_card", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False
        ),
        sa.Column("expiry_date", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("is_physical_card_requested", sa.Boolean(), nullable=False),
        sa.Column(
            "block_reason",
            sa.Enum(
                "Lost",
                "Stolen",
                "Suspicious_Activity",
                "Customer_Request",
                name="cardblockreasonenum",
            ),
            nullable=True,
        ),
        sa.Column(
            "block_reason_description", sqlmodel.sql.sqltypes.AutoString(), nullable=True
        ),
        sa.Column("card_number", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column(
            "created_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("updated_at", postgresql.TIMESTAMP(timezone=True), nullable=False),
        sa.Column("cvv_hash", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("available_balance", sa.Float(), nullable=False),
        sa.Column("total_topped_up", sa.Float(), nullable=False),
        sa.Column(
            "last_top_up_date",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column(
            "blocked_at",
            postgresql.TIMESTAMP(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.Column("total_spend_today", sa.Float(), nullable=False),
        sa.Column("total_spent_this_month", sa.Float(), nullable=False),
        sa.Column("last_transaction_date", postgresql.TIMESTAMP(timezone=True), nullable=True),
        sa.Column("last_transaction_amount", sa.Float(), nullable=True),
        sa.Column(
            "physical_card_requested_at", postgresql.TIMESTAMP(timezone=True), nullable=True
        ),
        sa.Column("delivery_address", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("delivery_city", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column("delivery_country", sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.Column(
            "delivery_postal_code", sqlmodel.sql.sqltypes.AutoString(), nullable=True
        ),
        sa.Column(
            "physical_card_status", sqlmodel.sql.sqltypes.AutoString(), nullable=True
        ),
        sa.Column("blocked_by", sa.Uuid(), nullable=True),
        sa.Column(
            "card_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True
        ),
        sa.Column("bank_account_id", sa.Uuid(), nullable=False),
        sa.ForeignKeyConstraint(["blocked_by"], ["user.id"]),
        sa.ForeignKeyConstraint(
            ["bank_account_id"], ["bankaccount.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("virtualcard")
    op.execute("DROP TYPE IF EXISTS virtualcardtypeenum")
    op.execute("DROP TYPE IF EXISTS virtualcardbrandenum")
    op.execute("DROP TYPE IF EXISTS virtualcardcurrencyenum")
    op.execute("DROP TYPE IF EXISTS virtualcardstatusenum")
    op.execute("DROP TYPE IF EXISTS cardblockreasonenum")
