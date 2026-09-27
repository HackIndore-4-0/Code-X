from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class MitigationAction(Base):
    __tablename__ = "mitigation_actions"

    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        index=True,
    )

    incident_id: Mapped[str] = mapped_column(
        ForeignKey("incidents.incident_id"),
        nullable=False,
        index=True,
    )

    action: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    entity_type: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    entity_value: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    user_id: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    flagged_ip: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    threat_weight: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    threshold: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    webhook_status: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    remediation_status: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    response: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    payload: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )
