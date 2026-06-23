# WakeLens Technical Notes

## Architecture

WakeLens uses Electron with a secure split between main, preload, and renderer code. The renderer cannot access Node.js directly. It calls a narrow preload API for scans, history, report export, and opening approved Windows tools.

## Main Modules

- `src/main/diagnostics/commandRunner.ts`: timeout-aware command execution and failure classification.
- `src/main/diagnostics/powercfg.ts`: parsers for `powercfg` output, including wake timers, requests, lastwake, and wake-armed devices.
- `src/main/diagnostics/events.ts`: PowerShell query for recent Power-Troubleshooter events.
- `src/main/analyzer/analyzeWake.ts`: evidence classification, diagnostic issues, confidence, and recommendations.
- `src/main/toolLauncher.ts`: whitelist for opening Windows tools and relaunching as administrator.
- `src/main/storage/historyStore.ts`: local JSON scan history.
- `src/main/reporting/reportExporter.ts`: Markdown and JSON reports.
- `src/renderer/viewModel.ts`: user-facing evidence cards and repeated-suspect summaries.

## Data Sources

WakeLens collects:

- `powercfg /lastwake`
- `powercfg /waketimers`
- `powercfg /requests`
- `powercfg /devicequery wake_armed`
- Recent `Microsoft-Windows-Power-Troubleshooter` events from the System log

## Diagnosis Model

The analyzer classifies evidence as:

- Device wake
- Timer wake
- Power request
- Immediate wake
- Unknown

Confidence is based on how direct and corroborated the evidence is. A concrete device source from `powercfg /lastwake` is high confidence. A Power-Troubleshooter wake source is medium confidence. Wake timers are medium confidence when lastwake is unknown. Wake-armed devices are low confidence because they are candidates, not proof.

## Failure Classification

WakeLens preserves raw output, but also classifies common command failures:

- `permission-required`: Windows says the command needs administrator/elevated permission.
- `timeout`: the diagnostic exceeded its timeout.
- `not-found`: Windows could not find the command.
- `exit-code`: the command returned a non-zero exit code.
- `unknown`: the command failed without enough information.

## Security

WakeLens keeps `contextIsolation` enabled and disables Node integration in the renderer. Tool opening is whitelisted in the main process. The app does not run destructive or configuration-changing commands.

## Privacy

Scan history is stored locally in the app data folder. WakeLens does not send telemetry or upload reports.
