import { spawn } from 'node:child_process';
import type { CommandEvidence, EvidenceStatus } from '../../shared/types';

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
      resolve({
        command: [command, ...args].join(' '),
        status,
        stdout,
        stderr: timedOut ? `${stderr}\nCommand timed out after ${timeoutMs}ms`.trim() : stderr,
        exitCode,
        durationMs: Date.now() - started,
        collectedAt
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
