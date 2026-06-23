import type { ExportedReport, WakeScanRecord } from '../../shared/types';

const safeId = (id: string): string => id.replace(/[^a-z0-9-]/gi, '-').toLowerCase();

export const createMarkdownReport = (record: WakeScanRecord): ExportedReport => {
  const diagnosticIssues = record.diagnosis.diagnosticIssues ?? [];
  const lines = [
    '# WakeLens Report',
    '',
    `Scan ID: ${record.id}`,
    `Created: ${record.createdAt}`,
    `OS: ${record.evidence.osVersion}`,
    '',
    '## Diagnosis',
    '',
    `Family: ${record.diagnosis.family}`,
    `Confidence: ${record.diagnosis.confidence}`,
    `Headline: ${record.diagnosis.headline}`,
    '',
    record.diagnosis.explanation,
    '',
    '## Evidence Summary',
    '',
    ...record.diagnosis.evidenceSummary.map((item) => `- ${item}`),
    '',
    ...(diagnosticIssues.length > 0
      ? [
          '## Diagnostic Issues',
          '',
          ...diagnosticIssues.map((item) => `- ${item.severity.toUpperCase()}: ${item.title} - ${item.body}`),
          ''
        ]
      : []),
    '## Recommendations',
    '',
    ...record.diagnosis.recommendations.map((item) => `- ${item.title}: ${item.body}`),
    '',
    '## Power Events',
    '',
    ...(record.evidence.events.records.length > 0
      ? record.evidence.events.records.map((event) => `- ${event.timeCreated}: ${event.message}`)
      : [`Status: ${record.evidence.events.status}${record.evidence.events.error ? ` - ${record.evidence.events.error}` : ''}`]),
    '',
    '## Raw Commands',
    '',
    ...Object.values(record.evidence.commands).flatMap((command) => [
      `### ${command.command}`,
      '',
      `Status: ${command.status}`,
      '',
      '```text',
      command.stdout || command.stderr || 'No output.',
      '```',
      ''
    ])
  ];

  return {
    filename: `wakelens-${safeId(record.id)}.md`,
    content: lines.join('\n'),
    format: 'markdown'
  };
};

export const createJsonReport = (record: WakeScanRecord): ExportedReport => ({
  filename: `wakelens-${safeId(record.id)}.json`,
  content: JSON.stringify(record, null, 2),
  format: 'json'
});
