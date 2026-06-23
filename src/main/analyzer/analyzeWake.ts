import type { CommandEvidence, DiagnosticIssue, Diagnosis, RawScanEvidence, Recommendation } from '../../shared/types';
import { t, type LocaleCode, defaultLocale } from '../../shared/i18n';
import { parseLastWake, parsePowerRequests, parseWakeArmedDevices, parseWakeTimers } from '../diagnostics/powercfg';

const adminRecommendation = (locale: LocaleCode): Recommendation => ({
  title: t(locale, 'diagnosis.admin.title'),
  body: t(locale, 'diagnosis.admin.body'),
  actionLabel: t(locale, 'diagnosis.admin.action'),
  command: 'run-as-admin'
});

const failureMessage = (locale: LocaleCode, command: CommandEvidence): string => {
  if (command.failureKind === 'permission-required') return t(locale, 'diagnostic.failure.permission');
  if (command.failureKind === 'timeout') return t(locale, 'diagnostic.failure.timeout');
  if (command.failureKind === 'not-found') return t(locale, 'diagnostic.failure.notFound');
  if (command.failureKind === 'exit-code') return t(locale, 'diagnostic.failure.exitCode');
  return command.stderr || t(locale, 'diagnostic.issue.failed.body');
};

const collectDiagnosticIssues = (commands: CommandEvidence[], locale: LocaleCode): DiagnosticIssue[] => {
  const hasPermissionFailure = commands.some((command) => command.failureKind === 'permission-required');
  const issues: DiagnosticIssue[] = [];

  if (hasPermissionFailure) {
    issues.push({
      severity: 'warning',
      title: t(locale, 'diagnostic.issue.admin.title'),
      body: t(locale, 'diagnostic.issue.admin.body'),
      actionLabel: t(locale, 'diagnostic.issue.admin.action'),
      command: 'run-as-admin'
    });
  }

  const otherFailures = commands.filter((command) => command.status === 'failed' && command.failureKind !== 'permission-required');
  for (const command of otherFailures) {
    issues.push({
      severity: 'warning',
      title: t(locale, 'diagnostic.issue.failed.title', { command: command.command }),
      body: failureMessage(locale, command)
    });
  }

  return issues;
};

const withIssues = (diagnosis: Diagnosis, issues: DiagnosticIssue[], locale: LocaleCode): Diagnosis =>
  issues.length > 0
    ? {
        ...diagnosis,
        diagnosticIssues: issues,
        recommendations: [
          ...(issues.some((issue) => issue.command === 'run-as-admin') ? [adminRecommendation(locale)] : []),
          ...diagnosis.recommendations
        ]
      }
    : diagnosis;

const extractEventWakeSource = (evidence: RawScanEvidence): string | undefined => {
  const record = evidence.events.records.find((event) => /wake source|источник/i.test(event.message));
  if (!record) return undefined;

  const match = record.message.match(/Wake Source:\s*(?:Device\s*-?\s*)?(.+)/i) || record.message.match(/Источник[^:]*:\s*(.+)/i);
  const source = match?.[1]?.trim();
  if (!source || /^unknown$/i.test(source) || /^неизвест/i.test(source)) return undefined;
  return source;
};

export const analyzeWakeEvidence = (evidence: RawScanEvidence, locale: LocaleCode = defaultLocale): Diagnosis => {
  const lastWake = parseLastWake(evidence.commands.lastwake.stdout);
  const wakeTimers = parseWakeTimers(evidence.commands.waketimers.stdout);
  const requests = parsePowerRequests(evidence.commands.requests.stdout);
  const wakeArmedDevices = parseWakeArmedDevices(evidence.commands.wakeArmed.stdout);
  const diagnosticIssues = collectDiagnosticIssues(Object.values(evidence.commands), locale);
  const eventWakeSource = extractEventWakeSource(evidence);

  if (lastWake.sourceCount > 0 && lastWake.type?.toLowerCase() === 'device') {
    const label = lastWake.friendlyName || lastWake.description || lastWake.instancePath || 'a wake-capable device';

    return withIssues({
      family: 'device',
      confidence: 'high',
      headline: t(locale, 'diagnosis.deviceHigh.headline', { label }),
      explanation: t(locale, 'diagnosis.deviceHigh.explanation', { label }),
      evidenceSummary: [
        t(locale, 'diagnosis.deviceHigh.sourceType', { type: lastWake.type }),
        lastWake.instancePath
          ? t(locale, 'diagnosis.deviceHigh.instancePath', { path: lastWake.instancePath })
          : t(locale, 'diagnosis.deviceHigh.noInstancePath'),
        lastWake.manufacturer
          ? t(locale, 'diagnosis.deviceHigh.manufacturer', { manufacturer: lastWake.manufacturer })
          : t(locale, 'diagnosis.deviceHigh.noManufacturer')
      ],
      recommendations: [
        {
          title: t(locale, 'diagnosis.deviceHigh.recommendation.title'),
          body: t(locale, 'diagnosis.deviceHigh.recommendation.body'),
          actionLabel: t(locale, 'diagnosis.deviceHigh.recommendation.action'),
          command: 'devmgmt.msc'
        }
      ]
    }, diagnosticIssues, locale);
  }

  if (eventWakeSource) {
    return withIssues({
      family: 'device',
      confidence: 'medium',
      headline: t(locale, 'diagnosis.eventDevice.headline', { source: eventWakeSource }),
      explanation: t(locale, 'diagnosis.eventDevice.explanation'),
      evidenceSummary: [
        t(locale, 'diagnosis.eventDevice.summary.source', { source: eventWakeSource }),
        t(locale, 'diagnosis.eventDevice.summary.records', { count: evidence.events.records.length })
      ],
      recommendations: [
        {
          title: t(locale, 'diagnosis.eventDevice.recommendation.title'),
          body: t(locale, 'diagnosis.eventDevice.recommendation.body'),
          actionLabel: t(locale, 'diagnosis.deviceHigh.recommendation.action'),
          command: 'devmgmt.msc'
        }
      ]
    }, diagnosticIssues, locale);
  }

  if (wakeTimers.length > 0) {
    const timer = wakeTimers[0];

    return withIssues({
      family: 'timer',
      confidence: 'medium',
      headline: t(locale, 'diagnosis.timer.headline'),
      explanation: timer.task
        ? t(locale, 'diagnosis.timer.explanation.task', { task: timer.task })
        : t(locale, 'diagnosis.timer.explanation.generic'),
      evidenceSummary: [
        timer.expiresAt
          ? t(locale, 'diagnosis.timer.summary.expires', { time: timer.expiresAt })
          : t(locale, 'diagnosis.timer.summary.noExpires'),
        timer.reason ? t(locale, 'diagnosis.timer.summary.reason', { reason: timer.reason }) : t(locale, 'diagnosis.timer.summary.noReason')
      ],
      recommendations: [
        {
          title: t(locale, 'diagnosis.timer.recommendation.title'),
          body: t(locale, 'diagnosis.timer.recommendation.body'),
          actionLabel: t(locale, 'diagnosis.timer.recommendation.action'),
          command: 'taskschd.msc'
        }
      ]
    }, diagnosticIssues, locale);
  }

  if (requests.length > 0) {
    const request = requests[0];

    return withIssues({
      family: 'power-request',
      confidence: 'low',
      headline: t(locale, 'diagnosis.request.headline', { requester: request.requester }),
      explanation: t(locale, 'diagnosis.request.explanation'),
      evidenceSummary: [`${request.category}: ${request.requester}`, request.reason || t(locale, 'diagnosis.request.summary.noReason')],
      recommendations: [
        {
          title: t(locale, 'diagnosis.request.recommendation.title'),
          body: t(locale, 'diagnosis.request.recommendation.body')
        }
      ]
    }, diagnosticIssues, locale);
  }

  if (wakeArmedDevices.length > 0) {
    const topDevices = wakeArmedDevices.slice(0, 4);
    const label = topDevices[0].name;

    return withIssues({
      family: 'device',
      confidence: 'low',
      headline: t(locale, 'diagnosis.wakeArmed.headline'),
      explanation: t(locale, 'diagnosis.wakeArmed.explanation'),
      evidenceSummary: [
        t(locale, 'diagnosis.wakeArmed.summary.top', { device: label }),
        t(locale, 'diagnosis.wakeArmed.summary.count', { count: wakeArmedDevices.length }),
        ...topDevices.map((device) =>
          t(locale, 'diagnosis.wakeArmed.summary.device', {
            category: t(locale, `device.category.${device.category}`),
            device: device.name
          })
        )
      ],
      recommendations: [
        {
          title: t(locale, 'diagnosis.wakeArmed.recommendation.title'),
          body: t(locale, 'diagnosis.wakeArmed.recommendation.body'),
          actionLabel: t(locale, 'diagnosis.wakeArmed.recommendation.action'),
          command: 'devmgmt.msc'
        },
        {
          title: t(locale, 'diagnosis.wakeArmed.scanAgain.title'),
          body: t(locale, 'diagnosis.wakeArmed.scanAgain.body')
        }
      ]
    }, diagnosticIssues, locale);
  }

  return withIssues({
    family: 'unknown',
    confidence: 'unknown',
    headline: t(locale, 'diagnosis.unknown.headline'),
    explanation: t(locale, 'diagnosis.unknown.explanation'),
    evidenceSummary: [
      t(locale, 'diagnosis.unknown.summary.lastwake', { status: evidence.commands.lastwake.status }),
      t(locale, 'diagnosis.unknown.summary.waketimers', { status: evidence.commands.waketimers.status }),
      t(locale, 'diagnosis.unknown.summary.requests', { status: evidence.commands.requests.status })
    ],
    recommendations: [
      {
        title: t(locale, 'diagnosis.unknown.recommendation.title'),
        body: t(locale, 'diagnosis.unknown.recommendation.body')
      }
    ]
  }, diagnosticIssues, locale);
};
