from datetime import datetime

from sqlalchemy import DateTime, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class Correlation(Base):
    __tablename__ = "correlations"

    correlation_id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
    )

    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    strength: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )