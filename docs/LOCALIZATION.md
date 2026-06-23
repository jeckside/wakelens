# WakeLens Localization

WakeLens supports six product languages:

- `en` - English
- `zh-Hans` - Simplified Chinese
- `hi` - Hindi
- `es` - Spanish
- `ar` - Modern Standard Arabic, right-to-left layout
- `ru` - Russian

Localization covers:

- desktop UI
- diagnosis text
- diagnostic issues
- recommendations
- evidence cards
- Markdown reports
- README and user-facing documentation

Implementation notes:

- Runtime strings live in `src/shared/i18n.ts`.
- The renderer persists the selected language in local storage.
- Arabic uses `dir="rtl"` on the document root.
- Existing scan history is displayed through the active language by re-analyzing stored raw evidence.

Packaged smoke test:

1. Run `npm run dist`.
2. Start `release/win-unpacked/WakeLens.exe` with `--remote-debugging-port=9337`.
3. Run `npm run smoke:packaged-localization`.

The smoke test checks English, Simplified Chinese, Hindi, Spanish, Arabic, and Russian in the packaged app, verifies Arabic RTL, runs a scan, confirms the preload API, and refreshes the documentation screenshots in `docs/assets/`.
