export type Confidence = 'high' | 'medium' | 'low' | 'unknown';
export type CauseFamily = 'device' | 'timer' | 'power-request' | 'immediate-wake' | 'unknown';
export type EvidenceStatus = 'ok' | 'empty' | 'failed';

export interface CommandEvidence {
  command: string;
  status: EvidenceStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  collectedAt: string;
}

export interface PowerEvent {
  timeCreated: string;
  providerName: string;
  id: number;
  message: string;
}

export interface ParsedLastWake {
  sourceCount: number;
  type?: string;
  friendlyName?: string;
  instancePath?: string;
  description?: string;
  manufacturer?: string;
}

export interface ParsedWakeTimer {
  process?: string;
  task?: string;
  expiresAt?: string;
  reason?: string;
  raw: string;
}

export interface ParsedPowerRequest {
  category: string;
  requester: string;
  reason?: string;
}

export interface RawScanEvidence {
  scanId: string;
  startedAt: string;
  completedAt: string;
  osVersion: string;
  activePowerPlan?: string;
  commands: {
    lastwake: CommandEvidence;
    waketimers: CommandEvidence;
    requests: CommandEvidence;
    wakeArmed: CommandEvidence;
  };
  events: {
    status: EvidenceStatus;
    records: PowerEvent[];
    error?: string;
  };
}

export interface Recommendation {
  title: string;
  body: string;
  actionLabel?: string;
  command?: string;
}

export interface Diagnosis {
  family: CauseFamily;
  confidence: Confidence;
  headline: string;
  explanation: string;
  evidenceSummary: string[];
  recommendations: Recommendation[];
}

export interface WakeScanRecord {
  id: string;
  createdAt: string;
  evidence: RawScanEvidence;
  diagnosis: Diagnosis;
}

export interface ExportedReport {
  filename: string;
  content: string;
  format: 'markdown' | 'json';
}
