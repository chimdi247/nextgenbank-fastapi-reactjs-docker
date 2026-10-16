from datetime import date, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import SQLModel, col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.app.api.routes.auth.deps import CurrentUser
from backend.app.auth.models import User
from backend.app.auth.schema import RoleChoicesSchema
from backend.app.bank_account.models import BankAccount
from backend.app.core.db import get_session
from backend.app.virtual_card.enums import VirtualCardStatusEnum
from backend.app.virtual_card.models import VirtualCard

router = APIRouter(prefix="/virtual-card")


class VirtualCardListItem(SQLModel):
    """Never contains the full card number or the CVV."""

    id: UUID
    bank_account_id: UUID
    card_type: str
    card_brand: str
    currency: str
    card_status: str
    name_on_card: str
    masked_card_number: str
    expiry_date: date
    available_balance: float
    daily_limit: float
    monthly_limit: float
    total_spend_today: float
    total_spent_this_month: float
    is_active: bool
    created_at: datetime
    owner_name: str | None = None
    owner_email: str | None = None


class VirtualCardListResponse(SQLModel):
    items: list[VirtualCardListItem]
    total: int


def _enum(value) -> str:
    return str(getattr(value, "value", value))


@router.get(
    "/all",
    response_model=VirtualCardListResponse,
    status_code=status.HTTP_200_OK,
    description="Customers: their own cards. Account executives / admins: all cards, optionally filtered by status.",
)
async def list_cards(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
    card_status: VirtualCardStatusEnum | None = Query(default=None, alias="status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> VirtualCardListResponse:
    statement = (
        select(VirtualCard, BankAccount, User)
        .join(BankAccount, BankAccount.id == VirtualCard.bank_account_id)
        .join(User, User.id == BankAccount.user_id)
    )
    if current_user.role not in {
        RoleChoicesSchema.ACCOUNT_EXECUTIVE,
        RoleChoicesSchema.ADMIN,
        RoleChoicesSchema.SUPER_ADMIN,
    }:
        statement = statement.where(BankAccount.user_id == current_user.id)
    if card_status is not None:
        statement = statement.where(VirtualCard.card_status == card_status)

    rows = (
        await session.exec(
            statement.order_by(col(VirtualCard.created_at).desc())
            .offset(skip)
            .limit(limit)
        )
    ).all()

    items = [
        VirtualCardListItem(
            id=card.id,
            bank_account_id=card.bank_account_id,
            card_type=_enum(card.card_type),
            card_brand=_enum(card.card_brand),
            currency=_enum(card.currency),
            card_status=_enum(card.card_status),
            name_on_card=card.name_on_card,
            masked_card_number=card.masked_card_number,
            expiry_date=card.expiry_date,
            available_balance=card.available_balance,
            daily_limit=card.daily_limit,
            monthly_limit=card.monthly_limit,
            total_spend_today=card.total_spend_today,
            total_spent_this_month=card.total_spent_this_month,
            is_active=card.is_active,
            created_at=card.created_at,
            owner_name=owner.full_name,
            owner_email=owner.email,
        )
        for card, _account, owner in rows
    ]
    return VirtualCardListResponse(items=items, total=len(items))
