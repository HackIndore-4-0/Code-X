from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class EventType(str, Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    MFA_FAILURE = "mfa_failure"
    MFA_SUCCESS = "mfa_success"
    NEW_DEVICE = "new_device"
    NEW_LOCATION = "new_location"
    RESOURCE_ACCESS = "resource_access"
    PRIVILEGE_CHANGE = "privilege_change"
    PASSWORD_CHANGE = "password_change"
    API_ACCESS = "api_access"
    LARGE_TRANSFER = "large_transfer"
    FILE_DOWNLOAD = "file_download"
    ADMIN_ACTION = "admin_action"
    SESSION_START = "session_start"
    SESSION_END = "session_end"


class NormalizedEvent(BaseModel):
    event_id: str
    timestamp: datetime
    event_type: EventType

    user_id: str | None = None
    device_id: str | None = None
    ip_address: str | None = None
    location: str | None = None
    session_id: str | None = None

    resource: str | None = None
    action: str | None = None

    metadata: dict[str, Any] = Field(default_factory=dict)