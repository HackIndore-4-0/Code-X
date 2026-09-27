export interface ThreatSignal {
  id: string;
  name: string;
  weight: number;
  description: string;
}

export interface ThreatScoreData {
  incident_id: string;
  threat_score: number; // Strictly 0 - 79
  severity: 'Low' | 'Moderate' | 'High' | 'Critical';
  explanation: string;
  signals: ThreatSignal[];
  associated_event_ids: string[];
}

/**
 * Severity classification bands for demo:
 *  0 - 19: Low
 * 20 - 39: Moderate
 * 40 - 59: High
 * 60 - 79: Critical (Strictly capped < 80)
 */
export function getThreatSeverity(score: number): 'Low' | 'Moderate' | 'High' | 'Critical' {
  const capped = Math.min(79, Math.max(0, score));
  if (capped >= 60) return 'Critical';
  if (capped >= 40) return 'High';
  if (capped >= 20) return 'Moderate';
  return 'Low';
}

// ─── Centralized Mock Threat Score Provider ─────────────────────────────────
// TODO: Replace this mock provider with real backend dataset service / API endpoint
const MOCK_THREAT_SCORES: Record<string, ThreatScoreData> = {
  'INC-001': {
    incident_id: 'INC-001',
    threat_score: 72, // Mandatory requirement: 72/100 for INC-001
    severity: 'Critical',
    explanation: 'Correlated MFA bypass attempt followed by unauthorized privilege escalation and bulk database egress.',
    signals: [
      { id: 'SIG-01', name: 'Impossible Travel Anomaly', weight: 25, description: 'Login attempt from Bucharest following active Indore session.' },
      { id: 'SIG-02', name: 'MFA Push Spray Failure', weight: 18, description: 'Multiple TOTP validation errors prior to session binding.' },
      { id: 'SIG-03', name: 'Unauthorized DB Role Escalation', weight: 20, description: 'Granted db_admin role without ticket approval.' },
      { id: 'SIG-04', name: 'Unusual Data Exfiltration Volume', weight: 9, description: '4.85 GB outbound egress to external storage bucket.' },
    ],
    associated_event_ids: ['EVT-001', 'EVT-002', 'EVT-003', 'EVT-004', 'EVT-005', 'EVT-006'],
  },
  'INC-002': {
    incident_id: 'INC-002',
    threat_score: 54,
    severity: 'High',
    explanation: 'Suspicious credential access and multiple failed authentication attempts on sensitive endpoint.',
    signals: [
      { id: 'SIG-11', name: 'Repeated Authentication Failure', weight: 30, description: '5 failed login attempts in 2 minutes.' },
      { id: 'SIG-12', name: 'Unregistered Endpoint Access', weight: 24, description: 'Connection initiated from unmanaged workstation.' },
    ],
    associated_event_ids: ['EVT-010', 'EVT-011'],
  },
  'INC-003': {
    incident_id: 'INC-003',
    threat_score: 38,
    severity: 'Moderate',
    explanation: 'Unusual off-hours API query volume from internal service account.',
    signals: [
      { id: 'SIG-21', name: 'Off-Hours Activity Spike', weight: 38, description: 'API requests 3x above baseline at 03:00 UTC.' },
    ],
    associated_event_ids: ['EVT-020'],
  },
};

/**
 * Retrieves Threat Score data for a given incident ID.
 * All returned scores are strictly bounded between 0 and 79.
 */
export function getThreatScoreForIncident(incidentId: string = 'INC-001'): ThreatScoreData {
  const data = MOCK_THREAT_SCORES[incidentId];
  if (data) {
    const cappedScore = Math.min(79, Math.max(0, data.threat_score));
    return {
      ...data,
      threat_score: cappedScore,
      severity: getThreatSeverity(cappedScore),
    };
  }

  // Fallback for unlisted or custom incident IDs (strictly capped at 65)
  const fallbackScore = 65;
  return {
    incident_id: incidentId,
    threat_score: fallbackScore,
    severity: getThreatSeverity(fallbackScore),
    explanation: 'Correlated anomalous activity patterns detected across telemetry events.',
    signals: [
      { id: 'SIG-GEN-1', name: 'Anomalous Behavior Flag', weight: 35, description: 'Statistical deviation from baseline profile.' },
      { id: 'SIG-GEN-2', name: 'Resource Access Outlier', weight: 30, description: 'Access to high criticality target asset.' },
    ],
    associated_event_ids: [],
  };
}

/**
 * Dynamic Threat Score calculation during simulation replay steps.
 * Step 0: 0/100
 * Step 1: 15/100
 * Step 2: 32/100
 * Step 3: 48/100
 * Step 4: 58/100
 * Step 5: 66/100
 * Step 6: 72/100 (Max capped at 72 for INC-001 / < 80)
 */
export function getSimulationThreatScore(currentStep: number, scenario: string): number {
  if (scenario === 'benign') {
    return Math.min(15, currentStep * 5);
  }

  const stepScores = [0, 15, 32, 48, 58, 66, 72];
  const score = stepScores[Math.min(currentStep, stepScores.length - 1)] ?? 0;
  return Math.min(79, score); // Strict upper bound < 80
}
