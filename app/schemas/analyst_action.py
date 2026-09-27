from enum import Enum

from pydantic import BaseModel

class AnalystActionType(str, Enum):
    INVESTIGATE = "INVESTIGATE"
    CONFIRM = "CONFIRM"
    DISMISS = "DISMISS"
    ESCALATE = "ESCALATE"
    RESOLVE = "RESOLVE"

class DismissReason(str, Enum):
    FALSE_POSITIVE = "false_positive"
    APPROVED_ACTIVITY = "approved_activity"
    KNOWN_ADMIN = "known_admin"
    MAINTENANCE = "maintenance"
    OTHER = "other"

class AnalystActionRequest(BaseModel):
    action: AnalystActionType
    reason: DismissReason | None = None
    analyst_id: str | None = None
