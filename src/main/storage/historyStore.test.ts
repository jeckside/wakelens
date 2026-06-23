import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { WakeScanRecord } from '../../shared/types';
import { HistoryStore } from './historyStore';

let tempDir = '';

const record = (id: string): WakeScanRecord => ({
  id,
  createdAt: id === 'newer' ? '2026-06-23T12:01:00.000Z' : '2026-06-23T12:00:00.000Z',
  evidence: {
    scanId: id,
    startedAt: '2026-06-23T12:00:00.000Z',
    completedAt: '2026-06-23T12:00:01.000Z',
    osVersion: 'Windows',
    commands: {
      lastwake: { command: 'powercfg /lastwake', status: 'empty', stdout: '', stderr: '', exitCode: 0, durationMs: 1, collectedAt: '2026-06-23T12:00:00.000Z' },
      waketimers: { command: 'powercfg /waketimers', status: 'empty', stdout: '', stderr: '', exitCode: 0, durationMs: 1, collectedAt: '2026-06-23T12:00:00.000Z' },
      requests: { command: 'powercfg /requests', status: 'empty', stdout: '', stderr: '', exitCode: 0, durationMs: 1, collectedAt: '2026-06-23T12:00:00.000Z' },
      wakeArmed: { command: 'powercfg /devicequery wake_armed', status: 'empty', stdout: '', stderr: '', exitCode: 0, durationMs: 1, collectedAt: '2026-06-23T12:00:00.000Z' }
    },
    events: { status: 'empty', records: [] }
  },
  diagnosis: {
    family: 'unknown',
    confidence: 'unknown',
    headline: 'Unknown',
    explanation: 'No evidence',
    evidenceSummary: [],
    recommendations: []
  }
});

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = '';
});

describe('HistoryStore', () => {
  it('persists records newest first', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'wakelens-'));
    const store = new HistoryStore(join(tempDir, 'history.json'));

    await store.add(record('older'));
    await store.add(record('newer'));

    expect((await store.list()).map((item) => item.id)).toEqual(['newer', 'older']);
  });
});
