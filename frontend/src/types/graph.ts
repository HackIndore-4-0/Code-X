/**
 * Priority classification labels.
 * Reference: CONTRACTS.md (Section 5 - Labels) & INTELLIGENCE_CONTRACT.md (Section 11 - Priority Result)
 */
export type PriorityLabel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

/**
 * Priority factors details.
 * Reference: CONTRACTS.md (Section 5 - Priority) & INTELLIGENCE_CONTRACT.md (Section 11 - Priority Result)
 */
export interface PriorityFactors {
  behavioral_anomaly: number;
  correlation_strength: number;
  asset_criticality: number;
  incident_progression: number;
  evidence_strength: number;
}

/**
 * Priority assessment result.
 * Reference: CONTRACTS.md (Section 5 - Priority) & INTELLIGENCE_CONTRACT.md (Section 11 - Priority Result)
 */
export interface Priority {
  score: number; // 0 - 100
  label: PriorityLabel;
  factors: PriorityFactors;
}

/**
 * Generic React Flow compatible GraphNode.
 * Reference: API_CONTRACT.md (Section 5 - GET /api/incidents/{incident_id}/graph)
 */
export interface GraphNode {
  id: string;
  type?: string;
  data: Record<string, unknown>;
  position?: { x: number; y: number };
}

/**
 * Generic React Flow compatible GraphEdge.
 * Reference: API_CONTRACT.md (Section 5 - GET /api/incidents/{incident_id}/graph)
 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  data?: Record<string, unknown>;
}

/**
 * Graph data response payload.
 * Reference: API_CONTRACT.md (Section 5 - GET /api/incidents/{incident_id}/graph)
 */
export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}
