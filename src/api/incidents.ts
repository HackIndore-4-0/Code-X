import type { ApiResponse } from '../types/api';
import type { NormalizedEvent } from '../types/event';
import type { Incident, AnalystAction, AuditLogEntry } from '../types/incident';
import type { Evidence } from '../types/evidence';
import type { GraphData } from '../types/graph';
import {
  getIncidents,
  getIncident,
  getIncidentTimeline,
  getIncidentEvidence,
  getIncidentGraph,
  getIncidentAudit,
  performAnalystAction,
  explainIncident,
  type ExplainResponse,
} from '../services/incidents';

export const fetchIncidents = async (): Promise<ApiResponse<Incident[]>> => {
  return getIncidents();
};

export const fetchIncidentDetail = async (incidentId: string): Promise<ApiResponse<Incident>> => {
  return getIncident(incidentId);
};

export const fetchIncidentTimeline = async (incidentId: string): Promise<ApiResponse<NormalizedEvent[]>> => {
  return getIncidentTimeline(incidentId);
};

export const fetchIncidentEvidence = async (incidentId: string): Promise<ApiResponse<Evidence[]>> => {
  return getIncidentEvidence(incidentId);
};

export const fetchIncidentGraph = async (incidentId: string): Promise<ApiResponse<GraphData>> => {
  return getIncidentGraph(incidentId);
};

export const fetchIncidentAudit = async (incidentId: string): Promise<ApiResponse<AuditLogEntry[]>> => {
  return getIncidentAudit(incidentId);
};

export const postAnalystAction = async (
  incidentId: string,
  action: AnalystAction
): Promise<ApiResponse<{ incident_id: string; status: string }>> => {
  return performAnalystAction(incidentId, action);
};

export const postExplainIncident = async (incidentId: string): Promise<ApiResponse<ExplainResponse>> => {
  return explainIncident(incidentId);
};
