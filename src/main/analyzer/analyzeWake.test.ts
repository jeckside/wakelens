import { describe, expect, it } from 'vitest';
import type { CommandEvidence, RawScanEvidence } from '../../shared/types';
import { analyzeWakeEvidence } from './analyzeWake';

const command = (commandText: string, stdout: string): CommandEvidence => ({
  command: commandText,
  status: stdout ? 'ok' : 'empty',
  stdout,
  stderr: '',
  exitCode: 0,
  durationMs: 10,
  collectedAt: '2026-06-23T12:00:00.000Z'
});

const baseEvidence = (overrides: Partial<RawScanEvidence['commands']>): RawScanEvidence => ({
  scanId: 'scan-1',
  startedAt: '2026-06-23T12:00:00.000Z',
  completedAt: '2026-06-23T12:00:01.000Z',
  osVersion: 'Microsoft Windows 11 Pro',
  activePowerPlan: 'Balanced',
  commands: {
    lastwake: command('powercfg /lastwake', ''),
    waketimers: command('powercfg /waketimers', ''),
    requests: command('powercfg /requests', ''),
    wakeArmed: command('powercfg /devicequery wake_armed', ''),
    ...overrides
  },
  events: {
    status: 'empty',
    records: []
  }
});

describe('analyzeWakeEvidence', () => {
  it('classifies concrete device wake as high confidence', () => {
    const diagnosis = analyzeWakeEvidence(
      baseEvidence({
        lastwake: command(
          'powercfg /lastwake',
          ['Wake Source Count - 1', 'Type: Device', 'Friendly Name: USB Composite Device', 'Description: USB Composite Device'].join(
            '\n'
          )
        )
      })
    );

    expect(diagnosis.family).toBe('device');
    expect(diagnosis.confidence).toBe('high');
    expect(diagnosis.headline).toContain('USB Composite Device');
  });

  it('classifies active wake timer as medium confidence when lastwake is unknown', () => {
    const diagnosis = analyzeWakeEvidence(
      baseEvidence({
        lastwake: command('powercfg /lastwake', 'Wake Source Count - 0'),
        waketimers: command(
          'powercfg /waketimers',
          "Timer set by [SERVICE] \\Device\\HarddiskVolume3\\Windows\\System32\\svchost.exe (SystemEventsBroker) expires at 03:00:00 on 2026-06-24.\n  Reason: Windows will execute 'NT TASK\\Microsoft\\Windows\\UpdateOrchestrator\\Schedule Wake To Work'"
        )
      })
    );

    expect(diagnosis.family).toBe('timer');
    expect(diagnosis.confidence).toBe('medium');
    expect(diagnosis.recommendations[0].title).toContain('wake timer');
  });

  it('returns unknown when Windows exposes no reliable source', () => {
    const diagnosis = analyzeWakeEvidence(
      baseEvidence({
        lastwake: command('powercfg /lastwake', 'Wake Source Count - 0')
      })
    );

    expect(diagnosis.family).toBe('unknown');
    expect(diagnosis.confidence).toBe('unknown');
    expect(diagnosis.explanation).toContain('Windows did not expose');
  });
});
