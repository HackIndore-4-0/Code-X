from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    audit_id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
    )

    incident_id: Mapped[str | None] = mapped_column(
        ForeignKey("incidents.incident_id"),
        nullable=True,
    )

    action: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )

    actor: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    details: Mapped[dict] = mapped_column(
        JSON,
        nullable=False,
        default=dict,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )