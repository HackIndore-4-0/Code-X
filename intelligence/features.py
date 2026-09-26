from dataclasses import dataclass
from typing import Any, Dict, Optional

from .schemas import NormalizedEvent


@dataclass
class EventFeatures:
    event_id: str
    event_type: str
    hour: int
    day_of_week: int

    has_user: bool
    has_device: bool
    has_ip: bool
    has_location: bool
    has_session: bool
    has_resource: bool

    is_sensitive_resource: bool
    transfer_size_bytes: int

    mfa_failure: bool
    privilege_change: bool
    new_device: bool
    new_location: bool

    metadata: Dict[str, Any]


class FeatureExtractor:
    """
    Extracts deterministic security features from a normalized event.

    Metadata may contain explicit signals such as:
        mfa_failure
        new_device
        new_location
        privilege_change
    """

    SENSITIVE_RESOURCE_KEYWORDS = {
        "finance",
        "finance-db",
        "database",
        "admin",
        "admin-console",
        "production",
        "payroll",
        "credentials",
    }

    TRANSFER_SIZE_KEYS = (
        "transfer_size_bytes",
        "transfer_size",
        "bytes_transferred",
    )

    def extract(
        self,
        event: NormalizedEvent,
    ) -> EventFeatures:

        metadata = event.metadata or {}

        return EventFeatures(
            event_id=event.event_id,
            event_type=event.event_type,
            hour=event.timestamp.hour,
            day_of_week=event.timestamp.weekday(),

            has_user=bool(event.user_id),
            has_device=bool(event.device_id),
            has_ip=bool(event.ip_address),
            has_location=bool(event.location),
            has_session=bool(event.session_id),
            has_resource=bool(event.resource),

            is_sensitive_resource=self._is_sensitive_resource(
                event.resource
            ),

            transfer_size_bytes=self._get_transfer_size(
                metadata
            ),

            mfa_failure=self._get_bool(
                metadata,
                "mfa_failure",
            ),

            privilege_change=(
                event.event_type == "privilege_change"
                or self._get_bool(
                    metadata,
                    "privilege_change",
                )
            ),

            new_device=self._get_bool(
                metadata,
                "new_device",
            ),

            new_location=self._get_bool(
                metadata,
                "new_location",
            ),

            metadata=metadata,
        )

    def _get_bool(
        self,
        metadata: Dict[str, Any],
        key: str,
    ) -> bool:
        value = metadata.get(key, False)

        if isinstance(value, bool):
            return value

        if isinstance(value, str):
            return value.strip().lower() in {
                "true",
                "1",
                "yes",
                "y",
            }

        if isinstance(value, (int, float)):
            return value != 0

        return False

    def _get_transfer_size(
        self,
        metadata: Dict[str, Any],
    ) -> int:
        for key in self.TRANSFER_SIZE_KEYS:
            value = metadata.get(key)

            if value is None:
                continue

            try:
                return max(0, int(value))
            except (TypeError, ValueError):
                return 0

        return 0

    def _is_sensitive_resource(
        self,
        resource: Optional[str],
    ) -> bool:
        if not resource:
            return False

        normalized = resource.strip().lower()

        return any(
            keyword in normalized
            for keyword in self.SENSITIVE_RESOURCE_KEYWORDS
        )


def extract_features(
    event: NormalizedEvent,
) -> EventFeatures:
    extractor = FeatureExtractor()
    return extractor.extract(event)
