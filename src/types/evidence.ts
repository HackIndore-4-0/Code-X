/**
 * Allowed evidence type union.
 * Reference: CONTRACTS.md (Section 4 - Evidence types) & INTELLIGENCE_CONTRACT.md (Section 10 - Evidence Result)
 */
export type EvidenceType =
  | 'SUPPORTING'
  | 'MITIGATING'
  | 'CORRELATION'
  | 'ANOMALY'
  | 'PROGRESSION';

/**
 * Evidence data contract explaining incident creation or priority changes.
 * Reference: CONTRACTS.md (Section 4 - Evidence) & INTELLIGENCE_CONTRACT.md (Section 10 - Evidence Result)
 */
export interface Evidence {
  evidence_id: string;
  incident_id: string;
  event_id?: string;
  type: EvidenceType;
  description: string;
  impact: string;
}
