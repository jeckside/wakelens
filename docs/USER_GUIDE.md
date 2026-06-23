# WakeLens User Guide

## Scan After The Problem Happens

WakeLens is most useful right after the PC wakes unexpectedly. Open WakeLens and choose `Scan now`. The app collects Windows wake evidence and stores the scan locally.

If WakeLens says administrator permission is needed, choose `Restart as administrator`, then run another scan. Some Windows power diagnostics cannot be collected from a normal user session.

## Read The Dashboard

The dashboard has four practical areas:

- Result: the likely cause family, confidence, headline, and explanation.
- Diagnostic issues: checks that were blocked, unavailable, or incomplete.
- What WakeLens checked: each Windows evidence source and whether it returned data.
- Next steps: safe actions such as opening Device Manager, Task Scheduler, or scanning again.

Confidence levels:

- High: Windows named a concrete source and the evidence is direct.
- Medium: a strong source exists, usually from a wake timer or Power-Troubleshooter event, but corroboration is limited.
- Low: WakeLens found candidate evidence, such as wake-capable devices, but cannot prove the exact wake source.
- Unknown: Windows did not expose enough evidence.

## Use The History

Open `History` to compare scans. Repeated evidence is stronger than a single low-confidence result. If several scans point to the same device family, timer, or process, that is a better candidate for follow-up.

## Export A Report

Open `Report`, then choose Markdown or JSON.

- Markdown is best for forums, GitHub issues, chats, and support requests.
- JSON is best for technical analysis or reproducible bug reports.

Reports include the diagnosis, diagnostic issues, power events, recommendations, and raw command output.

## Act Safely

WakeLens does not silently change system settings. Review each recommendation, then decide whether to open Device Manager, Task Scheduler, or Windows power settings.

Do not disable devices or scheduled tasks unless you understand what they do. If the diagnosis is low confidence or unknown, collect another scan before changing settings.
