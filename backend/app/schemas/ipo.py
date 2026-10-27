from __future__ import annotations

import uuid

from pydantic import BaseModel


class IpoListItem(BaseModel):
    id: uuid.UUID
    company_name: str
    symbol: str
