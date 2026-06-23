import type { CommandEvidence, DiagnosticIssue, Diagnosis, RawScanEvidence, Recommendation } from '../../shared/types';
import { parseLastWake, parsePowerRequests, parseWakeArmedDevices, parseWakeTimers } from '../diagnostics/powercfg';

const adminRecommendation: Recommendation = {
  title: 'Run WakeLens as administrator for a complete scan',
  body: 'Some Windows power diagnostics require elevated permission. Run the app as administrator, then scan again after the next unexpected wake.',
  actionLabel: 'Restart as administrator',
  command: 'run-as-admin'
};

const collectDiagnosticIssues = (commands: CommandEvidence[]): DiagnosticIssue[] => {
  const hasPermissionFailure = commands.some((command) => command.failureKind === 'permission-required');
  const issues: DiagnosticIssue[] = [];

  if (hasPermissionFailure) {
    issues.push({
      severity: 'warning',
      title: 'Administrator permission needed',
      body: 'Windows blocked part of the scan because the app is not running with elevated permission.',
      actionLabel: 'Restart as administrator',
      command: 'run-as-admin'
    });
  }

  const otherFailures = commands.filter((command) => command.status === 'failed' && command.failureKind !== 'permission-required');
  for (const command of otherFailures) {
    issues.push({
      severity: 'warning',
      title: `${command.command} did not complete`,
      body: command.userMessage || command.stderr || 'Windows returned an error for this diagnostic.'
    });
  }

  return issues;
};

const withIssues = (diagnosis: Diagnosis, issues: DiagnosticIssue[]): Diagnosis =>
  issues.length > 0
    ? {
        ...diagnosis,
        diagnosticIssues: issues,
        recommendations: [
          ...(issues.some((issue) => issue.command === 'run-as-admin') ? [adminRecommendation] : []),
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

export const analyzeWakeEvidence = (evidence: RawScanEvidence): Diagnosis => {
  const lastWake = parseLastWake(evidence.commands.lastwake.stdout);
  const wakeTimers = parseWakeTimers(evidence.commands.waketimers.stdout);
  const requests = parsePowerRequests(evidence.commands.requests.stdout);
  const wakeArmedDevices = parseWakeArmedDevices(evidence.commands.wakeArmed.stdout);
  const diagnosticIssues = collectDiagnosticIssues(Object.values(evidence.commands));
  const eventWakeSource = extractEventWakeSource(evidence);

  if (lastWake.sourceCount > 0 && lastWake.type?.toLowerCase() === 'device') {
    const label = lastWake.friendlyName || lastWake.description || lastWake.instancePath || 'a wake-capable device';

    return withIssues({
      family: 'device',
      confidence: 'high',
      headline: `${label} likely woke this PC`,
      explanation: `Windows reported a concrete device wake source: ${label}.`,
      evidenceSummary: [
        `Wake source type: ${lastWake.type}`,
        lastWake.instancePath ? `Instance path: ${lastWake.instancePath}` : 'No instance path reported',
        lastWake.manufacturer ? `Manufacturer: ${lastWake.manufacturer}` : 'No manufacturer reported'
      ],
      recommendations: [
        {
          title: 'Review this device before disabling wake',
          body: 'Open Device Manager, find the matching device, and check whether it should be allowed to wake the computer.',
          actionLabel: 'Open Device Manager',
          command: 'devmgmt.msc'
        }
      ]
    }, diagnosticIssues);
  }

  if (eventWakeSource) {
    return withIssues({
      family: 'device',
      confidence: 'medium',
      headline: `${eventWakeSource} may have woke this PC`,
      explanation: 'Windows Power-Troubleshooter logged this wake source, but the live powercfg source was not specific enough to make it high confidence.',
      evidenceSummary: [
        `Power event wake source: ${eventWakeSource}`,
        `Power event records checked: ${evidence.events.records.length}`
      ],
      recommendations: [
        {
          title: 'Review the event wake source',
          body: 'If this source appears repeatedly in history, inspect the matching device or Windows component before changing settings.',
          actionLabel: 'Open Device Manager',
          command: 'devmgmt.msc'
        }
      ]
    }, diagnosticIssues);
  }

  if (wakeTimers.length > 0) {
    const timer = wakeTimers[0];

    return withIssues({
      family: 'timer',
      confidence: 'medium',
      headline: 'A scheduled wake timer may be responsible',
      explanation: timer.task ? `Windows has an active wake timer for ${timer.task}.` : 'Windows has at least one active wake timer.',
      evidenceSummary: [
        timer.expiresAt ? `Timer expires at ${timer.expiresAt}` : 'Timer expiration was not reported',
        timer.reason ? `Reason: ${timer.reason}` : 'No timer reason was reported'
      ],
      recommendations: [
        {
          title: 'Inspect the wake timer',
          body: 'Open Task Scheduler or Windows power settings and confirm whether this timer is expected before changing it.',
          actionLabel: 'Open Task Scheduler',
          command: 'taskschd.msc'
        }
      ]
    }, diagnosticIssues);
  }

  if (requests.length > 0) {
    const request = requests[0];

    return withIssues({
      family: 'power-request',
      confidence: 'low',
      headline: `${request.requester} is requesting power availability`,
      explanation: 'A power request can keep the PC awake or interfere with sleep behavior, but it does not always prove the wake source.',
      evidenceSummary: [`${request.category}: ${request.requester}`, request.reason || 'No request reason reported'],
      recommendations: [
        {
          title: 'Close or update the requesting app',
          body: 'If this request appears unexpectedly, close the app, update it, or check its settings before changing Windows power configuration.'
        }
      ]
    }, diagnosticIssues);
  }

  if (wakeArmedDevices.length > 0) {
    const topDevices = wakeArmedDevices.slice(0, 4);
    const label = topDevices[0].name;

    return withIssues({
      family: 'device',
      confidence: 'low',
      headline: 'Wake-capable devices need review',
      explanation: 'Windows did not name the exact wake source, but these devices are currently allowed to wake the PC.',
      evidenceSummary: [
        `Top wake-capable device: ${label}`,
        `Wake-capable devices found: ${wakeArmedDevices.length}`,
        ...topDevices.map((device) => `${device.category}: ${device.name}`)
      ],
      recommendations: [
        {
          title: 'Review wake-capable devices',
          body: 'Network adapters, keyboards, mice, Bluetooth, USB, and HID devices can wake a PC. Inspect repeated suspects before disabling wake.',
          actionLabel: 'Open Device Manager',
          command: 'devmgmt.msc'
        },
        {
          title: 'Scan again immediately after the next wake',
          body: 'Wake-armed devices are candidates, not proof. A scan right after the next wake can provide stronger evidence.'
        }
      ]
    }, diagnosticIssues);
  }

  return withIssues({
    family: 'unknown',
    confidence: 'unknown',
    headline: 'Windows did not reveal a reliable wake source',
    explanation: 'Windows did not expose enough evidence in the available diagnostics. This is common and does not prove malware.',
    evidenceSummary: [
      `Last wake status: ${evidence.commands.lastwake.status}`,
      `Wake timer status: ${evidence.commands.waketimers.status}`,
      `Power request status: ${evidence.commands.requests.status}`
    ],
    recommendations: [
      {
        title: 'Run another scan after the next unexpected wake',
        body: 'Wake evidence is most useful immediately after the problem happens. Keep WakeLens installed and scan right after the next wake.'
      }
    ]
  }, diagnosticIssues);
};
