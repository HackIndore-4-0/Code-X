from fastapi import FastAPI

from app.api.analyst_actions import router as analyst_actions_router
from app.api.events import router as events_router
from app.api.incidents import router as incidents_router
from app.api.simulation import router as simulation_router
from app.api.explanations import router as explanations_router

from app.core.database import Base, engine

from app.models.event import Event
from app.models.incident import Incident
from app.models.incident_event import IncidentEvent
from app.models.evidence import Evidence
from app.models.correlation import Correlation
from app.models.correlation_event import CorrelationEvent
from app.models.audit_log import AuditLog
from app.models.analyst_action import AnalystAction
from app.models.mitigation_action import MitigationAction
from app.models.analyst_feedback import AnalystFeedback
from app.models.feedback_adaptation import FeedbackAdaptation


Base.metadata.create_all(bind=engine)


from fastapi.middleware.cors import CORSMiddleware
from app.api.audit import router as audit_router

app = FastAPI(
    title="TraceX API",
    description="Incident Intelligence Backend for Autonomous AI Systems",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health():
    return {
        "success": True,
        "data": {
            "status": "healthy"
        },
        "error": None,
    }


app.include_router(events_router)
app.include_router(incidents_router)
app.include_router(simulation_router)
app.include_router(analyst_actions_router)
app.include_router(explanations_router)
app.include_router(audit_router)


@app.get("/")
def root():
    return {
        "message": "TraceX API is running"
    }