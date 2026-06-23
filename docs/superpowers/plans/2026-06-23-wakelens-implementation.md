# WakeLens Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish WakeLens, a polished Windows desktop app that diagnoses why a PC woke unexpectedly and exports understandable reports.

**Architecture:** Use Electron with a secure main/preload/renderer split. Keep Windows diagnostics, evidence analysis, storage, reporting, and UI in separate focused modules so the app can be tested without launching Electron for every behavior.

**Tech Stack:** Electron, electron-vite, React, TypeScript, Vitest, Node.js child processes, PowerShell, `powercfg`, GitHub Actions, electron-builder.

---

## File Structure

- Create `package.json`: npm scripts, dependencies, app metadata, electron-builder config.
- Create `tsconfig.json`, `tsconfig.node.json`, `electron.vite.config.ts`, `index.html`: TypeScript and build configuration.
- Create `src/shared/types.ts`: shared scan, evidence, diagnosis, recommendation, and report types.
- Create `src/main/diagnostics/commandRunner.ts`: timeout-aware command execution wrapper.
- Create `src/main/diagnostics/powercfg.ts`: collect and parse `powercfg` output.
- Create `src/main/diagnostics/events.ts`: collect Windows power events through PowerShell.
- Create `src/main/analyzer/analyzeWake.ts`: classify raw evidence into cause family, confidence, headline, and recommendations.
- Create `src/main/storage/historyStore.ts`: local JSON history persistence with corrupted-file backup.
- Create `src/main/reporting/reportExporter.ts`: Markdown and JSON export.
- Create `src/main/scan/runScan.ts`: orchestrate diagnostics, analysis, and storage.
- Create `src/main/ipc.ts`: narrow IPC handlers for scan, history, and report export.
- Create `src/main/main.ts`: Electron main window lifecycle.
- Create `src/preload/preload.ts`: safe renderer API.
- Create `src/renderer/App.tsx`, `src/renderer/main.tsx`, `src/renderer/styles.css`: polished user interface.
- Create `tests/fixtures/*.txt`: representative command samples.
- Create `docs/USER_GUIDE.md`, `docs/TECHNICAL.md`, `docs/TROUBLESHOOTING.md`, `docs/MARKETING.md`: documentation and marketing.
- Create `.github/workflows/ci.yml`: CI validation.
- Create `LICENSE` and `README.md`: public repository materials.

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `electron.vite.config.ts`
- Create: `index.html`
- Modify: `.gitignore`

- [ ] **Step 1: Add project metadata and scripts**

Create `package.json`:

```json
{
  "name": "wakelens",
  "version": "0.1.0",
  "description": "Find out why your Windows PC woke up.",
  "main": "dist/main/main.js",
  "author": "jeckside",
  "license": "MIT",
  "private": false,
  "type": "module",
  "scripts": {
    "dev": "electron-vite dev",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "build": "npm run typecheck && npm run test && electron-vite build",
    "dist": "npm run build && electron-builder --win nsis --x64",
    "lint": "npm run typecheck"
  },
  "dependencies": {
    "@vitejs/plugin-react": "^5.1.1",
    "electron-store": "^10.1.0",
    "react": "^19.2.3",
    "react-dom": "^19.2.3"
  },
  "devDependencies": {
    "@types/node": "^24.10.1",
    "@types/react": "^19.2.7",
    "@types/react-dom": "^19.2.3",
    "electron": "^39.2.6",
    "electron-builder": "^26.0.12",
    "electron-vite": "^4.0.0",
    "typescript": "^5.9.3",
    "vite": "^7.2.7",
    "vitest": "^4.0.15"
  },
  "build": {
    "appId": "dev.jeckside.wakelens",
    "productName": "WakeLens",
    "directories": {
      "output": "release"
    },
    "files": [
      "dist/**"
    ],
    "win": {
      "target": "nsis"
    }
  }
}
```

- [ ] **Step 2: Add TypeScript and electron-vite config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx"
  },
  "include": ["src", "electron.vite.config.ts", "tests"]
}
```

Create `tsconfig.node.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "types": ["node", "vitest"]
  },
  "include": ["src/main", "src/preload", "electron.vite.config.ts", "tests"]
}
```

Create `electron.vite.config.ts`:

```ts
import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/main/main.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          preload: resolve(__dirname, 'src/preload/preload.ts')
        }
      }
    }
  },
  renderer: {
    plugins: [react()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'index.html')
        }
      }
    }
  }
});
```

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>WakeLens</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/renderer/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Update ignored build artifacts**

Append these entries to `.gitignore`:

```gitignore
release/
.vite/
.idea/
.vscode/
*.tsbuildinfo
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` is created and npm exits with code 0.

- [ ] **Step 5: Verify baseline scripts fail only because app files do not exist yet**

Run: `npm run typecheck`

Expected: FAIL with missing `src/main/main.ts`, `src/preload/preload.ts`, or renderer entry files.

- [ ] **Step 6: Commit scaffold**

Run:

```powershell
git add package.json package-lock.json tsconfig.json tsconfig.node.json electron.vite.config.ts index.html .gitignore
git commit -m "chore: scaffold WakeLens Electron project"
```

Expected: commit succeeds.

## Task 2: Shared Types And Fixtures

**Files:**
- Create: `src/shared/types.ts`
- Create: `tests/fixtures/lastwake-device.txt`
- Create: `tests/fixtures/lastwake-unknown.txt`
- Create: `tests/fixtures/waketimers-update.txt`
- Create: `tests/fixtures/requests-display.txt`

- [ ] **Step 1: Create fixture files**

Create `tests/fixtures/lastwake-device.txt`:

```text
Wake History Count - 1
Wake History [0]
  Wake Source Count - 1
  Wake Source [0]
    Type: Device
    Instance Path: USB\VID_046D&PID_C539\6&1A2B3C4D&0&3
    Friendly Name: USB Composite Device
    Description: USB Composite Device
    Manufacturer: (Standard USB Host Controller)
```

Create `tests/fixtures/lastwake-unknown.txt`:

```text
Wake History Count - 1
Wake History [0]
  Wake Source Count - 0
```

Create `tests/fixtures/waketimers-update.txt`:

```text
Timer set by [SERVICE] \Device\HarddiskVolume3\Windows\System32\svchost.exe (SystemEventsBroker) expires at 03:00:00 on 2026-06-24.
  Reason: Windows will execute 'NT TASK\Microsoft\Windows\UpdateOrchestrator\Schedule Wake To Work'
```

Create `tests/fixtures/requests-display.txt`:

```text
DISPLAY:
[PROCESS] \Device\HarddiskVolume3\Program Files\VideoTool\video.exe
VideoTool is keeping the display active.

SYSTEM:
None.

AWAYMODE:
None.
```

- [ ] **Step 2: Add shared TypeScript types**

Create `src/shared/types.ts`:

```ts
export type Confidence = 'high' | 'medium' | 'low' | 'unknown';
export type CauseFamily = 'device' | 'timer' | 'power-request' | 'immediate-wake' | 'unknown';
export type EvidenceStatus = 'ok' | 'empty' | 'failed';

export interface CommandEvidence {
  command: string;
  status: EvidenceStatus;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  collectedAt: string;
}

export interface PowerEvent {
  timeCreated: string;
  providerName: string;
  id: number;
  message: string;
}

export interface ParsedLastWake {
  sourceCount: number;
  type?: string;
  friendlyName?: string;
  instancePath?: string;
  description?: string;
  manufacturer?: string;
}

export interface ParsedWakeTimer {
  process?: string;
  task?: string;
  expiresAt?: string;
  reason?: string;
  raw: string;
}

export interface ParsedPowerRequest {
  category: string;
  requester: string;
  reason?: string;
}

export interface RawScanEvidence {
  scanId: string;
  startedAt: string;
  completedAt: string;
  osVersion: string;
  activePowerPlan?: string;
  commands: {
    lastwake: CommandEvidence;
    waketimers: CommandEvidence;
    requests: CommandEvidence;
    wakeArmed: CommandEvidence;
  };
  events: {
    status: EvidenceStatus;
    records: PowerEvent[];
    error?: string;
  };
}

export interface Recommendation {
  title: string;
  body: string;
  actionLabel?: string;
  command?: string;
}

export interface Diagnosis {
  family: CauseFamily;
  confidence: Confidence;
  headline: string;
  explanation: string;
  evidenceSummary: string[];
  recommendations: Recommendation[];
}

export interface WakeScanRecord {
  id: string;
  createdAt: string;
  evidence: RawScanEvidence;
  diagnosis: Diagnosis;
}

export interface ExportedReport {
  filename: string;
  content: string;
  format: 'markdown' | 'json';
}
```

- [ ] **Step 3: Run typecheck**

Run: `npm run typecheck`

Expected: still FAIL until Electron entry files are created in Task 7.

- [ ] **Step 4: Commit types and fixtures**

Run:

```powershell
git add src/shared/types.ts tests/fixtures
git commit -m "chore: add shared diagnosis types and fixtures"
```

Expected: commit succeeds.

## Task 3: Powercfg Parsers

**Files:**
- Create: `src/main/diagnostics/powercfg.test.ts`
- Create: `src/main/diagnostics/powercfg.ts`

- [ ] **Step 1: Write failing parser tests**

Create `src/main/diagnostics/powercfg.test.ts`:

```ts
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
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npx vitest run src/main/diagnostics/powercfg.test.ts`

Expected: FAIL because `src/main/diagnostics/powercfg.ts` does not exist.

- [ ] **Step 3: Implement parser functions**

Create `src/main/diagnostics/powercfg.ts`:

```ts
import type { ParsedLastWake, ParsedPowerRequest, ParsedWakeTimer } from '../../shared/types';

const valueAfter = (line: string, label: string): string | undefined => {
  const prefix = `${label}:`;
  const trimmed = line.trim();
  return trimmed.startsWith(prefix) ? trimmed.slice(prefix.length).trim() : undefined;
};

export const parseLastWake = (stdout: string): ParsedLastWake => {
  const lines = stdout.split(/\r?\n/);
  const sourceCountLine = lines.find((line) => line.includes('Wake Source Count'));
  const sourceCountMatch = sourceCountLine?.match(/Wake Source Count\s*-\s*(\d+)/i);
  const sourceCount = sourceCountMatch ? Number(sourceCountMatch[1]) : 0;
  const parsed: ParsedLastWake = { sourceCount };

  for (const line of lines) {
    parsed.type ??= valueAfter(line, 'Type');
    parsed.instancePath ??= valueAfter(line, 'Instance Path');
    parsed.friendlyName ??= valueAfter(line, 'Friendly Name');
    parsed.description ??= valueAfter(line, 'Description');
    parsed.manufacturer ??= valueAfter(line, 'Manufacturer');
  }

  return parsed;
};

export const parseWakeTimers = (stdout: string): ParsedWakeTimer[] => {
  const trimmed = stdout.trim();
  if (!trimmed || /^There are no active wake timers/i.test(trimmed)) {
    return [];
  }

  const blocks = trimmed.split(/\r?\n\r?\n/).map((block) => block.trim()).filter(Boolean);

  return blocks.map((block) => {
    const processMatch = block.match(/Timer set by \[[^\]]+\]\s+(.+?)\s+\([^)]+\)\s+expires at\s+(.+?)\./i);
    const reasonMatch = block.match(/Reason:\s+(.+)$/im);
    const taskMatch = reasonMatch?.[1].match(/NT TASK\\(.+?)'/i);

    return {
      process: processMatch?.[1],
      task: taskMatch?.[1],
      expiresAt: processMatch?.[2],
      reason: reasonMatch?.[1],
      raw: block
    };
  });
};

export const parsePowerRequests = (stdout: string): ParsedPowerRequest[] => {
  const lines = stdout.split(/\r?\n/);
  const requests: ParsedPowerRequest[] = [];
  let category = '';

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    const categoryMatch = line.match(/^([A-Z]+):$/);
    if (categoryMatch) {
      category = categoryMatch[1];
      continue;
    }

    if (line.startsWith('[PROCESS]')) {
      requests.push({
        category,
        requester: line.replace('[PROCESS]', '').trim(),
        reason: lines[index + 1]?.trim() || undefined
      });
    }
  }

  return requests;
};
```

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npx vitest run src/main/diagnostics/powercfg.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit parser**

Run:

```powershell
git add src/main/diagnostics/powercfg.ts src/main/diagnostics/powercfg.test.ts
git commit -m "feat: parse powercfg wake evidence"
```

Expected: commit succeeds.

## Task 4: Wake Analyzer

**Files:**
- Create: `src/main/analyzer/analyzeWake.test.ts`
- Create: `src/main/analyzer/analyzeWake.ts`

- [ ] **Step 1: Write failing analyzer tests**

Create `src/main/analyzer/analyzeWake.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { RawScanEvidence } from '../../shared/types';
import { analyzeWakeEvidence } from './analyzeWake';

const command = (commandText: string, stdout: string) => ({
  command: commandText,
  status: stdout ? 'ok' as const : 'empty' as const,
  stdout,
  stderr: '',
  exitCode: 0,
  durationMs: 10,
  collectedAt: '2026-06-23T12:00:00.000Z'
});

const baseEvidence = (overrides: Partial<RawScanEvidence['commands']>): RawScanEvidence => ({
  scanId: 'scan-1',
  startedAt: '2026-06-23T12:00:00.000Z',
  completedAt: '2026-06-23T12:00:01.000Z',
  osVersion: 'Microsoft Windows 11 Pro',
  activePowerPlan: 'Balanced',
  commands: {
    lastwake: command('powercfg /lastwake', ''),
    waketimers: command('powercfg /waketimers', ''),
    requests: command('powercfg /requests', ''),
    wakeArmed: command('powercfg /devicequery wake_armed', ''),
    ...overrides
  },
  events: {
    status: 'empty',
    records: []
  }
});

describe('analyzeWakeEvidence', () => {
  it('classifies concrete device wake as high confidence', () => {
    const diagnosis = analyzeWakeEvidence(baseEvidence({
      lastwake: command('powercfg /lastwake', [
        'Wake Source Count - 1',
        'Type: Device',
        'Friendly Name: USB Composite Device',
        'Description: USB Composite Device'
      ].join('\n'))
    }));

    expect(diagnosis.family).toBe('device');
    expect(diagnosis.confidence).toBe('high');
    expect(diagnosis.headline).toContain('USB Composite Device');
  });

  it('classifies active wake timer as medium confidence when lastwake is unknown', () => {
    const diagnosis = analyzeWakeEvidence(baseEvidence({
      lastwake: command('powercfg /lastwake', 'Wake Source Count - 0'),
      waketimers: command('powercfg /waketimers', "Timer set by [SERVICE] \\Device\\HarddiskVolume3\\Windows\\System32\\svchost.exe (SystemEventsBroker) expires at 03:00:00 on 2026-06-24.\n  Reason: Windows will execute 'NT TASK\\Microsoft\\Windows\\UpdateOrchestrator\\Schedule Wake To Work'")
    }));

    expect(diagnosis.family).toBe('timer');
    expect(diagnosis.confidence).toBe('medium');
    expect(diagnosis.recommendations[0].title).toContain('wake timer');
  });

  it('returns unknown when Windows exposes no reliable source', () => {
    const diagnosis = analyzeWakeEvidence(baseEvidence({
      lastwake: command('powercfg /lastwake', 'Wake Source Count - 0')
    }));

    expect(diagnosis.family).toBe('unknown');
    expect(diagnosis.confidence).toBe('unknown');
    expect(diagnosis.explanation).toContain('Windows did not expose');
  });
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npx vitest run src/main/analyzer/analyzeWake.test.ts`

Expected: FAIL because `analyzeWake.ts` does not exist.

- [ ] **Step 3: Implement analyzer**

Create `src/main/analyzer/analyzeWake.ts`:

```ts
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
      explanation: timer.task
        ? `Windows has an active wake timer for ${timer.task}.`
        : 'Windows has at least one active wake timer.',
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
```

- [ ] **Step 4: Run tests to verify GREEN**

Run: `npx vitest run src/main/analyzer/analyzeWake.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit analyzer**

Run:

```powershell
git add src/main/analyzer/analyzeWake.ts src/main/analyzer/analyzeWake.test.ts
git commit -m "feat: classify wake evidence"
```

Expected: commit succeeds.

## Task 5: Diagnostics Runner

**Files:**
- Create: `src/main/diagnostics/commandRunner.test.ts`
- Create: `src/main/diagnostics/commandRunner.ts`
- Create: `src/main/diagnostics/events.ts`
- Create: `src/main/scan/runScan.ts`

- [ ] **Step 1: Write failing command runner tests**

Create `src/main/diagnostics/commandRunner.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run tests to verify RED**

Run: `npx vitest run src/main/diagnostics/commandRunner.test.ts`

Expected: FAIL because `commandRunner.ts` does not exist.

- [ ] **Step 3: Implement command runner**

Create `src/main/diagnostics/commandRunner.ts`:

```ts
import { spawn } from 'node:child_process';
import type { CommandEvidence, EvidenceStatus } from '../../shared/types';

export const runCommand = async (
  command: string,
  args: string[],
  timeoutMs = 10000
): Promise<CommandEvidence> => {
  const started = Date.now();
  const collectedAt = new Date().toISOString();

  return new Promise((resolve) => {
    const child = spawn(command, args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (exitCode: number | null, timedOut = false) => {
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
```

- [ ] **Step 4: Implement Windows event collection and scan orchestration**

Create `src/main/diagnostics/events.ts`:

```ts
import type { EvidenceStatus, PowerEvent } from '../../shared/types';
import { runCommand } from './commandRunner';

export const collectRecentPowerEvents = async (): Promise<{ status: EvidenceStatus; records: PowerEvent[]; error?: string }> => {
  const script = [
    "$events = Get-WinEvent -FilterHashtable @{LogName='System'; ProviderName='Microsoft-Windows-Power-Troubleshooter'; StartTime=(Get-Date).AddDays(-7)} -MaxEvents 20",
    "$events | Select-Object TimeCreated,ProviderName,Id,Message | ConvertTo-Json -Depth 3"
  ].join('; ');
  const result = await runCommand('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], 15000);

  if (result.status === 'failed') {
    return { status: 'failed', records: [], error: result.stderr || result.stdout };
  }

  if (!result.stdout.trim()) {
    return { status: 'empty', records: [] };
  }

  const parsed = JSON.parse(result.stdout) as Array<Record<string, unknown>> | Record<string, unknown>;
  const rows = Array.isArray(parsed) ? parsed : [parsed];

  return {
    status: 'ok',
    records: rows.map((row) => ({
      timeCreated: String(row.TimeCreated ?? ''),
      providerName: String(row.ProviderName ?? ''),
      id: Number(row.Id ?? 0),
      message: String(row.Message ?? '')
    }))
  };
};
```

Create `src/main/scan/runScan.ts`:

```ts
import { randomUUID } from 'node:crypto';
import { release, type } from 'node:os';
import type { RawScanEvidence, WakeScanRecord } from '../../shared/types';
import { analyzeWakeEvidence } from '../analyzer/analyzeWake';
import { runCommand } from '../diagnostics/commandRunner';
import { collectRecentPowerEvents } from '../diagnostics/events';

export const runWakeScan = async (): Promise<WakeScanRecord> => {
  const scanId = randomUUID();
  const startedAt = new Date().toISOString();
  const [lastwake, waketimers, requests, wakeArmed, events] = await Promise.all([
    runCommand('powercfg.exe', ['/lastwake']),
    runCommand('powercfg.exe', ['/waketimers']),
    runCommand('powercfg.exe', ['/requests']),
    runCommand('powercfg.exe', ['/devicequery', 'wake_armed']),
    collectRecentPowerEvents()
  ]);
  const completedAt = new Date().toISOString();

  const evidence: RawScanEvidence = {
    scanId,
    startedAt,
    completedAt,
    osVersion: `${type()} ${release()}`,
    commands: {
      lastwake,
      waketimers,
      requests,
      wakeArmed
    },
    events
  };

  return {
    id: scanId,
    createdAt: completedAt,
    evidence,
    diagnosis: analyzeWakeEvidence(evidence)
  };
};
```

- [ ] **Step 5: Run diagnostics tests**

Run: `npx vitest run src/main/diagnostics/commandRunner.test.ts src/main/diagnostics/powercfg.test.ts src/main/analyzer/analyzeWake.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit diagnostics runner**

Run:

```powershell
git add src/main/diagnostics/commandRunner.ts src/main/diagnostics/commandRunner.test.ts src/main/diagnostics/events.ts src/main/scan/runScan.ts
git commit -m "feat: collect Windows wake diagnostics"
```

Expected: commit succeeds.

## Task 6: History Storage And Reporting

**Files:**
- Create: `src/main/storage/historyStore.test.ts`
- Create: `src/main/storage/historyStore.ts`
- Create: `src/main/reporting/reportExporter.test.ts`
- Create: `src/main/reporting/reportExporter.ts`

- [ ] **Step 1: Write failing storage tests**

Create `src/main/storage/historyStore.test.ts`:

```ts
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { WakeScanRecord } from '../../shared/types';
import { HistoryStore } from './historyStore';

let tempDir = '';

const record = (id: string): WakeScanRecord => ({
  id,
  createdAt: '2026-06-23T12:00:00.000Z',
  evidence: {
    scanId: id,
    startedAt: '2026-06-23T12:00:00.000Z',
    completedAt: '2026-06-23T12:00:01.000Z',
    osVersion: 'Windows',
    commands: {
      lastwake: { command: 'powercfg /lastwake', status: 'empty', stdout: '', stderr: '', exitCode: 0, durationMs: 1, collectedAt: '2026-06-23T12:00:00.000Z' },
      waketimers: { command: 'powercfg /waketimers', status: 'empty', stdout: '', stderr: '', exitCode: 0, durationMs: 1, collectedAt: '2026-06-23T12:00:00.000Z' },
      requests: { command: 'powercfg /requests', status: 'empty', stdout: '', stderr: '', exitCode: 0, durationMs: 1, collectedAt: '2026-06-23T12:00:00.000Z' },
      wakeArmed: { command: 'powercfg /devicequery wake_armed', status: 'empty', stdout: '', stderr: '', exitCode: 0, durationMs: 1, collectedAt: '2026-06-23T12:00:00.000Z' }
    },
    events: { status: 'empty', records: [] }
  },
  diagnosis: {
    family: 'unknown',
    confidence: 'unknown',
    headline: 'Unknown',
    explanation: 'No evidence',
    evidenceSummary: [],
    recommendations: []
  }
});

afterEach(() => {
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
});

describe('HistoryStore', () => {
  it('persists records newest first', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'wakelens-'));
    const store = new HistoryStore(join(tempDir, 'history.json'));

    await store.add(record('older'));
    await store.add(record('newer'));

    expect((await store.list()).map((item) => item.id)).toEqual(['newer', 'older']);
  });
});
```

- [ ] **Step 2: Run storage test to verify RED**

Run: `npx vitest run src/main/storage/historyStore.test.ts`

Expected: FAIL because `historyStore.ts` does not exist.

- [ ] **Step 3: Implement history store**

Create `src/main/storage/historyStore.ts`:

```ts
import { copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { WakeScanRecord } from '../../shared/types';

export class HistoryStore {
  constructor(private readonly filePath: string) {}

  async list(): Promise<WakeScanRecord[]> {
    try {
      const content = await readFile(this.filePath, 'utf8');
      const parsed = JSON.parse(content) as WakeScanRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      const backup = `${this.filePath}.corrupt-${Date.now()}.bak`;
      await copyFile(this.filePath, backup).catch(() => undefined);
      await rename(this.filePath, backup).catch(() => undefined);
      return [];
    }
  }

  async add(record: WakeScanRecord): Promise<WakeScanRecord[]> {
    const records = [record, ...(await this.list())].slice(0, 100);
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(records, null, 2), 'utf8');
    return records;
  }
}
```

- [ ] **Step 4: Write failing report tests**

Create `src/main/reporting/reportExporter.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { WakeScanRecord } from '../../shared/types';
import { createJsonReport, createMarkdownReport } from './reportExporter';

const sample: WakeScanRecord = {
  id: 'scan-1',
  createdAt: '2026-06-23T12:00:00.000Z',
  evidence: {
    scanId: 'scan-1',
    startedAt: '2026-06-23T12:00:00.000Z',
    completedAt: '2026-06-23T12:00:01.000Z',
    osVersion: 'Windows',
    commands: {
      lastwake: { command: 'powercfg /lastwake', status: 'ok', stdout: 'Wake Source Count - 0', stderr: '', exitCode: 0, durationMs: 1, collectedAt: '2026-06-23T12:00:00.000Z' },
      waketimers: { command: 'powercfg /waketimers', status: 'empty', stdout: '', stderr: '', exitCode: 0, durationMs: 1, collectedAt: '2026-06-23T12:00:00.000Z' },
      requests: { command: 'powercfg /requests', status: 'empty', stdout: '', stderr: '', exitCode: 0, durationMs: 1, collectedAt: '2026-06-23T12:00:00.000Z' },
      wakeArmed: { command: 'powercfg /devicequery wake_armed', status: 'empty', stdout: '', stderr: '', exitCode: 0, durationMs: 1, collectedAt: '2026-06-23T12:00:00.000Z' }
    },
    events: { status: 'empty', records: [] }
  },
  diagnosis: {
    family: 'unknown',
    confidence: 'unknown',
    headline: 'Windows did not reveal a reliable wake source',
    explanation: 'Windows did not expose enough evidence.',
    evidenceSummary: ['Wake Source Count - 0'],
    recommendations: [{ title: 'Scan again', body: 'Run WakeLens after the next wake.' }]
  }
};

describe('reportExporter', () => {
  it('creates a markdown support report', () => {
    const report = createMarkdownReport(sample);

    expect(report.filename).toBe('wakelens-scan-1.md');
    expect(report.content).toContain('# WakeLens Report');
    expect(report.content).toContain('Windows did not reveal a reliable wake source');
  });

  it('creates a JSON report', () => {
    const report = createJsonReport(sample);

    expect(report.filename).toBe('wakelens-scan-1.json');
    expect(JSON.parse(report.content).diagnosis.family).toBe('unknown');
  });
});
```

- [ ] **Step 5: Run report tests to verify RED**

Run: `npx vitest run src/main/reporting/reportExporter.test.ts`

Expected: FAIL because `reportExporter.ts` does not exist.

- [ ] **Step 6: Implement report exporters**

Create `src/main/reporting/reportExporter.ts`:

```ts
import type { ExportedReport, WakeScanRecord } from '../../shared/types';

const safeId = (id: string): string => id.replace(/[^a-z0-9-]/gi, '-').toLowerCase();

export const createMarkdownReport = (record: WakeScanRecord): ExportedReport => {
  const lines = [
    '# WakeLens Report',
    '',
    `Scan ID: ${record.id}`,
    `Created: ${record.createdAt}`,
    `OS: ${record.evidence.osVersion}`,
    '',
    '## Diagnosis',
    '',
    `Family: ${record.diagnosis.family}`,
    `Confidence: ${record.diagnosis.confidence}`,
    `Headline: ${record.diagnosis.headline}`,
    '',
    record.diagnosis.explanation,
    '',
    '## Evidence Summary',
    '',
    ...record.diagnosis.evidenceSummary.map((item) => `- ${item}`),
    '',
    '## Recommendations',
    '',
    ...record.diagnosis.recommendations.map((item) => `- ${item.title}: ${item.body}`),
    '',
    '## Raw Commands',
    '',
    ...Object.values(record.evidence.commands).flatMap((command) => [
      `### ${command.command}`,
      '',
      `Status: ${command.status}`,
      '',
      '```text',
      command.stdout || command.stderr || 'No output.',
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
```

- [ ] **Step 7: Run storage and reporting tests**

Run: `npx vitest run src/main/storage/historyStore.test.ts src/main/reporting/reportExporter.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit storage and reports**

Run:

```powershell
git add src/main/storage src/main/reporting
git commit -m "feat: persist wake history and export reports"
```

Expected: commit succeeds.

## Task 7: Electron Shell And Secure IPC

**Files:**
- Create: `src/main/main.ts`
- Create: `src/main/ipc.ts`
- Create: `src/preload/preload.ts`
- Create: `src/renderer/main.tsx`
- Create: `src/renderer/App.tsx`
- Create: `src/renderer/styles.css`

- [ ] **Step 1: Add Electron main process**

Create `src/main/main.ts`:

```ts
import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { registerIpcHandlers } from './ipc';

const createWindow = (): void => {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 940,
    minHeight: 640,
    title: 'WakeLens',
    backgroundColor: '#f6f7f9',
    webPreferences: {
      preload: join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'));
  }
};

app.whenReady().then(() => {
  registerIpcHandlers(app.getPath('userData'));
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
```

- [ ] **Step 2: Add IPC handlers**

Create `src/main/ipc.ts`:

```ts
import { dialog, ipcMain, shell } from 'electron';
import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { createJsonReport, createMarkdownReport } from './reporting/reportExporter';
import { runWakeScan } from './scan/runScan';
import { HistoryStore } from './storage/historyStore';

export const registerIpcHandlers = (userDataPath: string): void => {
  const history = new HistoryStore(join(userDataPath, 'history.json'));

  ipcMain.handle('wakelens:scan', async () => {
    const record = await runWakeScan();
    await history.add(record);
    return record;
  });

  ipcMain.handle('wakelens:history', async () => history.list());

  ipcMain.handle('wakelens:export', async (_event, record, format: 'markdown' | 'json') => {
    const report = format === 'markdown' ? createMarkdownReport(record) : createJsonReport(record);
    const result = await dialog.showSaveDialog({
      defaultPath: report.filename,
      filters: [{ name: format === 'markdown' ? 'Markdown' : 'JSON', extensions: [format === 'markdown' ? 'md' : 'json'] }]
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    await writeFile(result.filePath, report.content, 'utf8');
    return { canceled: false, filePath: result.filePath };
  });

  ipcMain.handle('wakelens:open-tool', async (_event, command: string) => {
    await shell.openPath(command);
  });
};
```

- [ ] **Step 3: Add preload API**

Create `src/preload/preload.ts`:

```ts
import { contextBridge, ipcRenderer } from 'electron';
import type { WakeScanRecord } from '../shared/types';

const api = {
  scan: (): Promise<WakeScanRecord> => ipcRenderer.invoke('wakelens:scan'),
  history: (): Promise<WakeScanRecord[]> => ipcRenderer.invoke('wakelens:history'),
  exportReport: (record: WakeScanRecord, format: 'markdown' | 'json'): Promise<{ canceled: boolean; filePath?: string }> =>
    ipcRenderer.invoke('wakelens:export', record, format),
  openTool: (command: string): Promise<void> => ipcRenderer.invoke('wakelens:open-tool', command)
};

contextBridge.exposeInMainWorld('wakeLens', api);

declare global {
  interface Window {
    wakeLens: typeof api;
  }
}
```

- [ ] **Step 4: Add minimal renderer entry and app**

Create `src/renderer/main.tsx`:

```tsx
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

Create `src/renderer/App.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import type { WakeScanRecord } from '../shared/types';

type View = 'dashboard' | 'history' | 'recommendations' | 'report';

export const App = (): JSX.Element => {
  const [view, setView] = useState<View>('dashboard');
  const [history, setHistory] = useState<WakeScanRecord[]>([]);
  const [active, setActive] = useState<WakeScanRecord | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const latest = active ?? history[0] ?? null;

  useEffect(() => {
    window.wakeLens.history().then((records) => {
      setHistory(records);
      setActive(records[0] ?? null);
    });
  }, []);

  const confidenceText = useMemo(() => {
    if (!latest) return 'No scan yet';
    return latest.diagnosis.confidence.toUpperCase();
  }, [latest]);

  const scan = async (): Promise<void> => {
    setIsScanning(true);
    try {
      const record = await window.wakeLens.scan();
      const records = await window.wakeLens.history();
      setActive(record);
      setHistory(records);
      setView('dashboard');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">W</div>
          <div>
            <strong>WakeLens</strong>
            <span>Sleep diagnostics</span>
          </div>
        </div>
        {(['dashboard', 'history', 'recommendations', 'report'] as View[]).map((item) => (
          <button className={view === item ? 'nav-item active' : 'nav-item'} key={item} onClick={() => setView(item)}>
            {item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Windows wake diagnosis</p>
            <h1>Find out why this PC woke up</h1>
          </div>
          <button className="primary" onClick={scan} disabled={isScanning}>
            {isScanning ? 'Scanning...' : 'Scan now'}
          </button>
        </header>

        {view === 'dashboard' && (
          <section className="dashboard-grid">
            <article className="result-panel">
              <span className={`confidence ${latest?.diagnosis.confidence ?? 'unknown'}`}>{confidenceText}</span>
              <h2>{latest?.diagnosis.headline ?? 'No wake scan has been run yet'}</h2>
              <p>{latest?.diagnosis.explanation ?? 'Run a scan after an unexpected wake to collect Windows evidence.'}</p>
              <div className="actions">
                <button className="primary" onClick={scan} disabled={isScanning}>Scan now</button>
                {latest && <button onClick={() => window.wakeLens.exportReport(latest, 'markdown')}>Export Markdown</button>}
              </div>
            </article>
            <article className="evidence-panel">
              <h3>Evidence</h3>
              {(latest?.diagnosis.evidenceSummary ?? ['No evidence collected yet.']).map((item) => <p key={item}>{item}</p>)}
            </article>
          </section>
        )}

        {view === 'history' && (
          <section className="list-panel">
            <h2>Scan history</h2>
            {history.map((record) => (
              <button className="history-row" key={record.id} onClick={() => setActive(record)}>
                <span>{new Date(record.createdAt).toLocaleString()}</span>
                <strong>{record.diagnosis.headline}</strong>
                <em>{record.diagnosis.confidence}</em>
              </button>
            ))}
            {history.length === 0 && <p>No scans saved yet.</p>}
          </section>
        )}

        {view === 'recommendations' && (
          <section className="list-panel">
            <h2>Safe next steps</h2>
            {(latest?.diagnosis.recommendations ?? []).map((item) => (
              <article className="recommendation" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.body}</p>
                {item.command && <button onClick={() => window.wakeLens.openTool(item.command!)}>{item.actionLabel}</button>}
              </article>
            ))}
            {!latest && <p>Run a scan to see recommendations.</p>}
          </section>
        )}

        {view === 'report' && (
          <section className="list-panel">
            <h2>Export a support report</h2>
            <p>Reports include the diagnosis, evidence summary, recommendations, and raw command output.</p>
            <div className="actions">
              {latest && <button onClick={() => window.wakeLens.exportReport(latest, 'markdown')}>Save Markdown</button>}
              {latest && <button onClick={() => window.wakeLens.exportReport(latest, 'json')}>Save JSON</button>}
              {!latest && <button disabled>Run a scan first</button>}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
```

Create `src/renderer/styles.css`:

```css
:root {
  color: #18212f;
  background: #f6f7f9;
  font-family: Inter, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  font-size: 16px;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-width: 900px;
  min-height: 620px;
  background: #f6f7f9;
}

button {
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  color: #1f2937;
  background: #e7ebf0;
  font: inherit;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.app-shell {
  display: grid;
  grid-template-columns: 248px minmax(0, 1fr);
  min-height: 100vh;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 24px 18px;
  background: #111827;
  color: #f8fafc;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
}

.brand-mark {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 8px;
  background: #38bdf8;
  color: #082f49;
  font-weight: 800;
}

.brand span,
.eyebrow {
  display: block;
  margin-top: 2px;
  color: #94a3b8;
  font-size: 0.86rem;
}

.nav-item {
  width: 100%;
  text-align: left;
  color: #cbd5e1;
  background: transparent;
}

.nav-item.active,
.nav-item:hover {
  color: #ffffff;
  background: #243244;
}

.workspace {
  min-width: 0;
  padding: 28px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}

h1,
h2,
h3,
p {
  overflow-wrap: anywhere;
}

h1 {
  margin: 0;
  font-size: 2rem;
  letter-spacing: 0;
}

h2 {
  margin: 0 0 10px;
  font-size: 1.55rem;
  letter-spacing: 0;
}

h3 {
  margin: 0 0 8px;
  font-size: 1rem;
  letter-spacing: 0;
}

p {
  line-height: 1.55;
}

.primary {
  color: #ffffff;
  background: #0369a1;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, 0.65fr);
  gap: 18px;
}

.result-panel,
.evidence-panel,
.list-panel,
.recommendation {
  border: 1px solid #d7dee8;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.07);
}

.result-panel,
.evidence-panel,
.list-panel {
  padding: 22px;
}

.result-panel {
  min-height: 320px;
}

.confidence {
  display: inline-flex;
  margin-bottom: 18px;
  border-radius: 999px;
  padding: 6px 10px;
  background: #e2e8f0;
  color: #334155;
  font-size: 0.78rem;
  font-weight: 700;
}

.confidence.high {
  background: #dcfce7;
  color: #166534;
}

.confidence.medium {
  background: #fef3c7;
  color: #92400e;
}

.confidence.low {
  background: #fee2e2;
  color: #991b1b;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 18px;
}

.list-panel {
  display: grid;
  gap: 14px;
}

.history-row {
  display: grid;
  grid-template-columns: 190px minmax(0, 1fr) 90px;
  gap: 14px;
  align-items: center;
  width: 100%;
  border: 1px solid #d7dee8;
  background: #f8fafc;
  text-align: left;
}

.history-row strong {
  min-width: 0;
}

.history-row em {
  color: #475569;
  font-style: normal;
  text-align: right;
}

.recommendation {
  padding: 18px;
}

@media (max-width: 980px) {
  body {
    min-width: 0;
  }

  .app-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: sticky;
    top: 0;
    z-index: 1;
    flex-direction: row;
    align-items: center;
    overflow-x: auto;
  }

  .brand {
    margin-bottom: 0;
  }

  .nav-item {
    width: auto;
    white-space: nowrap;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .topbar,
  .history-row {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }
}
```

- [ ] **Step 5: Run typecheck and build**

Run: `npm run typecheck`

Expected: PASS.

Run: `npm run build`

Expected: PASS and `dist/` is created.

- [ ] **Step 6: Commit Electron app shell**

Run:

```powershell
git add src/main/main.ts src/main/ipc.ts src/preload/preload.ts src/renderer
git commit -m "feat: add WakeLens desktop interface"
```

Expected: commit succeeds.

## Task 8: Documentation, Marketing, And CI

**Files:**
- Create: `README.md`
- Create: `docs/USER_GUIDE.md`
- Create: `docs/TECHNICAL.md`
- Create: `docs/TROUBLESHOOTING.md`
- Create: `docs/MARKETING.md`
- Create: `LICENSE`
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create public README**

Create `README.md`:

~~~markdown
# WakeLens

WakeLens helps Windows users understand why their PC woke up from sleep.

## Why WakeLens exists

Windows can wake because of devices, wake timers, scheduled tasks, updates, or power requests. The evidence is usually split across `powercfg`, Event Viewer, Device Manager, and Task Scheduler. WakeLens collects the evidence and turns it into a readable diagnosis.

## Features

- One-click wake diagnosis
- Confidence level and plain-language explanation
- Evidence from `powercfg` and Windows power events
- Local scan history
- Markdown and JSON report export
- No telemetry
- Safe by default: no silent power setting changes

## Run from source

```powershell
npm install
npm run dev
```

## Build

```powershell
npm run build
npm run dist
```

## Privacy

WakeLens stores scan history locally and does not send telemetry.
~~~

- [ ] **Step 2: Create user and technical docs**

Create `docs/USER_GUIDE.md`:

```markdown
# WakeLens User Guide

## Scan after the problem happens

WakeLens is most useful right after the PC wakes unexpectedly. Open WakeLens and choose `Scan now`. The app collects Windows wake evidence and stores the scan locally.

## Read the diagnosis

The dashboard shows a headline, confidence level, and supporting evidence.

- High confidence means Windows named a concrete source and the evidence is consistent.
- Medium confidence means one strong source exists, but corroborating evidence is limited.
- Low confidence means WakeLens found a related clue, but it may not be the exact wake source.
- Unknown means Windows did not expose enough evidence.

## Export a report

Open `Report`, then choose Markdown or JSON. Markdown is best for forums and GitHub issues. JSON is best for technical analysis.

## Act safely

WakeLens does not silently change system settings. Review each recommendation, then decide whether to open Device Manager, Task Scheduler, or Windows power settings.
```

Create `docs/TECHNICAL.md`:

```markdown
# WakeLens Technical Notes

## Architecture

WakeLens uses Electron with a secure split between main, preload, and renderer code. The renderer cannot access Node.js directly. It calls a narrow preload API for scans, history, and exports.

## Data sources

WakeLens collects:

- `powercfg /lastwake`
- `powercfg /waketimers`
- `powercfg /requests`
- `powercfg /devicequery wake_armed`
- Recent `Microsoft-Windows-Power-Troubleshooter` events from the System log

## Diagnosis model

The analyzer classifies evidence as device wake, timer wake, power request, immediate wake, or unknown. It assigns confidence based on how direct and corroborated the evidence is.

## Privacy

Scan history is stored locally in the app data folder. WakeLens does not send telemetry or upload reports.
```

Create `docs/TROUBLESHOOTING.md`:

```markdown
# WakeLens Troubleshooting

## Wake Source: Unknown

`Wake Source: Unknown` means Windows did not expose a reliable source for the latest wake. It is common and does not prove malware. Run WakeLens again immediately after the next unexpected wake.

## No wake timers found

If no wake timers are found, the cause may be a device, driver, network adapter, or a Modern Standby behavior rather than a scheduled timer.

## The app shows low confidence

Low confidence means WakeLens found a related clue but cannot prove it caused the wake. Export the report and compare several scans over time.

## PowerShell or event log errors

Some event queries can fail because logs are disabled, old entries were cleared, or permissions are restricted. WakeLens still preserves command evidence when event logs are unavailable.
```

- [ ] **Step 3: Create marketing document**

Create `docs/MARKETING.md`:

```markdown
# WakeLens Marketing

## Tagline

Stop guessing why your Windows PC woke up.

## One-liner

WakeLens is a friendly Windows app that gathers power diagnostics and explains the most likely wake cause in plain language.

## Audience

- People whose PC wakes at night
- Laptop users with battery drain after sleep
- Helpers who need a clean report from another user's machine

## Positioning

WakeLens is not a replacement for Windows power tools. It is the readable layer on top of them.

## Launch Copy

Your PC woke up again. Windows has clues, but they are scattered across command output, event logs, and device settings. WakeLens collects those clues, estimates the likely cause, and gives you a report you can understand or share.
```

- [ ] **Step 4: Add MIT license**

Create `LICENSE` with the MIT license text and copyright holder `jeckside`.

- [ ] **Step 5: Add CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  validate:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm test
      - run: npm run build
```

- [ ] **Step 6: Run validation**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 7: Commit docs and CI**

Run:

```powershell
git add README.md docs LICENSE .github/workflows/ci.yml
git commit -m "docs: prepare WakeLens public launch materials"
```

Expected: commit succeeds.

## Task 9: Local App Verification And Public GitHub Repository

**Files:**
- Modify: `README.md` if screenshots or repository URL need updating.

- [ ] **Step 1: Run full validation**

Run:

```powershell
npm run typecheck
npm test
npm run build
```

Expected: all commands PASS.

- [ ] **Step 2: Launch development app**

Run: `npm run dev`

Expected: WakeLens opens with dashboard, navigation, scan button, history, recommendations, and report screens.

- [ ] **Step 3: Run a real scan**

Click `Scan now`.

Expected: app returns a diagnosis or an unknown result with preserved evidence; it must not crash if `Wake Source Count - 0` appears.

- [ ] **Step 4: Verify export**

Use the Report screen to save Markdown and JSON.

Expected: both files are created and contain the latest scan.

- [ ] **Step 5: Create public GitHub repository**

Run:

```powershell
gh repo create wakelens --public --source . --remote origin --description "Find out why your Windows PC woke up." --push
```

Expected: public repository is created under the authenticated GitHub account and `main` is pushed.

- [ ] **Step 6: Add repository topics**

Run:

```powershell
gh repo edit wakelens --add-topic windows --add-topic electron --add-topic powercfg --add-topic sleep --add-topic wake --add-topic diagnostics
```

Expected: repository topics are updated.

- [ ] **Step 7: Create first GitHub release**

Run:

```powershell
npm run dist
gh release create v0.1.0 release/*.exe --title "WakeLens v0.1.0" --notes "Initial public release of WakeLens for Windows wake diagnostics."
```

Expected: release is public and includes the Windows installer.

- [ ] **Step 8: Final completion audit**

Verify these evidence points:
- Local `npm run build` passes.
- Electron app opens.
- Real scan completes.
- History persists after app restart.
- Markdown and JSON export work.
- README and docs exist.
- GitHub repository is public.
- GitHub release exists or a documented reason is recorded if installer packaging is blocked.

Only mark the goal complete after all points are verified.
