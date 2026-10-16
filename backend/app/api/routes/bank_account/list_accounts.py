from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlmodel import SQLModel, col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.app.api.routes.auth.deps import CurrentUser
from backend.app.auth.models import User
from backend.app.auth.schema import RoleChoicesSchema
from backend.app.bank_account.enums import AccountStatusEnum
from backend.app.bank_account.models import BankAccount
from backend.app.bank_account.schema import BankAccountReadSchema
from backend.app.core.db import get_session

router = APIRouter(prefix="/bank-account")

# roles that may see other people's accounts (tellers need them to deposit/withdraw, executives to activate)
STAFF_ROLES = {
    RoleChoicesSchema.ACCOUNT_EXECUTIVE,
    RoleChoicesSchema.TELLER,
    RoleChoicesSchema.BRANCH_MANAGER,
    RoleChoicesSchema.ADMIN,
    RoleChoicesSchema.SUPER_ADMIN,
}


class BankAccountListItemSchema(BankAccountReadSchema):
    owner_name: str | None = None
    owner_email: str | None = None
    owner_username: str | None = None


class BankAccountListResponse(SQLModel):
    items: list[BankAccountListItemSchema]
    total: int


@router.get(
    "/all",
    response_model=BankAccountListResponse,
    status_code=status.HTTP_200_OK,
    description=(
        "Customers: their own accounts. Staff (teller, account executive, managers, admins): all accounts, "
        "optionally filtered by status."
    ),
)
async def list_bank_accounts(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
    account_status: AccountStatusEnum | None = Query(default=None, alias="status"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> BankAccountListResponse:
    statement = select(BankAccount, User).join(User, User.id == BankAccount.user_id)
    if current_user.role not in STAFF_ROLES:
        statement = statement.where(BankAccount.user_id == current_user.id)
    if account_status is not None:
        statement = statement.where(BankAccount.account_status == account_status)

    rows = (
        await session.exec(
            statement.order_by(col(BankAccount.created_at).desc())
            .offset(skip)
            .limit(limit)
        )
    ).all()

    items = []
    for account, owner in rows:
        item = BankAccountListItemSchema.model_validate(account)
        item.owner_name = owner.full_name
        item.owner_email = owner.email
        item.owner_username = owner.username
        items.append(item)
    return BankAccountListResponse(items=items, total=len(items))
