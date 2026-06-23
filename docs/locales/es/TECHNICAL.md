# Notas técnicas

WakeLens usa Electron con separación main/preload/renderer. El renderer no accede directamente a Node.js y usa una API preload limitada.

## Fuentes de datos

- `powercfg /lastwake`
- `powercfg /waketimers`
- `powercfg /requests`
- `powercfg /devicequery wake_armed`
- eventos `Microsoft-Windows-Power-Troubleshooter`

## Localización

Las cadenas están en `src/shared/i18n.ts`. El diagnóstico se recalcula desde la evidencia cruda para el idioma activo, por lo que el historial antiguo se muestra en el idioma seleccionado.

Arabic usa RTL mediante `dir="rtl"`.
