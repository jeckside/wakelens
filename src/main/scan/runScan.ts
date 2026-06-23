import { randomUUID } from 'node:crypto';
import { release, type } from 'node:os';
import type { RawScanEvidence, WakeScanRecord } from '../../shared/types';
import { analyzeWakeEvidence } from '../analyzer/analyzeWake';
import { runCommand } from '../diagnostics/commandRunner';
import { collectRecentPowerEvents } from '../diagnostics/events';

export const runWakeScan = async (): Promise<WakeScanRecord> => {
  const scanId = randomUUID();
  const startedAt = new Date().toISOString();
  const [lastwake, waketimers, requests, wakeArmed, events] = await Promise.all([
    runCommand('powercfg.exe', ['/lastwake']),
    runCommand('powercfg.exe', ['/waketimers']),
    runCommand('powercfg.exe', ['/requests']),
    runCommand('powercfg.exe', ['/devicequery', 'wake_armed']),
    collectRecentPowerEvents()
  ]);
  const completedAt = new Date().toISOString();

  const evidence: RawScanEvidence = {
    scanId,
    startedAt,
    completedAt,
    osVersion: `${type()} ${release()}`,
    commands: {
      lastwake,
      waketimers,
      requests,
      wakeArmed
    },
    events
  };

  return {
    id: scanId,
    createdAt: completedAt,
    evidence,
    diagnosis: analyzeWakeEvidence(evidence)
  };
};
