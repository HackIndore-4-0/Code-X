from datetime import datetime

from app.schemas.event import NormalizedEvent


def suspicious_scenario() -> list[NormalizedEvent]:
    return [
        NormalizedEvent(
            event_id="SIM-SUS-001",
            timestamp=datetime.fromisoformat(
                "2026-09-25T09:12:00"
            ),
            event_type="login",
            user_id="USR-101",
            device_id="DEV-882",
            ip_address="10.0.0.15",
            location="Indore",
            session_id="SES-001",
            action="login",
            metadata={
                "unusual": True,
            },
        ),
        NormalizedEvent(
            event_id="SIM-SUS-002",
            timestamp=datetime.fromisoformat(
                "2026-09-25T09:18:00"
            ),
            event_type="mfa_failure",
            user_id="USR-101",
            device_id="DEV-882",
            ip_address="10.0.0.15",
            location="Indore",
            session_id="SES-001",
            action="mfa_failure",
            metadata={
                "attempts": 3,
            },
        ),
        NormalizedEvent(
            event_id="SIM-SUS-003",
            timestamp=datetime.fromisoformat(
                "2026-09-25T09:21:00"
            ),
            event_type="new_device",
            user_id="USR-101",
            device_id="DEV-882",
            ip_address="10.0.0.15",
            location="Indore",
            session_id="SES-001",
            action="new_device",
            metadata={},
        ),
        NormalizedEvent(
            event_id="SIM-SUS-004",
            timestamp=datetime.fromisoformat(
                "2026-09-25T09:25:00"
            ),
            event_type="resource_access",
            user_id="USR-101",
            device_id="DEV-882",
            ip_address="10.0.0.15",
            location="Indore",
            session_id="SES-001",
            resource="finance_db",
            action="read",
            metadata={},
        ),
        NormalizedEvent(
            event_id="SIM-SUS-005",
            timestamp=datetime.fromisoformat(
                "2026-09-25T09:31:00"
            ),
            event_type="privilege_change",
            user_id="USR-101",
            device_id="DEV-882",
            ip_address="10.0.0.15",
            location="Indore",
            session_id="SES-001",
            action="privilege_change",
            metadata={
                "new_role": "admin",
            },
        ),
        NormalizedEvent(
            event_id="SIM-SUS-006",
            timestamp=datetime.fromisoformat(
                "2026-09-25T09:35:00"
            ),
            event_type="large_transfer",
            user_id="USR-101",
            device_id="DEV-882",
            ip_address="10.0.0.15",
            location="Indore",
            session_id="SES-001",
            resource="finance_db",
            action="transfer",
            metadata={
                "size_mb": 650,
            },
        ),
    ]


def benign_scenario() -> list[NormalizedEvent]:
    return [
        NormalizedEvent(
            event_id="SIM-BEN-001",
            timestamp=datetime.fromisoformat(
                "2026-09-25T18:10:00"
            ),
            event_type="login",
            user_id="USR-202",
            device_id="DEV-202",
            ip_address="10.0.0.20",
            location="Indore",
            session_id="SES-002",
            action="login",
            metadata={
                "late_login": True,
            },
        ),
        NormalizedEvent(
            event_id="SIM-BEN-002",
            timestamp=datetime.fromisoformat(
                "2026-09-25T18:12:00"
            ),
            event_type="new_location",
            user_id="USR-202",
            device_id="DEV-202",
            ip_address="10.0.0.20",
            location="Indore",
            session_id="SES-002",
            action="vpn_login",
            metadata={
                "corporate_vpn": True,
            },
        ),
        NormalizedEvent(
            event_id="SIM-BEN-003",
            timestamp=datetime.fromisoformat(
                "2026-09-25T18:15:00"
            ),
            event_type="admin_action",
            user_id="USR-202",
            device_id="DEV-202",
            ip_address="10.0.0.20",
            location="Indore",
            session_id="SES-002",
            resource="maintenance_system",
            action="maintenance",
            metadata={
                "approved": True,
            },
        ),
        NormalizedEvent(
            event_id="SIM-BEN-004",
            timestamp=datetime.fromisoformat(
                "2026-09-25T18:30:00"
            ),
            event_type="large_transfer",
            user_id="USR-202",
            device_id="DEV-202",
            ip_address="10.0.0.20",
            location="Indore",
            session_id="SES-002",
            resource="maintenance_system",
            action="transfer",
            metadata={
                "size_mb": 500,
                "approved": True,
            },
        ),
    ]


SCENARIOS = {
    "suspicious": suspicious_scenario,
    "benign": benign_scenario,
}


def get_scenario(name: str) -> list[NormalizedEvent]:
    if name not in SCENARIOS:
        raise ValueError(
            f"Unknown simulation scenario: {name}"
        )

    return SCENARIOS[name]()
