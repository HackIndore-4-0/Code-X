from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class IncidentEvent(Base):
    __tablename__ = "incident_events"

    incident_id: Mapped[str] = mapped_column(
        ForeignKey("incidents.incident_id"),
        primary_key=True,
    )

    event_id: Mapped[str] = mapped_column(
        ForeignKey("events.event_id"),
        primary_key=True,
    )

    relationship: Mapped[str] = mapped_column(
        String,
        nullable=False,
    )