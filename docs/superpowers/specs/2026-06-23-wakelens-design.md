# WakeLens Product Design

## Summary

WakeLens is a Windows desktop application that explains why a PC woke from sleep, hibernation, or Modern Standby. It turns scattered Windows diagnostics into a clear answer for non-technical users: what likely woke the computer, how confident WakeLens is, and what safe next step the user can take.

The first public version focuses on diagnosis and reporting. It does not silently change power settings. Any corrective action must be explicit, reversible where possible, and explained before it runs.

## Problem

Windows users regularly see their PC wake up unexpectedly, sometimes at night or seconds after entering sleep. Built-in investigation is fragmented across `powercfg`, Event Viewer, Task Scheduler, Device Manager, and power-plan settings. Existing advice usually tells users to run several commands manually and interpret technical output such as wake timers, wake-armed devices, and power requests.

WakeLens solves the user-facing gap: it collects the same evidence automatically, correlates it, and presents a plain-language explanation.

## Audience

Primary users:
- Everyday Windows users whose laptop or desktop wakes unexpectedly.
- Students and office users who need a simple answer without reading Event Viewer.
- Technical helpers who want a clean report from another person's PC.

Secondary users:
- Power users who already know `powercfg`, but want a faster history and exportable evidence.

## Product Promise

Stop guessing why your Windows PC woke up. Open WakeLens, run one scan, and get a readable diagnosis with the evidence behind it.

## MVP Scope

WakeLens 1.0 must include:
- A polished Electron desktop app for Windows.
- A main dashboard with the latest wake diagnosis.
- A one-click scan that gathers current power diagnostics.
- A history view for previous scans.
- A recommendations view with safe, manual next steps.
- Markdown and JSON report export.
- Local-only storage with no telemetry.
- Public GitHub repository with documentation and marketing-ready README.

WakeLens 1.0 will not include:
- Background service installation.
- Automatic driver changes.
- Automatic disabling of devices, wake timers, or scheduled tasks.
- Cloud sync or account login.
- Antivirus-style malware claims.

## Data Sources

The app gathers evidence from Windows APIs and command-line tools available on standard Windows systems:
- `powercfg /lastwake`
- `powercfg /waketimers`
- `powercfg /requests`
- `powercfg /devicequery wake_armed`
- Event Viewer entries from relevant Windows power logs, queried through PowerShell.
- Optional system context such as OS version, active power plan, and scan time.

If a command is unavailable, blocked, or returns empty data, WakeLens records that as evidence instead of hiding it.

## Diagnosis Model

WakeLens classifies each scan into one of these cause families:
- Device wake: mouse, keyboard, USB controller, network adapter, Bluetooth device, or other wake-armed hardware.
- Timer wake: wake timer, update task, maintenance task, backup tool, or scheduled task.
- Power request: process or driver preventing sleep or requesting power availability.
- Immediate wake after sleep: likely device, driver, or Modern Standby behavior requiring follow-up checks.
- Unknown: Windows did not expose enough evidence.

Each diagnosis includes:
- A plain-language headline.
- Confidence: high, medium, or low.
- Supporting evidence from collected commands and logs.
- Recommended next action.

Confidence rules:
- High: multiple evidence sources agree, or `lastwake` identifies a concrete device/task and logs align.
- Medium: one strong source points to a cause, but corroborating logs are missing.
- Low: only indirect evidence exists, such as wake-armed devices without a matching wake event.
- Unknown: no reliable cause can be inferred.

## User Experience

### Dashboard

The dashboard is the default screen. It should show:
- Current status card: latest scan result and confidence.
- Primary action: `Scan now`.
- Secondary action: `Export report`.
- Compact evidence summary.
- Clear empty state before the first scan.

The UI language should be calm and practical. It should avoid alarming phrasing unless the evidence supports it.

### History

The history screen lists previous scans with:
- Timestamp.
- Diagnosis family.
- Confidence.
- Short result.
- Details button.

The details panel shows raw evidence in a collapsed technical section so advanced users can inspect the original command output.

### Recommendations

Recommendations must be safe and understandable. Examples:
- Open Windows power settings.
- Show wake-armed devices.
- Explain how to prevent a device from waking the PC.
- Explain how to inspect wake timers.
- Explain why `Wake Source: Unknown` does not prove malware.

The app may provide copyable commands, but it must not run destructive or configuration-changing commands without a separate confirmation flow.

### Reports

Reports must help users ask for support. Export formats:
- Markdown for forums, GitHub issues, and chats.
- JSON for technical analysis and reproducible bug reports.

Reports include scan time, app version, OS summary, diagnosis, confidence, recommendations, and raw evidence.

## Visual Design

WakeLens should look like a modern Windows utility for ordinary users, not an administrator console.

Design direction:
- Light theme by default with strong contrast.
- Calm accent color, not a one-color saturated palette.
- Left navigation with Dashboard, History, Recommendations, and Report.
- Large readable result area.
- Small technical details hidden behind disclosure controls.
- Clear status chips for confidence and cause family.
- No decorative clutter that competes with the diagnosis.

The interface must be usable at common desktop sizes and remain readable on smaller laptop screens.

## Architecture

WakeLens uses Electron because the local environment has Node.js and npm available, while .NET SDK is not installed.

Core modules:
- `main`: Electron main process, window lifecycle, secure IPC registration.
- `preload`: narrow bridge exposing scan, history, and export APIs to the renderer.
- `renderer`: UI screens and state management.
- `diagnostics`: Windows command execution and PowerShell event queries.
- `analyzer`: converts raw evidence into diagnosis, confidence, and recommendations.
- `storage`: local JSON history persistence.
- `reporting`: Markdown and JSON export.

Data flow:
1. User clicks `Scan now`.
2. Renderer calls the preload API.
3. Main process runs diagnostics through the diagnostics module.
4. Analyzer classifies the evidence.
5. Storage saves the scan record locally.
6. Renderer updates dashboard and history.
7. User can export a report.

## Security And Privacy

The app must:
- Keep `contextIsolation` enabled.
- Keep Node.js disabled in renderer pages.
- Expose only narrow IPC APIs through preload.
- Store data locally.
- Avoid telemetry.
- Avoid automatic setting changes in MVP.
- Sanitize command output before display where needed.

## Error Handling

Expected failures:
- `powercfg` returns no wake source.
- Event logs are unavailable or require permissions.
- PowerShell command fails or times out.
- JSON history file is corrupted.
- Export path cannot be written.

Behavior:
- Show a useful explanation instead of a crash.
- Preserve partial evidence.
- Let the user export partial reports.
- Reset corrupted local history only after creating a backup copy.

## Testing Strategy

Unit tests:
- Parse `powercfg` samples.
- Parse PowerShell event samples.
- Classify device wake, timer wake, power request, and unknown cases.
- Generate Markdown and JSON reports.
- Handle failed commands and empty outputs.

Integration checks:
- Run diagnostics commands on Windows.
- Verify app launches.
- Verify scan flow returns a structured result.
- Verify export creates files.

UI verification:
- Desktop screenshot check for non-overlapping text.
- Dashboard, history, recommendations, and report states.
- Empty, success, unknown, and error states.

## Documentation

Repository documentation must include:
- `README.md`: product pitch, screenshots, features, install/run instructions, privacy note, and project status.
- `docs/USER_GUIDE.md`: how to scan, read results, export reports, and act safely.
- `docs/TECHNICAL.md`: architecture, Windows data sources, diagnosis model, and security decisions.
- `docs/TROUBLESHOOTING.md`: common cases such as `Wake Source: Unknown`, permission issues, empty logs, and immediate wake after sleep.
- `docs/MARKETING.md`: positioning, tagline, audience, problem proof, and launch copy.

## Public Repository Requirements

The GitHub repository must be public and include:
- Clear name and description.
- Polished README.
- License.
- Screenshots or generated preview assets.
- GitHub Actions workflow for validation.
- Release instructions.
- Topics such as `windows`, `electron`, `powercfg`, `sleep`, `wake`, `diagnostics`.

## Acceptance Criteria

The goal is complete only when:
- The app can be installed or run locally on Windows.
- The app performs a real scan using Windows diagnostics.
- The dashboard displays a diagnosis with confidence and evidence.
- History persists across app restarts.
- Markdown and JSON export work.
- The UI is polished and understandable for non-technical users.
- Documentation covers user, technical, troubleshooting, and marketing needs.
- Tests or verification scripts cover parser, analyzer, report generation, and build basics.
- A public GitHub repository exists and contains the finished project.

## Open Decisions

These decisions are fixed for the first implementation unless later changed explicitly:
- Product name: WakeLens.
- Runtime: Electron and Node.js.
- First platform: Windows only.
- MVP safety posture: diagnosis and reporting first, no silent system changes.
