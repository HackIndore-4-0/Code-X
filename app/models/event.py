from datetime import datetime

from sqlalchemy import DateTime, JSON, String, Index
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Event(Base):
    __tablename__ = "events"

    event_id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        index=True,
    )

    timestamp: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        index=True,
    )

    event_type: Mapped[str] = mapped_column(
        String,
        nullable=False,
        index=True,
    )

    user_id: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
        index=True,
    )

    device_id: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
        index=True,
    )

    ip_address: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
        index=True,
    )

    location: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    session_id: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
        index=True,
    )

    resource: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
        index=True,
    )

    action: Mapped[str | None] = mapped_column(
        String,
        nullable=True,
    )

    event_metadata: Mapped[dict] = mapped_column(
        "metadata",
        JSON,
        nullable=False,
        default=dict,
    )

    __table_args__ = (
        Index("ix_events_user_time", "user_id", "timestamp"),
        Index("ix_events_type_time", "event_type", "timestamp"),
    )