import { spawn } from 'node:child_process';
import type { CommandEvidence, CommandFailureKind, EvidenceStatus } from '../../shared/types';

const classifyFailure = (stderr: string, timedOut: boolean, exitCode: number | null): {
  failureKind?: CommandFailureKind;
  userMessage?: string;
} => {
  if (!timedOut && exitCode === 0) {
    return {};
  }

  if (timedOut) {
    return {
      failureKind: 'timeout',
      userMessage: 'This Windows diagnostic took too long and was stopped. Try again after the next wake event.'
    };
  }

  const normalized = stderr.toLowerCase();
  if (
    normalized.includes('administrator') ||
    normalized.includes('elevated') ||
    normalized.includes('администратор') ||
    normalized.includes('администратора') ||
    normalized.includes('повышенн')
  ) {
    return {
      failureKind: 'permission-required',
      userMessage: 'Run WakeLens as administrator to collect this evidence.'
    };
  }

  if (normalized.includes('enoent') || normalized.includes('not recognized') || normalized.includes('не является')) {
    return {
      failureKind: 'not-found',
      userMessage: 'Windows could not find this diagnostic command.'
    };
  }

  return {
    failureKind: exitCode === null ? 'unknown' : 'exit-code',
    userMessage: 'Windows returned an error for this diagnostic. The raw output is preserved in the report.'
  };
};

export const runCommand = async (command: string, args: string[], timeoutMs = 10000): Promise<CommandEvidence> => {
  const started = Date.now();
  const collectedAt = new Date().toISOString();

  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (exitCode: number | null, timedOut = false): void => {
      if (settled) return;
      settled = true;
      const status: EvidenceStatus = timedOut || exitCode !== 0 ? 'failed' : stdout.trim() ? 'ok' : 'empty';
      const failure = status === 'failed' ? classifyFailure(stderr, timedOut, exitCode) : {};
      resolve({
        command: [command, ...args].join(' '),
        status,
        stdout,
        stderr: timedOut ? `${stderr}\nCommand timed out after ${timeoutMs}ms`.trim() : stderr,
        exitCode,
        durationMs: Date.now() - started,
        collectedAt,
        ...failure
      });
    };

    const timeout = setTimeout(() => {
      child.kill();
      finish(null, true);
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (error) => {
      clearTimeout(timeout);
      stderr += error.message;
      finish(null);
    });
    child.on('close', (exitCode) => {
      clearTimeout(timeout);
      finish(exitCode);
    });
  });
};
