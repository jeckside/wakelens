# Технические заметки

WakeLens использует Electron с разделением main/preload/renderer. Renderer не имеет прямого доступа к Node.js и вызывает только узкий preload API.

## Источники данных

- `powercfg /lastwake`
- `powercfg /waketimers`
- `powercfg /requests`
- `powercfg /devicequery wake_armed`
- события `Microsoft-Windows-Power-Troubleshooter`

## Локализация

Словари находятся в `src/shared/i18n.ts`. Диагноз пересчитывается из raw evidence для активного языка, поэтому старая история отображается на выбранном языке.

Arabic использует RTL через `dir="rtl"`.
