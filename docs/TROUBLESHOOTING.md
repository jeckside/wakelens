# WakeLens Troubleshooting

## Wake Source: Unknown

`Wake Source: Unknown` means Windows did not expose a reliable source for the latest wake. It is common and does not prove malware. Run WakeLens again immediately after the next unexpected wake.

## No Wake Timers Found

If no wake timers are found, the cause may be a device, driver, network adapter, or a Modern Standby behavior rather than a scheduled timer.

## The App Shows Low Confidence

Low confidence means WakeLens found a related clue but cannot prove it caused the wake. Export the report and compare several scans over time.

## PowerShell Or Event Log Errors

Some event queries can fail because logs are disabled, old entries were cleared, or permissions are restricted. WakeLens still preserves command evidence when event logs are unavailable.

## Scan Shows A Device

Open Device Manager and inspect the matching device. Common wake-capable devices include mice, keyboards, USB controllers, Bluetooth devices, and network adapters.

## Scan Shows A Timer

Open Task Scheduler or Windows power settings and confirm whether the timer is expected. Windows Update, maintenance, backup software, and OEM tools can all create wake timers.

## App Does Not Start From Source

Run:

```powershell
npm install
npm run build
npm run dev
```

If build fails, confirm that Node.js 24 or later is installed.
