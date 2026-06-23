import { describe, expect, it } from 'vitest';
import { runCommand } from './commandRunner';

describe('runCommand', () => {
  it('captures stdout and exit code for a successful command', async () => {
    const result = await runCommand('node', ['-e', 'process.stdout.write("ok")'], 3000);

    expect(result.status).toBe('ok');
    expect(result.stdout).toBe('ok');
    expect(result.exitCode).toBe(0);
  });

  it('marks a non-zero command as failed while preserving stderr', async () => {
    const result = await runCommand('node', ['-e', 'process.stderr.write("bad"); process.exit(2)'], 3000);

    expect(result.status).toBe('failed');
    expect(result.stderr).toBe('bad');
    expect(result.exitCode).toBe(2);
  });

  it('explains administrator-only Windows command failures', async () => {
    const result = await runCommand(
      'node',
      [
        '-e',
        'process.stderr.write("Для выполнения этой команды требуются права администратора"); process.exit(1)'
      ],
      3000
    );

    expect(result.status).toBe('failed');
    expect(result.failureKind).toBe('permission-required');
    expect(result.userMessage).toContain('administrator');
  });
});
