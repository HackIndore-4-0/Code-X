from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String

from app.core.database import Base


class FeedbackAdaptation(Base):
    __tablename__ = "feedback_adaptations"

    id = Column(String(50), primary_key=True)
    pattern_key = Column(String(100), nullable=False, unique=True, index=True)
    false_positive_count = Column(Integer, default=0, nullable=False)
    total_feedback_count = Column(Integer, default=0, nullable=False)
    suppression_factor = Column(Float, default=1.0, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, nullable=False)
