import type { ExportedReport, WakeScanRecord } from '../../shared/types';
import { defaultLocale, t, type LocaleCode } from '../../shared/i18n';
import { analyzeWakeEvidence } from '../analyzer/analyzeWake';

const safeId = (id: string): string => id.replace(/[^a-z0-9-]/gi, '-').toLowerCase();

export const createMarkdownReport = (record: WakeScanRecord, locale: LocaleCode = defaultLocale): ExportedReport => {
  const diagnosis = analyzeWakeEvidence(record.evidence, locale);
  const diagnosticIssues = diagnosis.diagnosticIssues ?? [];
  const lines = [
    `# ${t(locale, 'report.title')}`,
    '',
    `${t(locale, 'report.scanId')}: ${record.id}`,
    `${t(locale, 'report.created')}: ${record.createdAt}`,
    `${t(locale, 'report.os')}: ${record.evidence.osVersion}`,
    '',
    `## ${t(locale, 'report.diagnosis')}`,
    '',
    `${t(locale, 'report.family')}: ${diagnosis.family}`,
    `${t(locale, 'report.confidence')}: ${diagnosis.confidence}`,
    `${t(locale, 'report.headline')}: ${diagnosis.headline}`,
    '',
    diagnosis.explanation,
    '',
    `## ${t(locale, 'report.evidenceSummary')}`,
    '',
    ...diagnosis.evidenceSummary.map((item) => `- ${item}`),
    '',
    ...(diagnosticIssues.length > 0
      ? [
          `## ${t(locale, 'report.diagnosticIssues')}`,
          '',
          ...diagnosticIssues.map((item) => `- ${item.severity.toUpperCase()}: ${item.title} - ${item.body}`),
          ''
        ]
      : []),
    `## ${t(locale, 'report.recommendations')}`,
    '',
    ...diagnosis.recommendations.map((item) => `- ${item.title}: ${item.body}`),
    '',
    `## ${t(locale, 'report.powerEvents')}`,
    '',
    ...(record.evidence.events.records.length > 0
      ? record.evidence.events.records.map((event) => `- ${event.timeCreated}: ${event.message}`)
      : [`${t(locale, 'report.status')}: ${record.evidence.events.status}${record.evidence.events.error ? ` - ${record.evidence.events.error}` : ''}`]),
    '',
    `## ${t(locale, 'report.rawCommands')}`,
    '',
    ...Object.values(record.evidence.commands).flatMap((command) => [
      `### ${command.command}`,
      '',
      `${t(locale, 'report.status')}: ${command.status}`,
      '',
      '```text',
      command.stdout || command.stderr || t(locale, 'report.noOutput'),
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
