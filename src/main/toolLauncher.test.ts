import { describe, expect, it } from 'vitest';
import { getToolLaunch } from './toolLauncher';

describe('getToolLaunch', () => {
  it('keeps Device Manager whitelisted', () => {
    expect(getToolLaunch('devmgmt.msc', 'C:/WakeLens/WakeLens.exe')).toEqual({
      command: 'devmgmt.msc',
      args: [],
      shell: true
    });
  });

  it('builds an elevated relaunch command for WakeLens', () => {
    expect(getToolLaunch('run-as-admin', 'C:/WakeLens/WakeLens.exe')).toEqual({
      command: 'powershell.exe',
      args: [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        "Start-Process -FilePath 'C:/WakeLens/WakeLens.exe' -Verb RunAs"
      ],
      shell: false
    });
  });

  it('rejects unsupported tool commands', () => {
    expect(() => getToolLaunch('cmd.exe /c format C:', 'C:/WakeLens/WakeLens.exe')).toThrow('Unsupported tool command');
  });
});
