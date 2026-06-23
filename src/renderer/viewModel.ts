import type { CommandEvidence, EvidenceStatus, RawScanEvidence, WakeScanRecord } from '../shared/types';
import { defaultLocale, t, type LocaleCode } from '../shared/i18n';

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

const commandTitleKeys: Record<keyof RawScanEvidence['commands'], Parameters<typeof t>[1]> = {
  lastwake: 'ui.check.lastwake',
  waketimers: 'ui.check.waketimers',
  requests: 'ui.check.requests',
  wakeArmed: 'ui.check.wakeArmed'
};

const statusLabel = (status: EvidenceStatus, locale: LocaleCode): string => {
  if (status === 'ok') return t(locale, 'ui.check.status.collected');
  if (status === 'empty') return t(locale, 'ui.check.status.noData');
  return t(locale, 'ui.check.status.failed');
};

const stateForCommand = (command: CommandEvidence): EvidenceCardState => {
  if (command.status === 'ok') return 'good';
  if (command.status === 'empty') return 'neutral';
  if (command.failureKind === 'permission-required') return 'warning';
  return 'error';
};

const detailForCommand = (command: CommandEvidence, locale: LocaleCode): string => {
  if (command.failureKind === 'permission-required') {
    return t(locale, 'ui.check.detail.needsAdmin');
  }
  if (command.status === 'ok') {
    return t(locale, 'ui.check.detail.ok');
  }
  if (command.status === 'empty') {
    return t(locale, 'ui.check.detail.empty');
  }
  return command.userMessage || command.stderr || t(locale, 'ui.check.detail.error');
};

const cardForCommand = (id: keyof RawScanEvidence['commands'], command: CommandEvidence, locale: LocaleCode): EvidenceCard => ({
  id,
  title: t(locale, commandTitleKeys[id]),
  status: command.failureKind === 'permission-required' ? t(locale, 'ui.check.status.needsAdmin') : statusLabel(command.status, locale),
  detail: detailForCommand(command, locale),
  state: stateForCommand(command)
});

export const buildEvidenceCards = (evidence: RawScanEvidence, locale: LocaleCode = defaultLocale): EvidenceCard[] => [
  cardForCommand('lastwake', evidence.commands.lastwake, locale),
  cardForCommand('waketimers', evidence.commands.waketimers, locale),
  cardForCommand('requests', evidence.commands.requests, locale),
  cardForCommand('wakeArmed', evidence.commands.wakeArmed, locale),
  {
    id: 'events',
    title: t(locale, 'ui.check.events'),
    status: statusLabel(evidence.events.status, locale),
    detail:
      evidence.events.status === 'ok'
        ? t(locale, 'ui.check.detail.eventsOk', { count: evidence.events.records.length })
        : evidence.events.error || t(locale, 'ui.check.detail.eventsEmpty'),
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
