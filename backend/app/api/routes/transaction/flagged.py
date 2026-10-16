from datetime import datetime
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlmodel import SQLModel, col, select
from sqlmodel.ext.asyncio.session import AsyncSession

from backend.app.api.routes.auth.deps import CurrentUser
from backend.app.auth.models import User
from backend.app.auth.schema import RoleChoicesSchema
from backend.app.core.ai.enums import AIReviewStatusEnum
from backend.app.core.ai.models import TransactionRiskScore
from backend.app.core.db import get_session
from backend.app.transaction.models import Transaction

router = APIRouter(prefix="/transaction")


class FlaggedTransactionItem(SQLModel):
    id: UUID
    reference: str
    amount: Decimal
    description: str
    created_at: datetime
    ai_review_status: str | None = None
    risk_score: float
    risk_factors: dict
    model_version: str
    sender_name: str | None = None
    sender_email: str | None = None


class FlaggedTransactionsResponse(SQLModel):
    items: list[FlaggedTransactionItem]
    total: int


@router.get(
    "/flagged",
    response_model=FlaggedTransactionsResponse,
    status_code=status.HTTP_200_OK,
    description="Transactions the fraud model flagged and that still wait for an account executive's review.",
)
async def list_flagged_transactions(
    current_user: CurrentUser,
    session: AsyncSession = Depends(get_session),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
) -> FlaggedTransactionsResponse:
    if current_user.role not in {
        RoleChoicesSchema.ACCOUNT_EXECUTIVE,
        RoleChoicesSchema.ADMIN,
        RoleChoicesSchema.SUPER_ADMIN,
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "status": "error",
                "message": "Only account executives and administrators can view flagged transactions",
            },
        )

    rows = (
        await session.exec(
            select(Transaction, TransactionRiskScore, User)
            .join(
                TransactionRiskScore,
                TransactionRiskScore.transaction_id == Transaction.id,
            )
            .outerjoin(User, User.id == Transaction.sender_id)
            .where(Transaction.ai_review_status == AIReviewStatusEnum.FLAGGED)
            .order_by(col(Transaction.created_at).desc())
            .offset(skip)
            .limit(limit)
        )
    ).all()

    items = [
        FlaggedTransactionItem(
            id=txn.id,
            reference=txn.reference,
            amount=txn.amount,
            description=txn.description,
            created_at=txn.created_at,
            ai_review_status=str(getattr(txn.ai_review_status, "value", txn.ai_review_status)),
            risk_score=score.risk_score,
            risk_factors=score.risk_factors or {},
            model_version=score.ai_model_version,
            sender_name=sender.full_name if sender else None,
            sender_email=sender.email if sender else None,
        )
        for txn, score, sender in rows
    ]
    return FlaggedTransactionsResponse(items=items, total=len(items))
