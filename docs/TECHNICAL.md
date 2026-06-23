# WakeLens Technical Notes

## Architecture

WakeLens uses Electron with a secure split between main, preload, and renderer code. The renderer cannot access Node.js directly. It calls a narrow preload API for scans, history, report export, and opening approved Windows tools.

## Main Modules

- `src/main/diagnostics/commandRunner.ts`: timeout-aware command execution.
- `src/main/diagnostics/powercfg.ts`: parsers for `powercfg` output.
- `src/main/diagnostics/events.ts`: PowerShell query for recent power events.
- `src/main/analyzer/analyzeWake.ts`: evidence classification and recommendations.
- `src/main/storage/historyStore.ts`: local JSON scan history.
- `src/main/reporting/reportExporter.ts`: Markdown and JSON reports.
- `src/main/scan/runScan.ts`: scan orchestration.
- `src/preload/preload.ts`: secure renderer bridge.
- `src/renderer/App.tsx`: user interface.

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

Confidence is based on how direct and corroborated the evidence is. A concrete device source from `powercfg /lastwake` is high confidence. An active wake timer without a matching wake source is medium confidence. A power request is low confidence because it can affect sleep without proving it caused the wake.

## Security

WakeLens keeps `contextIsolation` enabled and disables Node integration in the renderer. Tool opening is whitelisted in the main process. The MVP does not run destructive or configuration-changing commands.

## Privacy

Scan history is stored locally in the app data folder. WakeLens does not send telemetry or upload reports.
