import { describe, expect, it } from 'vitest';
import type { CommandEvidence, WakeScanRecord } from '../shared/types';
import { buildEvidenceCards, findRepeatedSuspects } from './viewModel';

const command = (overrides: Partial<CommandEvidence>): CommandEvidence => ({
  command: 'powercfg /requests',
  status: 'ok',
  stdout: 'ok',
  stderr: '',
  exitCode: 0,
  durationMs: 1,
  collectedAt: '2026-06-23T12:00:00.000Z',
  ...overrides
});

const record = (headline: string, family: WakeScanRecord['diagnosis']['family']): WakeScanRecord => ({
  id: `${family}-${headline}`,
  createdAt: '2026-06-23T12:00:00.000Z',
  evidence: {
    scanId: 'scan',
    startedAt: '2026-06-23T12:00:00.000Z',
    completedAt: '2026-06-23T12:00:01.000Z',
    osVersion: 'Windows',
    commands: {
      lastwake: command({ command: 'powercfg /lastwake' }),
      waketimers: command({ command: 'powercfg /waketimers' }),
      requests: command({ command: 'powercfg /requests' }),
      wakeArmed: command({ command: 'powercfg /devicequery wake_armed' })
    },
    events: { status: 'empty', records: [] }
  },
  diagnosis: {
    family,
    confidence: 'low',
    headline,
    explanation: 'Example',
    evidenceSummary: [],
    recommendations: []
  }
});

describe('buildEvidenceCards', () => {
  it('turns administrator failures into clear user-facing cards', () => {
    const cards = buildEvidenceCards({
      scanId: 'scan',
      startedAt: '2026-06-23T12:00:00.000Z',
      completedAt: '2026-06-23T12:00:01.000Z',
      osVersion: 'Windows',
      commands: {
        lastwake: command({ command: 'powercfg /lastwake' }),
        waketimers: command({
          command: 'powercfg /waketimers',
          status: 'failed',
          stdout: '',
          stderr: 'administrator required',
          exitCode: 1,
          failureKind: 'permission-required',
          userMessage: 'Run WakeLens as administrator to collect this evidence.'
        }),
        requests: command({ command: 'powercfg /requests', status: 'empty', stdout: '' }),
        wakeArmed: command({ command: 'powercfg /devicequery wake_armed', status: 'empty', stdout: '' })
      },
      events: { status: 'empty', records: [] }
    });

    expect(cards.find((card) => card.id === 'waketimers')).toEqual(
      expect.objectContaining({
        state: 'warning',
        status: 'Needs administrator'
      })
    );
  });
});

describe('findRepeatedSuspects', () => {
  it('summarizes repeated diagnosis headlines across history', () => {
    expect(
      findRepeatedSuspects([
        record('Wake-capable devices need review', 'device'),
        record('Wake-capable devices need review', 'device'),
        record('Windows did not reveal a reliable wake source', 'unknown')
      ])
    ).toEqual([
      {
        label: 'Wake-capable devices need review',
        family: 'device',
        count: 2
      }
    ]);
  });
});
