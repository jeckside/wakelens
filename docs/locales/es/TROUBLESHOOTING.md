# Solución de problemas

## Se necesitan permisos de administrador

Algunas comprobaciones de `powercfg` requieren permisos elevados. Reinicia WakeLens como administrador y escanea de nuevo.

## Fuente de activación desconocida

`Wake Source: Unknown` significa que Windows no dio una fuente fiable. Es común y no demuestra malware.

## Dispositivos con permiso de activación

Adaptadores de red, teclados, ratones, Bluetooth, USB y HID pueden despertar el PC. Si un candidato se repite en el historial, revísalo en el Administrador de dispositivos.

## Registros vacíos

Los registros pueden estar borrados, deshabilitados o restringidos por permisos. WakeLens conserva la evidencia parcial en el informe.
