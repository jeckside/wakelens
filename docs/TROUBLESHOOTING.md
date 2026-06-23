# WakeLens Troubleshooting

## WakeLens Says Administrator Permission Is Needed

Some `powercfg` checks require elevated permission, especially wake timers and power requests on many Windows systems. Choose `Restart as administrator`, then run the scan again. This does not change power settings; it only allows WakeLens to collect more evidence.

## Wake Source: Unknown

`Wake Source: Unknown` means Windows did not expose a reliable source for the latest wake. It is common and does not prove malware. Run WakeLens again immediately after the next unexpected wake.

## Wake-Capable Devices Need Review

This means Windows did not name the exact wake source, but WakeLens found devices currently allowed to wake the PC. Network adapters, keyboards, mice, Bluetooth devices, USB controllers, and HID devices are common candidates. Treat this as a low-confidence clue until it repeats or Windows names a specific source.

## No Wake Timers Found

If no wake timers are found, the cause may be a device, driver, network adapter, Modern Standby behavior, or a cleared event log rather than a scheduled timer.

## The App Shows Low Confidence

Low confidence means WakeLens found a related clue but cannot prove it caused the wake. Export the report and compare several scans over time.

## PowerShell Or Event Log Errors

Some event queries can fail because logs are disabled, old entries were cleared, or permissions are restricted. WakeLens still preserves command evidence when event logs are unavailable.

## Russian Or Non-English Windows

WakeLens 0.2.0 handles common Russian and English `powercfg` output patterns. If a localized output is not parsed correctly, export a Markdown report and include the raw command section in a GitHub issue.

## App Does Not Start From Source

Run:

```powershell
npm install
npm run build
npm run dev
```

If build fails, confirm that Node.js 24 or later is installed.
