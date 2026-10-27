from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps.auth import get_current_user
from app.models import IPO, User
from app.schemas.ipo import IpoListItem

router = APIRouter(prefix="/ipos", tags=["ipos"])


@router.get("", response_model=list[IpoListItem])
async def list_ipos(
    _user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> list[IpoListItem]:
    """List the issuers the signed-in user can ask the assistant about."""
    result = await session.execute(
        select(IPO.id, IPO.company_name, IPO.symbol)
        .where(IPO.status == "active")
        .order_by(IPO.company_name)
    )
    return [
        IpoListItem(id=row.id, company_name=row.company_name, symbol=row.symbol)
        for row in result
    ]
