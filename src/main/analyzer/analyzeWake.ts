import type { Diagnosis, RawScanEvidence } from '../../shared/types';
import { parseLastWake, parsePowerRequests, parseWakeTimers } from '../diagnostics/powercfg';

export const analyzeWakeEvidence = (evidence: RawScanEvidence): Diagnosis => {
  const lastWake = parseLastWake(evidence.commands.lastwake.stdout);
  const wakeTimers = parseWakeTimers(evidence.commands.waketimers.stdout);
  const requests = parsePowerRequests(evidence.commands.requests.stdout);

  if (lastWake.sourceCount > 0 && lastWake.type?.toLowerCase() === 'device') {
    const label = lastWake.friendlyName || lastWake.description || lastWake.instancePath || 'a wake-capable device';

    return {
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
    };
  }

  if (wakeTimers.length > 0) {
    const timer = wakeTimers[0];

    return {
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
    };
  }

  if (requests.length > 0) {
    const request = requests[0];

    return {
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
    };
  }

  return {
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
  };
};
