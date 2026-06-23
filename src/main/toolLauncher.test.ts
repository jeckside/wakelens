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

  it('preserves app launch arguments when relaunching elevated', () => {
    expect(getToolLaunch('run-as-admin', 'C:/Electron/electron.exe', ['C:/WakeLens/out/main/main.js', '--user-data-dir=C:/Temp/WakeLens Profile'])).toEqual({
      command: 'powershell.exe',
      args: [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        "Start-Process -FilePath 'C:/Electron/electron.exe' -ArgumentList @('C:/WakeLens/out/main/main.js','--user-data-dir=C:/Temp/WakeLens Profile') -Verb RunAs"
      ],
      shell: false
    });
  });

  it('rejects unsupported tool commands', () => {
    expect(() => getToolLaunch('cmd.exe /c format C:', 'C:/WakeLens/WakeLens.exe')).toThrow('Unsupported tool command');
  });
});
