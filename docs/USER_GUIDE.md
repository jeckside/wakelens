# WakeLens User Guide

## Scan After The Problem Happens

WakeLens is most useful right after the PC wakes unexpectedly. Open WakeLens and choose `Scan now`. The app collects Windows wake evidence and stores the scan locally.

## Read The Diagnosis

The dashboard shows a headline, confidence level, and supporting evidence.

- High confidence means Windows named a concrete source and the evidence is consistent.
- Medium confidence means one strong source exists, but corroborating evidence is limited.
- Low confidence means WakeLens found a related clue, but it may not be the exact wake source.
- Unknown means Windows did not expose enough evidence.

## Use The History

Open `History` to compare scans. Repeated evidence is stronger than a single low-confidence result. If several scans point to the same device, timer, or process, that is a better candidate for follow-up.

## Export A Report

Open `Report`, then choose Markdown or JSON.

- Markdown is best for forums, GitHub issues, chats, and support requests.
- JSON is best for technical analysis or reproducible bug reports.

## Act Safely

WakeLens does not silently change system settings. Review each recommendation, then decide whether to open Device Manager, Task Scheduler, or Windows power settings.

Do not disable devices or scheduled tasks unless you understand what they do. If the diagnosis is low confidence or unknown, collect another scan before changing settings.
