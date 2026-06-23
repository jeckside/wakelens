# WakeLens

WakeLens helps Windows users understand why their PC woke up from sleep.

Windows already keeps clues in `powercfg`, Event Viewer, wake timers, devices, and power requests. The problem is that those clues are scattered and technical. WakeLens collects them, explains the likely cause, and lets you export a clean support report.

## Why WakeLens Exists

Unexpected wake-ups are a real Windows problem: a desktop can wake at night, a laptop can drain battery after sleep, and `Wake Source: Unknown` often gives users no practical answer. WakeLens is a readable layer over Windows diagnostics, not a replacement for them.

## Features

- One-click wake diagnosis
- Confidence level and plain-language explanation
- Evidence from `powercfg` and Windows power events
- Local scan history
- Markdown and JSON report export
- No telemetry
- Safe by default: no silent power setting changes

## Screens

- Dashboard: latest diagnosis, confidence, evidence, and scan action
- History: previous scans saved locally
- Recommendations: safe next steps based on the result
- Report: Markdown and JSON export for support threads

## Run From Source

```powershell
npm install
npm run dev
```

## Validate

```powershell
npm run typecheck
npm test
npm run build
```

## Build Installer

```powershell
npm run dist
```

The Windows installer is written to `release/`.

## Privacy

WakeLens stores scan history locally in the app data folder. It does not send telemetry, upload reports, or require an account.

## Safety

WakeLens 0.1 is diagnostic-first. It can open Windows tools such as Device Manager or Task Scheduler, but it does not silently disable devices, scheduled tasks, wake timers, or power settings.

## Documentation

- [User Guide](docs/USER_GUIDE.md)
- [Technical Notes](docs/TECHNICAL.md)
- [Troubleshooting](docs/TROUBLESHOOTING.md)
- [Marketing](docs/MARKETING.md)

## License

MIT
