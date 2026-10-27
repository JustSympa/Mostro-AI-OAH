from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel


class CalendarCard(BaseModel):
    proposal_id: uuid.UUID
    title: str
    start: datetime
    end: datetime
    description: str