import { describe, expect, it } from 'vitest';
import type { WakeScanRecord } from '../../shared/types';
import { createJsonReport, createMarkdownReport } from './reportExporter';

const sample: WakeScanRecord = {
  id: 'scan-1',
  createdAt: '2026-06-23T12:00:00.000Z',
  evidence: {
    scanId: 'scan-1',
    startedAt: '2026-06-23T12:00:00.000Z',
    completedAt: '2026-06-23T12:00:01.000Z',
    osVersion: 'Windows',
    commands: {
      lastwake: { command: 'powercfg /lastwake', status: 'ok', stdout: 'Wake Source Count - 0', stderr: '', exitCode: 0, durationMs: 1, collectedAt: '2026-06-23T12:00:00.000Z' },
      waketimers: {
        command: 'powercfg /waketimers',
        status: 'failed',
        stdout: '',
        stderr: 'administrator required',
        exitCode: 1,
        durationMs: 1,
        collectedAt: '2026-06-23T12:00:00.000Z',
        failureKind: 'permission-required'
      },
      requests: { command: 'powercfg /requests', status: 'empty', stdout: '', stderr: '', exitCode: 0, durationMs: 1, collectedAt: '2026-06-23T12:00:00.000Z' },
      wakeArmed: { command: 'powercfg /devicequery wake_armed', status: 'empty', stdout: '', stderr: '', exitCode: 0, durationMs: 1, collectedAt: '2026-06-23T12:00:00.000Z' }
    },
    events: { status: 'empty', records: [] }
  },
  diagnosis: {
    family: 'unknown',
    confidence: 'unknown',
    headline: 'Windows did not reveal a reliable wake source',
    explanation: 'Windows did not expose enough evidence.',
    evidenceSummary: ['Wake Source Count - 0'],
    diagnosticIssues: [
      {
        severity: 'warning',
        title: 'Administrator permission needed',
        body: 'Windows blocked part of the scan because the app is not running with elevated permission.'
      }
    ],
    recommendations: [{ title: 'Scan again', body: 'Run WakeLens after the next wake.' }]
  }
};

describe('reportExporter', () => {
  it('creates a markdown support report', () => {
    const report = createMarkdownReport(sample);

    expect(report.filename).toBe('wakelens-scan-1.md');
    expect(report.content).toContain('# WakeLens Report');
    expect(report.content).toContain('Windows did not reveal a reliable wake source');
    expect(report.content).toContain('## Diagnostic Issues');
    expect(report.content).toContain('Administrator permission needed');
  });

  it('creates a localized markdown support report', () => {
    const report = createMarkdownReport(sample, 'ru');

    expect(report.content).toContain('# Отчёт WakeLens');
    expect(report.content).toContain('## Диагноз');
    expect(report.content).toContain('Проблемы диагностики');
  });

  it('creates a JSON report', () => {
    const report = createJsonReport(sample);

    expect(report.filename).toBe('wakelens-scan-1.json');
    expect(JSON.parse(report.content).diagnosis.family).toBe('unknown');
  });
});
