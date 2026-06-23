# ملاحظات تقنية

يستخدم WakeLens Electron مع فصل main وpreload وrenderer. لا يصل renderer إلى Node.js مباشرة، بل يستخدم preload API محدودًا.

## مصادر البيانات

- `powercfg /lastwake`
- `powercfg /waketimers`
- `powercfg /requests`
- `powercfg /devicequery wake_armed`
- أحداث `Microsoft-Windows-Power-Troubleshooter`

## الترجمة

سلاسل التشغيل موجودة في `src/shared/i18n.ts`. يعاد تحليل التشخيص من الأدلة الخام حسب اللغة النشطة، لذلك يظهر السجل القديم باللغة المختارة.

العربية تستخدم اتجاه RTL عبر `dir="rtl"`.
