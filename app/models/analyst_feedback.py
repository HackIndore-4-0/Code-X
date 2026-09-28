from datetime import datetime
from sqlalchemy import Column, DateTime, String, Text

from app.core.database import Base


class AnalystFeedback(Base):
    __tablename__ = "analyst_feedback"

    id = Column(String(50), primary_key=True)
    incident_id = Column(String(50), nullable=False, index=True)
    feedback_type = Column(String(50), nullable=False)
    reason = Column(Text, nullable=True)
    analyst_id = Column(String(50), nullable=False, default="analyst")
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False)
