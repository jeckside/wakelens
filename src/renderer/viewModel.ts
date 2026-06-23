import type { CommandEvidence, EvidenceStatus, RawScanEvidence, WakeScanRecord } from '../shared/types';

export type EvidenceCardState = 'good' | 'neutral' | 'warning' | 'error';

export interface EvidenceCard {
  id: keyof RawScanEvidence['commands'] | 'events';
  title: string;
  status: string;
  detail: string;
  state: EvidenceCardState;
}

export interface RepeatedSuspect {
  label: string;
  family: WakeScanRecord['diagnosis']['family'];
  count: number;
}

const commandTitles: Record<keyof RawScanEvidence['commands'], string> = {
  lastwake: 'Last wake source',
  waketimers: 'Wake timers',
  requests: 'Power requests',
  wakeArmed: 'Wake-capable devices'
};

const statusLabel = (status: EvidenceStatus): string => {
  if (status === 'ok') return 'Collected';
  if (status === 'empty') return 'No data';
  return 'Could not check';
};

const stateForCommand = (command: CommandEvidence): EvidenceCardState => {
  if (command.status === 'ok') return 'good';
  if (command.status === 'empty') return 'neutral';
  if (command.failureKind === 'permission-required') return 'warning';
  return 'error';
};

const detailForCommand = (command: CommandEvidence): string => {
  if (command.failureKind === 'permission-required') {
    return command.userMessage || 'Run WakeLens as administrator to collect this evidence.';
  }
  if (command.status === 'ok') {
    return 'Windows returned diagnostic output for this check.';
  }
  if (command.status === 'empty') {
    return 'Windows returned no entries for this check.';
  }
  return command.userMessage || command.stderr || 'Windows returned an error for this check.';
};

const cardForCommand = (id: keyof RawScanEvidence['commands'], command: CommandEvidence): EvidenceCard => ({
  id,
  title: commandTitles[id],
  status: command.failureKind === 'permission-required' ? 'Needs administrator' : statusLabel(command.status),
  detail: detailForCommand(command),
  state: stateForCommand(command)
});

export const buildEvidenceCards = (evidence: RawScanEvidence): EvidenceCard[] => [
  cardForCommand('lastwake', evidence.commands.lastwake),
  cardForCommand('waketimers', evidence.commands.waketimers),
  cardForCommand('requests', evidence.commands.requests),
  cardForCommand('wakeArmed', evidence.commands.wakeArmed),
  {
    id: 'events',
    title: 'Power event log',
    status: statusLabel(evidence.events.status),
    detail:
      evidence.events.status === 'ok'
        ? `${evidence.events.records.length} recent power event records found.`
        : evidence.events.error || 'No recent Power-Troubleshooter events were available.',
    state: evidence.events.status === 'failed' ? 'warning' : evidence.events.status === 'ok' ? 'good' : 'neutral'
  }
];

export const findRepeatedSuspects = (history: WakeScanRecord[]): RepeatedSuspect[] => {
  const counts = new Map<string, RepeatedSuspect>();

  for (const record of history) {
    if (record.diagnosis.family === 'unknown') continue;
    const key = `${record.diagnosis.family}:${record.diagnosis.headline}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, {
        label: record.diagnosis.headline,
        family: record.diagnosis.family,
        count: 1
      });
    }
  }

  return [...counts.values()].filter((item) => item.count > 1).sort((left, right) => right.count - left.count);
};
