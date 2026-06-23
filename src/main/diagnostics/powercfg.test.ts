import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseLastWake, parsePowerRequests, parseWakeTimers } from './powercfg';

const fixture = (name: string): string =>
  readFileSync(resolve(process.cwd(), 'tests/fixtures', name), 'utf8');

describe('parseLastWake', () => {
  it('extracts a concrete device wake source', () => {
    const result = parseLastWake(fixture('lastwake-device.txt'));

    expect(result).toEqual({
      sourceCount: 1,
      type: 'Device',
      instancePath: 'USB\\VID_046D&PID_C539\\6&1A2B3C4D&0&3',
      friendlyName: 'USB Composite Device',
      description: 'USB Composite Device',
      manufacturer: '(Standard USB Host Controller)'
    });
  });

  it('keeps unknown wake source as source count zero', () => {
    expect(parseLastWake(fixture('lastwake-unknown.txt'))).toEqual({ sourceCount: 0 });
  });
});

describe('parseWakeTimers', () => {
  it('extracts scheduled task wake timer evidence', () => {
    const result = parseWakeTimers(fixture('waketimers-update.txt'));

    expect(result).toEqual([
      {
        process: '\\Device\\HarddiskVolume3\\Windows\\System32\\svchost.exe',
        task: 'Microsoft\\Windows\\UpdateOrchestrator\\Schedule Wake To Work',
        expiresAt: '03:00:00 on 2026-06-24',
        reason: "Windows will execute 'NT TASK\\Microsoft\\Windows\\UpdateOrchestrator\\Schedule Wake To Work'",
        raw: fixture('waketimers-update.txt').trim()
      }
    ]);
  });
});

describe('parsePowerRequests', () => {
  it('extracts process power requests by category', () => {
    expect(parsePowerRequests(fixture('requests-display.txt'))).toEqual([
      {
        category: 'DISPLAY',
        requester: '\\Device\\HarddiskVolume3\\Program Files\\VideoTool\\video.exe',
        reason: 'VideoTool is keeping the display active.'
      }
    ]);
  });
});
